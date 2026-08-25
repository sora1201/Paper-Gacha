"""Select ten research papers and publish them as a Bluesky reply thread."""
from __future__ import annotations

import html
import json
import os
import random
import re
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

import feedparser
import requests
from atproto import Client
from sentence_transformers import SentenceTransformer, util

ROOT = Path(__file__).parent
HISTORY_FILE = ROOT / "data" / "posted_papers.json"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
HEADERS = {"User-Agent": "paper-gacha/1.0 (personal research discovery bot)"}


@dataclass
class Paper:
    uid: str
    title: str
    abstract: str
    url: str
    fields: list[str]
    source: str
    published: str = ""
    score: float = 0.0


def env_list(name: str, default: str) -> list[str]:
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]


EXPERTISE = env_list("PAPER_GACHA_EXPERTISE", "robotics, robot learning, embodied AI")
RELATED = env_list("PAPER_GACHA_RELATED", "computer vision, reinforcement learning, human-robot interaction")
DIVERSE = {
    "biology": "biology",
    "physics": "physics",
    "history": "history",
    "culture": "culture",
    "language": "linguistics",
}


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def arxiv(query: str, limit: int = 35) -> list[Paper]:
    response = requests.get(
        "https://export.arxiv.org/api/query",
        params={"search_query": f"all:{query}", "start": 0, "max_results": limit, "sortBy": "submittedDate", "sortOrder": "descending"},
        headers=HEADERS, timeout=30,
    )
    response.raise_for_status()
    feed = feedparser.parse(response.text)
    return [Paper(
        uid=f"arxiv:{entry.id.rsplit('/', 1)[-1]}", title=clean(entry.title), abstract=clean(entry.summary),
        url=entry.id.replace("http:", "https:"), fields=[tag.term for tag in getattr(entry, "tags", [])],
        source="arXiv", published=getattr(entry, "published", ""),
    ) for entry in feed.entries]


def openalex(query: str, limit: int = 35) -> list[Paper]:
    response = requests.get("https://api.openalex.org/works", params={
        "search": query, "per-page": limit, "sort": "publication_date:desc",
        "filter": f"from_publication_date:{(datetime.now(timezone.utc)-timedelta(days=365)).date()}",
    }, headers=HEADERS, timeout=30)
    response.raise_for_status()
    papers = []
    for work in response.json().get("results", []):
        inverted = work.get("abstract_inverted_index") or {}
        words = sorted(((pos, word) for word, positions in inverted.items() for pos in positions))
        abstract = " ".join(word for _, word in words)
        concepts = [c["display_name"] for c in work.get("concepts", [])[:4]]
        papers.append(Paper(f"openalex:{work['id'].rsplit('/', 1)[-1]}", clean(work.get("title", "")), clean(abstract),
                            work.get("doi") or work.get("id"), concepts, "OpenAlex", work.get("publication_date", "")))
    return papers


def semantic_scholar(query: str, limit: int = 35) -> list[Paper]:
    headers = dict(HEADERS)
    if os.getenv("SEMANTIC_SCHOLAR_API_KEY"):
        headers["x-api-key"] = os.environ["SEMANTIC_SCHOLAR_API_KEY"]
    response = requests.get("https://api.semanticscholar.org/graph/v1/paper/search", params={
        "query": query, "limit": limit, "fields": "paperId,title,abstract,url,fieldsOfStudy,publicationDate",
    }, headers=headers, timeout=30)
    response.raise_for_status()
    return [Paper(f"s2:{p['paperId']}", clean(p.get("title", "")), clean(p.get("abstract", "")),
                  p.get("url", f"https://www.semanticscholar.org/paper/{p['paperId']}"), p.get("fieldsOfStudy") or [],
                  "Semantic Scholar", p.get("publicationDate") or "") for p in response.json().get("data", [])]


def fetch(query: str) -> list[Paper]:
    results: list[Paper] = []
    for source in (arxiv, openalex, semantic_scholar):
        try:
            results.extend(source(query))
        except requests.RequestException as exc:
            print(f"Warning: {source.__name__} failed for {query}: {exc}")
        time.sleep(1)
    return results


def unique(papers: Iterable[Paper], posted: set[str]) -> list[Paper]:
    seen, kept = set(), []
    for p in papers:
        key = re.sub(r"[^a-z0-9]", "", p.title.lower())[:100]
        if p.uid not in posted and key and key not in seen and len(p.abstract) > 30:
            seen.add(key); kept.append(p)
    return kept


