import { useEffect, useState } from "react";
import { Cloud, LogOut, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { requestPasswordReset, resetPassword, signInEmail, signInGoogle, signOut, signUpEmail, type AuthUser } from "../lib/auth";
import type { SyncStatus } from "../lib/sync";

type AuthMode = "signin" | "signup";

export function AccountSync({ user, status, lastSyncedAt, initialMode, onClose, onAuthenticated, onSync, onLogout }:{ user:AuthUser|null;status:SyncStatus;lastSyncedAt:string|null;initialMode:AuthMode;onClose:()=>void;onAuthenticated:()=>Promise<void>;onSync:()=>Promise<void>;onLogout:()=>Promise<void> }) {
  const { t, i18n } = useTranslation();
  const params = new URLSearchParams(location.search);
  const resetToken = params.get("token");
  const [mode,setMode]=useState<AuthMode>(initialMode);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [error,setError]=useState(params.has("authError")?t("account.oauthError"):"");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close)},[onClose]);
  async function act(action:()=>Promise<unknown>,authenticate=false){setBusy(true);setError("");setNotice("");try{await action();if(authenticate){await onAuthenticated();onClose()}}catch(e){setError(e instanceof Error?e.message:t("account.error"))}finally{setBusy(false)}}

  return <div className="auth-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" onClick={onClose} aria-label={t("account.close")}><X size={20}/></button>
      <div className="auth-brand"><img src="/paper-gacha-app-icon.png" alt=""/><span>{t("brand")}</span></div>
      {!user?<>
        <div className="auth-heading"><h2 id="auth-title">{resetToken?t("account.resetTitle"):t(mode==="signin"?"account.welcomeBack":"account.createTitle")}</h2><p>{t(resetToken?"account.resetDescription":mode==="signin"?"account.signInDescription":"account.signUpDescription")}</p></div>
        {!resetToken&&<button className="google-button" disabled={busy} onClick={()=>void act(signInGoogle)}><span className="google-mark">G</span>{t("account.google")}</button>}
        {!resetToken&&<div className="auth-divider"><span>{t("account.orEmail")}</span></div>}
        <form className="account-form" onSubmit={event=>{event.preventDefault();if(resetToken)void act(async()=>{await resetPassword(resetToken,password);history.replaceState({},"","/");setNotice(t("account.resetComplete"))});else void act(()=>mode==="signin"?signInEmail(email,password):signUpEmail(name||email.split("@")[0],email,password),true)}}>
          {!resetToken&&mode==="signup"&&<label>{t("account.name")}<input autoFocus autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder={t("account.namePlaceholder")}/></label>}
          {!resetToken&&<label>{t("account.email")}<input autoFocus={mode==="signin"} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>}
          <label>{resetToken?t("account.newPassword"):t("account.password")}<input type="password" autoComplete={resetToken||mode==="signup"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={t("account.passwordPlaceholder")}/></label>
          {!resetToken&&mode==="signin"&&<button type="button" className="forgot-button" disabled={busy||!email} onClick={()=>void act(async()=>{await requestPasswordReset(email);setNotice(t("account.resetSent"))})}>{t("account.reset")}</button>}
          <button className="auth-submit" disabled={busy||!password||(!resetToken&&!email)}>{busy?t("account.working"):t(resetToken?"account.savePassword":mode==="signin"?"account.signIn":"account.signUp")}</button>
        </form>
        {!resetToken&&<p className="auth-switch">{t(mode==="signin"?"account.noAccount":"account.hasAccount")} <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setNotice("")}}>{t(mode==="signin"?"account.signUp":"account.signIn")}</button></p>}
      </>:<div className="account-session"><div className="account-avatar">{(user.name||user.email).slice(0,1).toUpperCase()}</div><h2 id="auth-title">{t("account.signedIn")}</h2><p className="session-email">{user.email}</p><div className="sync-details"><p><Cloud size={16}/>{t("account.status")}<strong>{t(`account.states.${status}`)}</strong></p><p>{t("account.lastSync")}<strong>{lastSyncedAt?new Intl.DateTimeFormat(i18n.language,{dateStyle:"medium",timeStyle:"short"}).format(new Date(lastSyncedAt)):t("account.never")}</strong></p></div><div className="account-actions"><button disabled={status==="syncing"} onClick={()=>void onSync()}><RefreshCw size={17}/>{t("account.syncNow")}</button><button className="secondary" onClick={()=>void act(async()=>{await signOut();await onLogout();onClose()})}><LogOut size={17}/>{t("account.logout")}</button></div></div>}
      {notice&&<p role="status" className="backup-message success">{notice}</p>}{error&&<p role="alert" className="backup-message error">{error}</p>}
    </section>
  </div>;
}
