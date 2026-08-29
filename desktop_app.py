"""Local, Windows-first desktop interface for Paper Gacha."""
from __future__ import annotations

import json
import os
import sys
import webbrowser
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtWidgets import (QApplication, QFileDialog, QFormLayout, QHBoxLayout,
    QCheckBox, QLabel, QLineEdit, QListWidget, QListWidgetItem, QMainWindow, QMessageBox, QPushButton,
    QSpinBox, QTabWidget, QTextBrowser, QVBoxLayout, QWidget)

from paper_gacha import (Client, DIVERSE_TOPICS, Paper, SentenceTransformer, category_content,
    category_pages, diverse_pick, fetch, login_with_retry, models, ranked, unique)

APP_DIR = Path(os.getenv("APPDATA", Path.home())) / "PaperGacha"
STATE_FILE = APP_DIR / "state.json"
DEFAULT = {"expertise": "bioinspired robotics, soft robotics, humanoid locomotion, compliant robotic foot",
           "related": "biomimetics, biomechanics, legged robotics, soft actuators, tactile sensing",
           "serendipity": ",".join(DIVERSE_TOPICS), "core": 3, "related_count": 2,
           "serendipity_count": 1, "lookback_days": 365, "history": [], "draws": [], "favorites": [],
           "bluesky_enabled": False, "bluesky_handle": ""}

def load_state():
    APP_DIR.mkdir(parents=True, exist_ok=True)
    if not STATE_FILE.exists(): return DEFAULT.copy()
    return DEFAULT | json.loads(STATE_FILE.read_text(encoding="utf-8"))

def save_state(state):
    APP_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

def terms(value): return [item.strip() for item in value.split(",") if item.strip()]

class DrawWorker(QThread):
    complete = Signal(dict); failed = Signal(str)
    def __init__(self, state): super().__init__(); self.state = state
    def run(self):
        try:
            s, posted = self.state, set(self.state["history"])
            expertise, related = terms(s["expertise"]), terms(s["related"])
            fields = {name: DIVERSE_TOPICS[name] for name in terms(s["serendipity"])}
            expert = unique(fetch(" ".join(expertise), 35, s["lookback_days"]), posted, 30)
            related_papers = unique(fetch(" ".join(related), 35, s["lookback_days"]), posted, 30)
            diverse = {name: unique(fetch(query, 15, s["lookback_days"]), posted, 30) for name, query in fields.items()}
            model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            result = {"Core": ranked(expert, expertise, s["core"], .03, model),
                      "Related": ranked(related_papers, related, s["related_count"], .03, model),
                      "Serendipity": diverse_pick(diverse, s["serendipity_count"])}
            if sum(map(len, result.values())) != s["core"] + s["related_count"] + s["serendipity_count"]: raise RuntimeError("Not enough papers; broaden your themes or lookback period.")
            self.complete.emit({key: [asdict(paper) for paper in papers] for key, papers in result.items()})
        except Exception as exc: self.failed.emit(str(exc))

class PostWorker(QThread):
    complete = Signal(int); failed = Signal(str)
    def __init__(self, papers, handle, password):
        super().__init__(); self.papers = papers; self.handle = handle; self.password = password
    def run(self):
        try:
            client = Client(); login_with_retry(client, self.handle, self.password)
            posted = 0
            for category in ("Core", "Related", "Serendipity"):
                papers = [Paper(**paper) for selected_category, paper in self.papers if selected_category == category]
                root_ref = parent_ref = None
                for index, page in enumerate(category_pages(category, papers, 280)):
                    response = client.send_post(
                        text=category_content(category, page, continuation=index > 0),
                        **({"reply_to": models.AppBskyFeedPost.ReplyRef(root=root_ref, parent=parent_ref)} if parent_ref else {}),
                    )
                    parent_ref = models.ComAtprotoRepoStrongRef.Main(uri=response.uri, cid=response.cid)
                    root_ref = root_ref or parent_ref
                    posted += len(page)
            self.complete.emit(posted)
        except Exception as exc: self.failed.emit(str(exc))

