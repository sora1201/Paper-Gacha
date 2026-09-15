export type SyncArea="settings"|"preferences"|"favorites"|"history"|"drawn";
export type SyncMeta={settings:string;preferences:string;favorites:Record<string,string>;history:Record<string,string>;drawn:Record<string,string>};
export const syncMetaKey="paper-gacha:sync-meta";
const empty=():SyncMeta=>({settings:"",preferences:"",favorites:{},history:{},drawn:{}});
export function getSyncMeta():SyncMeta{try{return {...empty(),...JSON.parse(localStorage.getItem(syncMetaKey)??"{}")}}catch{return empty()}}
export function markChanged(area:SyncArea,ids:string[]=[]){const meta=getSyncMeta(),now=new Date().toISOString();if(area==="settings"||area==="preferences")meta[area]=now;else for(const id of ids)meta[area][id]=now;localStorage.setItem(syncMetaKey,JSON.stringify(meta));if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("paper-gacha:local-change"))}
