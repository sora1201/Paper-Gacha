import type { AppPreferences, DrawnPaperRecord, GachaSettings, HistoryEntry, Language, Paper } from "../types";
export const keys={settings:"paper-gacha:settings",preferences:"paper-gacha:preferences",drawn:"paper-gacha:drawn",favorites:"paper-gacha:favorites",history:"paper-gacha:history"} as const;
export const defaults:GachaSettings={expertTopics:[],relatedTopics:[],otherTopics:[],expertCount:3,relatedCount:2,otherCount:1,publicationYears:3};
export function read<T>(key:string,fallback:T):T { try { const value=localStorage.getItem(key); return value?JSON.parse(value) as T:fallback; } catch { return fallback; } }
export function write<T>(key:string,value:T){ try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* Storage can be unavailable in private contexts. */ } }
export const getSettings=()=>read(keys.settings,defaults);
export const saveSettings=(value:GachaSettings)=>write(keys.settings,value);
export const getFavorites=()=>read<Paper[]>(keys.favorites,[]);
export const saveFavorites=(value:Paper[])=>write(keys.favorites,value);
export const getHistory=()=>read<HistoryEntry[]>(keys.history,[]);
export function saveDraw(papers:Paper[]){const now=new Date().toISOString();const drawn=read<DrawnPaperRecord[]>(keys.drawn,[]);write(keys.drawn,[...drawn,...papers.map(p=>({paperId:p.id,drawnAt:now}))]);write(keys.history,[{id:crypto.randomUUID(),drawnAt:now,papers},...getHistory()].slice(0,100));}
export const getDrawnIds=()=>new Set(read<DrawnPaperRecord[]>(keys.drawn,[]).map(x=>x.paperId));
export function initialLanguage():Language {const saved=read<AppPreferences|null>(keys.preferences,null);if(saved?.language==="ja"||saved?.language==="en")return saved.language;return navigator.language.toLowerCase().startsWith("ja")?"ja":"en";}