def ranked(papers: list[Paper], profile: list[str], count: int, model: SentenceTransformer) -> list[Paper]:
    if not papers:
        return []
    query = " ".join(profile)
    vectors = model.encode([query] + [f"{p.title}. {p.abstract}" for p in papers], convert_to_tensor=True, normalize_embeddings=True)
    similarities = util.cos_sim(vectors[0], vectors[1:])[0].cpu().tolist()
    for p, score in zip(papers, similarities):
        # Small transparent bonus for explicit keyword matches.
        text = (p.title + " " + p.abstract).lower()
        p.score = float(score) + 0.03 * sum(term.lower() in text for term in profile)
    return sorted(papers, key=lambda p: p.score, reverse=True)[:count]


def diverse_pick(papers_by_field: dict[str, list[Paper]], count: int = 3) -> list[Paper]:
    available = [(field, papers) for field, papers in papers_by_field.items() if papers]
    random.shuffle(available)
    chosen = []
    for field, papers in available:
        chosen.append(random.choice(papers))
        if len(chosen) == count:
            return chosen
    # Graceful fallback if a public API had a sparse result.
    remainder = [p for _, papers in available for p in papers if p.uid not in {x.uid for x in chosen}]
    random.shuffle(remainder)
    return chosen + remainder[:count-len(chosen)]


def one_sentence(abstract: str) -> str:
    sentence = re.split(r"(?<=[.!?])\s+", abstract)[0].strip()
    return sentence[:180].rstrip(" ,;:") + ("…" if len(sentence) > 180 else "")


def post_text(paper: Paper, category: str, number: int) -> str:
    fields = (", ".join(paper.fields[:3]) or "研究論文")[:55]
    reason = {"専門": "研究テーマとの類似度が高い", "関連": "周辺領域との接点がある", "異分野": "視点を広げる異分野の一冊"}[category]
    # Keep the URL intact: cutting a 300-character post from the end can make
    # the most important part (the paper link) unusable.
    fixed = f"🎲 Paper Gacha {number}/10｜{category}\n理由: {reason}\n分野: {fields}\n{paper.url}"
    budget = max(40, 300 - len(fixed) - len("\n要約: \n"))
    title = paper.title[: min(110, budget // 2)].rstrip() + ("…" if len(paper.title) > min(110, budget // 2) else "")
    summary_budget = max(25, budget - len(title) - 1)
    summary = one_sentence(paper.abstract)[:summary_budget].rstrip() + ("…" if len(one_sentence(paper.abstract)) > summary_budget else "")
    return f"🎲 Paper Gacha {number}/10｜{category}\n{title}\n要約: {summary}\n理由: {reason}\n分野: {fields}\n{paper.url}"


def load_history() -> set[str]:
    HISTORY_FILE.parent.mkdir(exist_ok=True)
    if not HISTORY_FILE.exists(): return set()
    return set(json.loads(HISTORY_FILE.read_text(encoding="utf-8")))


def save_history(history: set[str]) -> None:
    # Retain enough history for durable deduplication without endlessly growing the repo.
    HISTORY_FILE.write_text(json.dumps(sorted(history)[-5000:], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    posted = load_history()
    print("Collecting papers from public APIs…")
    expert = unique(fetch(" ".join(EXPERTISE)), posted)
    related = unique(fetch(" ".join(RELATED)), posted)
    diverse = {field: unique(fetch(query, 15), posted) for field, query in DIVERSE.items()}
    model = SentenceTransformer(MODEL_NAME)
    selections = [("専門", p) for p in ranked(expert, EXPERTISE, 4, model)]
    selections += [("関連", p) for p in ranked(related, RELATED, 3, model)]
    selections += [("異分野", p) for p in diverse_pick(diverse, 3)]
    if len(selections) != 10:
        raise RuntimeError(f"Only selected {len(selections)} papers; retry later or broaden your query settings.")
    dry_run = os.getenv("PAPER_GACHA_DRY_RUN", "false").lower() == "true"
    if dry_run:
        for i, (category, paper) in enumerate(selections, 1): print("\n" + post_text(paper, category, i))
        return
    handle, password = os.getenv("BLUESKY_HANDLE"), os.getenv("BLUESKY_APP_PASSWORD")
    if not handle or not password: raise RuntimeError("Set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD (or use PAPER_GACHA_DRY_RUN=true).")
    client = Client(); client.login(handle, password)
    parent = None
    for i, (category, paper) in enumerate(selections, 1):
        kwargs = {"text": post_text(paper, category, i)}
        if parent: kwargs["reply_to"] = parent
        parent = client.send_post(**kwargs)
        print(f"Posted {i}/10: {paper.title}")
    save_history(posted | {p.uid for _, p in selections})


if __name__ == "__main__":
    main()
