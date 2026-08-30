import type { AppPreferences, BackupFile, DrawnPaperRecord, GachaSettings, HistoryEntry, Language, Paper, PaperCategory, SelectedTopic } from "../types";
export const keys={settings:"paper-gacha:settings",preferences:"paper-gacha:preferences",drawn:"paper-gacha:drawn",favorites:"paper-gacha:favorites",history:"paper-gacha:history"} as const;
export const defaults:GachaSettings={expertTopics:[],relatedTopics:[],otherTopics:[],expertCount:3,relatedCount:2,otherCount:1,publicationYears:3};
export function read<T>(key:string,fallback:T):T { try { const value=localStorage.getItem(key); return value?JSON.parse(value) as T:fallback; } catch { return fallback; } }
export function write<T>(key:string,value:T){ try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* Storage can be unavailable in private contexts. */ } }
export const getSettings=()=>read(keys.settings,defaults);
export const saveSettings=(value:GachaSettings)=>write(keys.settings,value);
export const getFavorites=()=>read<Paper[]>(keys.favorites,[]);
export const saveFavorites=(value:Paper[])=>write(keys.favorites,value);
export const getHistory=()=>read<HistoryEntry[]>(keys.history,[]);
export function saveDraw(papers:Paper[]):HistoryEntry {const now=new Date().toISOString();const entry={id:crypto.randomUUID(),drawnAt:now,papers};const drawn=read<DrawnPaperRecord[]>(keys.drawn,[]);write(keys.drawn,[...drawn,...papers.map(p=>({paperId:p.id,drawnAt:now}))]);write(keys.history,[entry,...getHistory()].slice(0,100));return entry;}
export const getDrawnIds=()=>new Set(read<DrawnPaperRecord[]>(keys.drawn,[]).map(x=>x.paperId));
export function initialLanguage():Language {const saved=read<AppPreferences|null>(keys.preferences,null);if(saved?.language==="ja"||saved?.language==="en")return saved.language;return navigator.language.toLowerCase().startsWith("ja")?"ja":"en";}

export class BackupError extends Error {constructor(public code:"invalid"|"unsupported-version"|"storage",message:string){super(message);this.name="BackupError"}}
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const isString=(value:unknown):value is string=>typeof value==="string";
const isNullableString=(value:unknown)=>value===null||isString(value);
const isInteger=(value:unknown):value is number=>typeof value==="number"&&Number.isInteger(value);
const isDate=(value:unknown):value is string=>isString(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString()===value;
const isTopic=(value:unknown):value is SelectedTopic=>isRecord(value)&&isString(value.id)&&isString(value.name);
const isCategory=(value:unknown):value is PaperCategory=>value==="expert"||value==="related"||value==="other";
const isPaper=(value:unknown):value is Paper=>isRecord(value)&&isString(value.id)&&isString(value.title)&&Array.isArray(value.authors)&&value.authors.every(isString)&&(value.year===null||isInteger(value.year))&&isNullableString(value.abstract)&&Array.isArray(value.topics)&&value.topics.every(isTopic)&&isNullableString(value.doi)&&isNullableString(value.landingPageUrl)&&isNullableString(value.openAccessUrl)&&isInteger(value.citedByCount)&&value.citedByCount>=0&&isCategory(value.category);
const isSettings=(value:unknown):value is GachaSettings=>{if(!isRecord(value))return false;const years=value.publicationYears;return ["expertTopics","relatedTopics","otherTopics"].every(key=>Array.isArray(value[key])&&(value[key] as unknown[]).every(isTopic))&&["expertCount","relatedCount","otherCount"].every(key=>isInteger(value[key])&&(value[key] as number)>=0)&&(years===null||years===1||years===3||years===5||years===10)};
const isPreferences=(value:unknown):value is AppPreferences=>isRecord(value)&&(value.language==="ja"||value.language==="en");
const isDrawn=(value:unknown):value is DrawnPaperRecord=>isRecord(value)&&isString(value.paperId)&&isDate(value.drawnAt);
const isHistory=(value:unknown):value is HistoryEntry=>isRecord(value)&&isString(value.id)&&isDate(value.drawnAt)&&Array.isArray(value.papers)&&value.papers.every(isPaper);

/** Version-specific validation is deliberately isolated here so migrations can be added later. */
const backupReaders:Record<number,(value:Record<string,unknown>)=>BackupFile>={1:value=>{const data=value.data;if(!isDate(value.exportedAt)||!isRecord(data)||!isSettings(data.settings)||!isPreferences(data.preferences)||!Array.isArray(data.drawn)||!data.drawn.every(isDrawn)||!Array.isArray(data.favorites)||!data.favorites.every(isPaper)||!Array.isArray(data.history)||!data.history.every(isHistory))throw new BackupError("invalid","Invalid backup file");return value as BackupFile}};
export function parseBackup(value:unknown):BackupFile {if(!isRecord(value)||value.format!=="paper-gacha-backup"||!isInteger(value.version))throw new BackupError("invalid","Invalid backup file");const reader=backupReaders[value.version];if(!reader)throw new BackupError("unsupported-version",`Unsupported backup version: ${value.version}`);return reader(value)}
export function createBackup():BackupFile {return {format:"paper-gacha-backup",version:1,exportedAt:new Date().toISOString(),data:{settings:read(keys.settings,defaults),preferences:read(keys.preferences,{language:initialLanguage()}),drawn:read(keys.drawn,[]),favorites:read(keys.favorites,[]),history:read(keys.history,[])}}}
export function restoreBackup(value:unknown):BackupFile {const backup=parseBackup(value);const entries:[[string,unknown],[string,unknown],[string,unknown],[string,unknown],[string,unknown]]=[[keys.settings,backup.data.settings],[keys.preferences,backup.data.preferences],[keys.drawn,backup.data.drawn],[keys.favorites,backup.data.favorites],[keys.history,backup.data.history]];const previous=entries.map(([key])=>[key,localStorage.getItem(key)] as const);try{for(const [key,item] of entries)localStorage.setItem(key,JSON.stringify(item))}catch(error){for(const [key,item] of previous){try{if(item===null)localStorage.removeItem(key);else localStorage.setItem(key,item)}catch{/* Best-effort rollback if storage itself is unavailable. */}}throw new BackupError("storage",error instanceof Error?error.message:"Could not restore backup")}return backup}
