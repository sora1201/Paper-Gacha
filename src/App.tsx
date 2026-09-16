import { useCallback, useEffect, useMemo, useState } from "react";
import { BookHeart, Clock3, Dices, LogIn, MessageCircle, Settings, UserPlus } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FavoritesPage, HistoryPage } from "./pages/LibraryPages";
import { GachaPage } from "./pages/GachaPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AccountSync } from "./components/AccountSync";
import {
  getFavorites,
  getHistory,
  getSettings,
  deleteHistoryEntry,
  deleteHistoryPaper,
  initialLanguage,
  saveFavorites,
  saveSettings,
} from "./lib/storage";
import type { GachaSettings, HistoryEntry, Paper } from "./types";
import { getSession, type AuthUser } from "./lib/auth";
import { createDebouncedSync, markLocalChange, prepareCacheForUser, synchronize, type SyncStatus } from "./lib/sync";

export default function App() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(getSettings);
  const [favorites, setFavorites] = useState(getFavorites);
  const [history, setHistory] = useState(getHistory);
  const [latestPapers, setLatestPapers] = useState<Paper[]>(() => getHistory()[0]?.papers ?? []);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? "synced" : "offline");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(() => new URLSearchParams(location.search).has("token") || new URLSearchParams(location.search).has("authError") ? "signin" : null);

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
    markLocalChange("settings"); scheduleSync();
  }
  function toggleFavorite(paper: Paper) {
    const next = favorites.some((item) => item.id === paper.id)
      ? favorites.filter((item) => item.id !== paper.id)
      : [paper, ...favorites];
    setFavorites(next);
    saveFavorites(next);
    markLocalChange("favorites"); scheduleSync();
  }
  function recordDraw(entry: HistoryEntry) {
    setLatestPapers(entry.papers);
    setHistory((current) => [entry, ...current].slice(0, 100));
    markLocalChange("history"); scheduleSync();
  }
  function deleteDraw(id: string) {
    const next = deleteHistoryEntry(id);
    setHistory(next);
    setLatestPapers(next[0]?.papers ?? []);
    markLocalChange("history"); scheduleSync();
  }
  function deletePaper(entryId: string, paperId: string) {
    const next = deleteHistoryPaper(entryId, paperId);
    setHistory(next);
    setLatestPapers(next[0]?.papers ?? []);
    markLocalChange("history"); scheduleSync();
  }
  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  const runSync = useCallback(async () => {
    if (!user) return;
    if (!navigator.onLine) { setSyncStatus("offline"); return; }
    setSyncStatus("syncing");
    try { const data = await synchronize(); setLastSyncedAt(data.updatedAt); setSyncStatus("synced"); restored(); }
    catch (error) { setSyncStatus(error instanceof Error && error.message === "offline" ? "offline" : "failed"); }
  }, [user]);
  const scheduleSync = useMemo(() => createDebouncedSync(() => { void runSync(); }), [runSync]);
  async function authenticated() { const session = await getSession(); if(session?.user)prepareCacheForUser(session.user.id); setUser(session?.user ?? null); }
  async function loggedOut() { setUser(null); setLastSyncedAt(null); setSyncStatus(navigator.onLine ? "synced" : "offline"); }
  useEffect(() => { void getSession().then(session => { if(session?.user)prepareCacheForUser(session.user.id);setUser(session?.user ?? null) }); }, []);
  useEffect(() => { if (user) void runSync(); }, [user, runSync]);
  useEffect(() => { const online=()=>{setSyncStatus("syncing");void runSync()};const offline=()=>setSyncStatus("offline");window.addEventListener("online",online);window.addEventListener("offline",offline);return()=>{window.removeEventListener("online",online);window.removeEventListener("offline",offline)}},[runSync]);

  const nav = [
    { to: "/", key: "gacha", icon: Dices },
    { to: "/favorites", key: "favorites", icon: BookHeart },
    { to: "/history", key: "history", icon: Clock3 },
    { to: "/settings", key: "settings", icon: Settings },
  ];
  const feedbackLabel = i18n.language === "ja" ? "お問い合わせ" : "Feedback";
  const feedbackUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeI2guLuCi6hve4CZjNtQVW0Ua6RrwQR-t_Ztm7egfutvPOwA/viewform";

  return <div className="app-shell">
    <header className="topbar"><NavLink to="/" className="brand"><img className="brand-mark" src="/paper-gacha-app-icon.png" alt=""/><span><strong>{t("brand")}</strong><small>{t("tagline")}</small></span></NavLink><div className="topbar-right"><nav>{nav.map(({to,key,icon:Icon})=><NavLink end={to==="/"} to={to} key={key}><Icon size={18}/>{t(`nav.${key}`)}</NavLink>)}<a href={feedbackUrl} target="_blank" rel="noreferrer"><MessageCircle size={18}/>{feedbackLabel}</a></nav><div className="header-auth">{user?<button className="user-button" onClick={()=>setAuthMode("signin")}><span>{(user.name||user.email).slice(0,1).toUpperCase()}</span><b>{user.name||user.email}</b></button>:<><button className="login-button" onClick={()=>setAuthMode("signin")}><LogIn size={16}/>{t("account.signIn")}</button><button className="signup-button" onClick={()=>setAuthMode("signup")}><UserPlus size={16}/>{t("account.signUp")}</button></>}</div></div></header>
    <main><Routes>
      <Route path="/" element={<GachaPage settings={settings} papers={latestPapers} favorites={favorites} onDraw={recordDraw} onFavorite={toggleFavorite} onToast={notify}/>}/>
      <Route path="/favorites" element={<FavoritesPage favorites={favorites} onFavorite={toggleFavorite} onToast={notify}/>}/>
      <Route path="/history" element={<HistoryPage history={history} favorites={favorites} onFavorite={toggleFavorite} onDelete={deleteDraw} onDeletePaper={deletePaper} onToast={notify}/>}/>
      <Route path="/settings" element={<SettingsPage settings={settings} onSettings={updateSettings} onRestore={restored}/>}/>
    </Routes></main>
    <nav className="bottom-nav">{nav.map(({to,key,icon:Icon})=><NavLink end={to==="/"} to={to} key={key}><Icon size={21}/><span>{t(`nav.${key}`)}</span></NavLink>)}<a href={feedbackUrl} target="_blank" rel="noreferrer"><MessageCircle size={21}/><span>{feedbackLabel}</span></a></nav>
    {toast&&<div className="toast" role="status">{toast}</div>}
    {authMode&&<AccountSync user={user} status={syncStatus} lastSyncedAt={lastSyncedAt} initialMode={authMode} onClose={()=>setAuthMode(null)} onAuthenticated={authenticated} onSync={runSync} onLogout={loggedOut}/>}
  </div>;
}
