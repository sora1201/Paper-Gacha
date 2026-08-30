import { useState } from "react";
import { BookHeart, Clock3, Dices, Settings } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FavoritesPage, HistoryPage } from "./pages/LibraryPages";
import { GachaPage } from "./pages/GachaPage";
import { SettingsPage } from "./pages/SettingsPage";
import {
  getFavorites,
  getHistory,
  getSettings,
  initialLanguage,
  saveFavorites,
  saveSettings,
} from "./lib/storage";
import type { GachaSettings, HistoryEntry, Paper } from "./types";

export default function App() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(getSettings);
  const [favorites, setFavorites] = useState(getFavorites);
  const [history, setHistory] = useState(getHistory);
  const [latestPapers, setLatestPapers] = useState<Paper[]>(() => getHistory()[0]?.papers ?? []);
  const [toast, setToast] = useState("");

  function restored() {
    const restoredHistory = getHistory();
    setSettings(getSettings());
    setFavorites(getFavorites());
    setHistory(restoredHistory);
    setLatestPapers(restoredHistory[0]?.papers ?? []);
    void i18n.changeLanguage(initialLanguage());
  }
  function updateSettings(value: GachaSettings) {
    setSettings(value);
    saveSettings(value);
  }
  function toggleFavorite(paper: Paper) {
    const next = favorites.some((item) => item.id === paper.id)
      ? favorites.filter((item) => item.id !== paper.id)
      : [paper, ...favorites];
    setFavorites(next);
    saveFavorites(next);
  }
  function recordDraw(entry: HistoryEntry) {
    setLatestPapers(entry.papers);
    setHistory((current) => [entry, ...current].slice(0, 100));
  }
  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  const nav = [
    { to: "/", key: "gacha", icon: Dices },
    { to: "/favorites", key: "favorites", icon: BookHeart },
    { to: "/history", key: "history", icon: Clock3 },
    { to: "/settings", key: "settings", icon: Settings },
  ];

  return <div className="app-shell">
    <header className="topbar"><NavLink to="/" className="brand"><img className="brand-mark" src="/paper-gacha-app-icon.png" alt=""/><span><strong>{t("brand")}</strong><small>{t("tagline")}</small></span></NavLink><nav>{nav.map(({to,key,icon:Icon})=><NavLink end={to==="/"} to={to} key={key}><Icon size={18}/>{t(`nav.${key}`)}</NavLink>)}</nav></header>
    <main><Routes>
      <Route path="/" element={<GachaPage settings={settings} papers={latestPapers} favorites={favorites} onDraw={recordDraw} onFavorite={toggleFavorite} onToast={notify}/>}/>
      <Route path="/favorites" element={<FavoritesPage favorites={favorites} onFavorite={toggleFavorite} onToast={notify}/>}/>
      <Route path="/history" element={<HistoryPage history={history} favorites={favorites} onFavorite={toggleFavorite}/>}/>
      <Route path="/settings" element={<SettingsPage settings={settings} onSettings={updateSettings} onRestore={restored}/>}/>
    </Routes></main>
    <nav className="bottom-nav">{nav.map(({to,key,icon:Icon})=><NavLink end={to==="/"} to={to} key={key}><Icon size={21}/><span>{t(`nav.${key}`)}</span></NavLink>)}</nav>
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}