class App(QMainWindow):
    def __init__(self):
        super().__init__(); self.state = load_state(); self.setWindowTitle("Paper Gacha"); self.resize(900, 700)
        self.tabs = QTabWidget(); self.setCentralWidget(self.tabs); self.make_gacha(); self.make_history(); self.make_favorites(); self.make_settings(); self.refresh_lists()
    def make_gacha(self):
        page = QWidget(); box = QVBoxLayout(page); self.status = QLabel("Ready to draw."); self.cards = QTextBrowser(); self.cards.setOpenExternalLinks(False); self.cards.anchorClicked.connect(self.open_link)
        button = QPushButton("Gacha!"); button.clicked.connect(self.draw); self.reveal = QPushButton("Reveal next card"); self.reveal.clicked.connect(self.reveal_next); self.reveal.hide()
        self.post = QPushButton("Post selected papers to Bluesky"); self.post.clicked.connect(self.post_selected); self.post.hide()
        self.selection_label = QLabel("Select papers to post:"); self.selection_label.hide(); self.selected = QListWidget(); self.selected.hide()
        box.addWidget(self.status); box.addWidget(button); box.addWidget(self.reveal); box.addWidget(self.cards); box.addWidget(self.selection_label); box.addWidget(self.selected); box.addWidget(self.post); self.tabs.addTab(page, "Gacha")
    def make_history(self): self.history = QListWidget(); self.history.itemClicked.connect(self.show_history); self.tabs.addTab(self.history, "History")
    def make_favorites(self): self.favorites = QListWidget(); self.favorites.itemClicked.connect(lambda item: webbrowser.open(item.data(256)["url"])); self.tabs.addTab(self.favorites, "Favorites")
    def make_settings(self):
        page=QWidget(); form=QFormLayout(page); self.expertise=QLineEdit(self.state["expertise"]); self.related=QLineEdit(self.state["related"]); self.serendipity=QLineEdit(self.state["serendipity"]); self.core=QSpinBox(); self.rel=QSpinBox(); self.ser=QSpinBox(); self.days=QSpinBox()
        for widget,key in ((self.core,"core"),(self.rel,"related_count"),(self.ser,"serendipity_count"),(self.days,"lookback_days")): widget.setRange(1,3650); widget.setValue(self.state[key])
        for label,w in (("Core themes",self.expertise),("Related themes",self.related),("Serendipity fields",self.serendipity),("Core papers",self.core),("Related papers",self.rel),("Serendipity papers",self.ser),("Lookback days",self.days)): form.addRow(label,w)
        self.bluesky_enabled=QCheckBox("Enable Bluesky posting from this app"); self.bluesky_enabled.setChecked(self.state["bluesky_enabled"]); self.bluesky_handle=QLineEdit(self.state["bluesky_handle"] or os.getenv("BLUESKY_HANDLE", "")); self.bluesky_password=QLineEdit(os.getenv("BLUESKY_APP_PASSWORD", "")); self.bluesky_password.setEchoMode(QLineEdit.EchoMode.Password); self.bluesky_password.setPlaceholderText("App password (not saved)")
        form.addRow(self.bluesky_enabled); form.addRow("Bluesky handle",self.bluesky_handle); form.addRow("Bluesky app password",self.bluesky_password)
        save=QPushButton("Save settings"); save.clicked.connect(self.save_settings); export=QPushButton("Export data"); export.clicked.connect(self.export_data); imp=QPushButton("Import data"); imp.clicked.connect(self.import_data); form.addRow(save); form.addRow(export,imp); self.tabs.addTab(page,"Settings")
    def save_settings(self):
        self.state.update(expertise=self.expertise.text(), related=self.related.text(), serendipity=self.serendipity.text(), core=self.core.value(), related_count=self.rel.value(), serendipity_count=self.ser.value(), lookback_days=self.days.value(), bluesky_enabled=self.bluesky_enabled.isChecked(), bluesky_handle=self.bluesky_handle.text()); save_state(self.state)
    def draw(self): self.save_settings(); self.status.setText("Finding papers… first run may download the model."); self.worker=DrawWorker(self.state); self.worker.complete.connect(self.show_draw); self.worker.failed.connect(lambda e: QMessageBox.critical(self,"Paper Gacha",e)); self.worker.start()
    def show_draw(self,result):
        now=datetime.now().isoformat(timespec="seconds"); papers=[p for group in result.values() for p in group]; self.state["history"] += [p["uid"] for p in papers]; self.state["draws"].append({"at":now,"settings":{k:self.state[k] for k in ("expertise","related","serendipity","core","related_count","serendipity_count","lookback_days")},"papers":papers}); save_state(self.state)
        self.queue=[(group,paper) for group,papers in result.items() for paper in papers]; self.revealed=[]; self.cards.clear(); self.selected.clear(); self.selected.hide(); self.selection_label.hide(); self.post.hide(); self.reveal.show(); self.status.setText("Draw saved. Reveal each card when ready."); self.refresh_lists()
    def reveal_next(self):
        if not self.queue: return
        category,paper=self.queue.pop(0); self.revealed.append((category,paper)); self.cards.setHtml("".join(self.card_html(c,p) for c,p in self.revealed))
        item=QListWidgetItem(f"{category}: {paper['title']}"); item.setData(256, (category, paper)); item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable); item.setCheckState(Qt.CheckState.Unchecked); self.selected.addItem(item)
        self.status.setText(f"{len(self.revealed)} cards revealed.")
        if not self.queue:
            self.reveal.hide(); self.status.setText("All cards revealed and saved."); self.selection_label.show(); self.selected.show()
            if self.state["bluesky_enabled"]: self.post.show()
    def post_selected(self):
        selected=[self.selected.item(index).data(256) for index in range(self.selected.count()) if self.selected.item(index).checkState() == Qt.CheckState.Checked]
        handle, password = self.bluesky_handle.text().strip(), self.bluesky_password.text()
        if not selected: QMessageBox.information(self,"Paper Gacha","Choose at least one paper to post."); return
        if not handle or not password: QMessageBox.warning(self,"Paper Gacha","Enter your Bluesky handle and app password in Settings."); self.tabs.setCurrentIndex(3); return
        answer=QMessageBox.question(self,"Post to Bluesky",f"Post {len(selected)} selected paper(s) to Bluesky?",QMessageBox.StandardButton.Yes|QMessageBox.StandardButton.No)
        if answer != QMessageBox.StandardButton.Yes: return
        self.post.setEnabled(False); self.status.setText("Posting selected papers to Bluesky…"); self.poster=PostWorker(selected, handle, password); self.poster.complete.connect(self.post_complete); self.poster.failed.connect(self.post_failed); self.poster.start()
    def post_complete(self, count): self.post.setEnabled(True); self.status.setText(f"Posted {count} selected paper(s) to Bluesky.")
    def post_failed(self, error): self.post.setEnabled(True); self.status.setText("Bluesky posting failed."); QMessageBox.critical(self,"Paper Gacha",error)
    def card_html(self, category, paper):
        title=paper["title"]; authors=", ".join(paper["authors"]) or "Authors unavailable"; fields=", ".join(paper["fields"]) or "Unclassified"
        return f"<h2>{category}</h2><p><a href=\"{paper['url']}\">{title}</a><br>{authors}<br>{paper['published'][:10]} · {fields}<br><a href=\"favorite://{paper['uid']}\">Add to favorites</a></p>"
    def open_link(self, url):
        value=url.toString()
        if value.startswith("favorite://"):
            uid=value.removeprefix("favorite://")
            paper=next((p for _,p in getattr(self,"revealed",[]) if p["uid"]==uid),None)
            if paper and not any(item["uid"]==uid for item in self.state["favorites"]): self.state["favorites"].append(paper); save_state(self.state); self.refresh_lists()
            return
        webbrowser.open(value)
    def show_history(self, item):
        draw=self.state["draws"][item.data(256)]; QMessageBox.information(self,"Draw history","\n\n".join(f'{p["title"]}\n{p["url"]}' for p in draw["papers"]))
    def refresh_lists(self):
        self.history.clear(); self.favorites.clear()
        for index,draw in reversed(list(enumerate(self.state["draws"]))):
            from PySide6.QtWidgets import QListWidgetItem
            item=QListWidgetItem(f'{draw["at"]} — {len(draw["papers"])} papers'); item.setData(256,index); self.history.addItem(item)
        for paper in self.state["favorites"]:
            from PySide6.QtWidgets import QListWidgetItem
            item=QListWidgetItem(paper["title"]); item.setData(256,paper); self.favorites.addItem(item)
    def export_data(self):
        path,_=QFileDialog.getSaveFileName(self,"Export",str(Path.home()/"paper-gacha.json"),"JSON (*.json)");
        if path: Path(path).write_text(json.dumps(self.state,ensure_ascii=False,indent=2),encoding="utf-8")
    def import_data(self):
        path,_=QFileDialog.getOpenFileName(self,"Import",str(Path.home()),"JSON (*.json)");
        if path: self.state=DEFAULT|json.loads(Path(path).read_text(encoding="utf-8")); save_state(self.state); self.__init__()

if __name__ == "__main__":
    app=QApplication(sys.argv); window=App(); window.show(); sys.exit(app.exec())
