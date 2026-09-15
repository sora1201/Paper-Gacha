import type {AppPreferences,DrawnPaperRecord,GachaSettings,HistoryEntry,Paper} from "../types";
import {defaults,keys,read,write} from "./storage";
import {getSyncMeta,syncMetaKey,type SyncMeta} from "./syncLocal";

export type Versioned<T>={value:T|null;updatedAt:string};
export type SyncDocument={version:1;settings:Versioned<GachaSettings>;preferences:Versioned<AppPreferences>;favorites:Record<string,Versioned<Paper>>;history:Record<string,Versioned<HistoryEntry>>;drawn:Record<string,Versioned<DrawnPaperRecord>>};
const newer=<T>(a:Versioned<T>|undefined,b:Versioned<T>|undefined):Versioned<T>=>!a?b!:!b?a:(a.updatedAt>=b.updatedAt?a:b);
const mergeMap=<T>(a:Record<string,Versioned<T>>,b:Record<string,Versioned<T>>)=>{const result:Record<string,Versioned<T>>={};for(const id of new Set([...Object.keys(a),...Object.keys(b)]))result[id]=newer(a[id],b[id]);return result};
export function mergeSyncDocuments(local:SyncDocument,cloud:SyncDocument):SyncDocument{return {version:1,settings:newer(local.settings,cloud.settings),preferences:newer(local.preferences,cloud.preferences),favorites:mergeMap(local.favorites,cloud.favorites),history:mergeMap(local.history,cloud.history),drawn:mergeMap(local.drawn,cloud.drawn)}}
export function localDocument(now=new Date().toISOString()):SyncDocument{
  const meta=getSyncMeta();let dirty=false;
  if(!meta.settings){meta.settings=now;dirty=true}if(!meta.preferences){meta.preferences=now;dirty=true}
  const favorites=read<Paper[]>(keys.favorites,[]),history=read<HistoryEntry[]>(keys.history,[]),drawn=read<DrawnPaperRecord[]>(keys.drawn,[]);
  for(const value of favorites)if(!meta.favorites[value.id]){meta.favorites[value.id]=now;dirty=true}
  for(const value of history)if(!meta.history[value.id]){meta.history[value.id]=now;dirty=true}
  for(const value of drawn)if(!meta.drawn[value.paperId]){meta.drawn[value.paperId]=now;dirty=true}
  if(dirty)write(syncMetaKey,meta);
  const values=<T extends {id?:string;paperId?:string}>(list:T[],timestamps:Record<string,string>,id:(x:T)=>string)=>Object.fromEntries(Object.entries(timestamps).map(([key,updatedAt])=>[key,{value:list.find(x=>id(x)===key)??null,updatedAt}]));
  return {version:1,settings:{value:read(keys.settings,defaults),updatedAt:meta.settings},preferences:{value:read(keys.preferences,{language:"en"}),updatedAt:meta.preferences},favorites:values(favorites,meta.favorites,x=>x.id),history:values(history,meta.history,x=>x.id),drawn:values(drawn,meta.drawn,x=>x.paperId)};
}
export function applySyncDocument(doc:SyncDocument){
  const alive=<T>(map:Record<string,Versioned<T>>)=>Object.values(map).filter(x=>x.value!==null).map(x=>x.value as T);
  const history=alive(doc.history).sort((a,b)=>b.drawnAt.localeCompare(a.drawnAt)).slice(0,100);
  write(keys.settings,doc.settings.value??defaults);write(keys.preferences,doc.preferences.value??{language:"en"});write(keys.favorites,alive(doc.favorites));write(keys.history,history);write(keys.drawn,alive(doc.drawn));
  const meta:SyncMeta={settings:doc.settings.updatedAt,preferences:doc.preferences.updatedAt,favorites:Object.fromEntries(Object.entries(doc.favorites).map(([k,v])=>[k,v.updatedAt])),history:Object.fromEntries(Object.entries(doc.history).map(([k,v])=>[k,v.updatedAt])),drawn:Object.fromEntries(Object.entries(doc.drawn).map(([k,v])=>[k,v.updatedAt]))};write(syncMetaKey,meta);
}
