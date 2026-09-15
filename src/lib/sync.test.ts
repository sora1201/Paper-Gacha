import {beforeEach,describe,expect,it,vi} from "vitest";
import {applySyncDocument,localDocument,mergeSyncDocuments,type SyncDocument} from "./sync";
import {defaults,keys} from "./storage";
class MemoryStorage{values=new Map<string,string>();getItem(k:string){return this.values.get(k)??null}setItem(k:string,v:string){this.values.set(k,v)}removeItem(k:string){this.values.delete(k)}clear(){this.values.clear()}}
const storage=new MemoryStorage();
const paper={id:"W1",title:"Paper",authors:["A"],year:2024,abstract:null,topics:[],doi:null,landingPageUrl:null,openAccessUrl:null,citedByCount:0,category:"expert" as const};
const base=(time:string):SyncDocument=>({version:1,settings:{value:defaults,updatedAt:time},preferences:{value:{language:"en"},updatedAt:time},favorites:{},history:{},drawn:{}});
beforeEach(()=>{storage.clear();vi.stubGlobal("localStorage",storage)});
describe("sync merge",()=>{
 it("uses last-write-wins for settings and language",()=>{const old=base("2026-01-01T00:00:00.000Z"),recent=base("2026-02-01T00:00:00.000Z");recent.preferences.value={language:"ja"};expect(mergeSyncDocuments(old,recent).preferences.value).toEqual({language:"ja"})});
 it("unions entity IDs and respects newer deletion tombstones",()=>{const local=base("2026-01-01T00:00:00.000Z"),cloud=base("2026-01-01T00:00:00.000Z");local.favorites.W1={value:paper,updatedAt:"2026-01-02T00:00:00.000Z"};cloud.favorites.W1={value:null,updatedAt:"2026-01-03T00:00:00.000Z"};cloud.favorites.W2={value:{...paper,id:"W2"},updatedAt:"2026-01-02T00:00:00.000Z"};const merged=mergeSyncDocuments(local,cloud);expect(merged.favorites.W1.value).toBeNull();expect(merged.favorites.W2.value?.id).toBe("W2")});
 it("migrates existing local data without discarding it",()=>{storage.setItem(keys.favorites,JSON.stringify([paper]));const doc=localDocument("2026-01-01T00:00:00.000Z");expect(doc.favorites.W1.value).toEqual(paper);expect(doc.favorites.W1.updatedAt).toBe("2026-01-01T00:00:00.000Z")});
 it("keeps only the latest 100 history entries when applying",()=>{const doc=base("2026-01-01T00:00:00.000Z");for(let i=0;i<102;i++)doc.history[String(i)]={value:{id:String(i),drawnAt:new Date(1_700_000_000_000+i).toISOString(),papers:[]},updatedAt:"2026-01-01T00:00:00.000Z"};applySyncDocument(doc);expect(JSON.parse(storage.getItem(keys.history)!).length).toBe(100)});
});

describe("signed-out local behavior",()=>{
 it("does not remove local application data when the auth session is cleared",async()=>{storage.setItem(keys.favorites,JSON.stringify([paper]));storage.setItem("paper-gacha:supabase-session",JSON.stringify({access_token:"token"}));const {signOut}=await import("./supabase");await signOut(null);expect(JSON.parse(storage.getItem(keys.favorites)!)).toEqual([paper]);expect(storage.getItem("paper-gacha:supabase-session")).toBeNull()});
});
