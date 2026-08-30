import {beforeEach,describe,expect,it,vi} from "vitest";
import {BackupError,createBackup,defaults,getHistory,keys,restoreBackup,saveDraw} from "./storage";

class MemoryStorage {
  values=new Map<string,string>();
  getItem(key:string){return this.values.get(key)??null}
  setItem(key:string,value:string){this.values.set(key,value)}
  removeItem(key:string){this.values.delete(key)}
  clear(){this.values.clear()}
}
const storage=new MemoryStorage();
const paper={id:"W1",title:"Paper",authors:["A"],year:2024,abstract:null,topics:[{id:"T1",name:"Topic"}],doi:null,landingPageUrl:"https://example.test",openAccessUrl:null,citedByCount:2,category:"expert" as const};
function validBackup(){return {format:"paper-gacha-backup",version:1,exportedAt:"2026-08-29T00:00:00.000Z",data:{settings:defaults,preferences:{language:"ja"},drawn:[{paperId:"W1",drawnAt:"2026-08-28T00:00:00.000Z"}],favorites:[paper],history:[{id:"H1",drawnAt:"2026-08-28T00:00:00.000Z",papers:[paper]}]}} as const}

beforeEach(()=>{storage.clear();vi.stubGlobal("localStorage",storage);vi.stubGlobal("navigator",{language:"en-US"})});
describe("backup storage",()=>{
  it("creates a backup from every storage key",()=>{for(const key of Object.values(keys))storage.setItem(key,JSON.stringify(key===keys.settings?defaults:key===keys.preferences?{language:"en"}:[]));const backup=createBackup();expect(backup.format).toBe("paper-gacha-backup");expect(backup.version).toBe(1);expect(Object.keys(backup.data)).toEqual(Object.keys(keys));expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)});
  it("restores a valid backup by replacing every value",()=>{restoreBackup(validBackup());expect(JSON.parse(storage.getItem(keys.favorites)!)).toEqual([paper]);expect(JSON.parse(storage.getItem(keys.preferences)!)).toEqual({language:"ja"})});
  it("rejects malformed JSON before restore",()=>{expect(()=>restoreBackup(JSON.parse("{"))).toThrow(SyntaxError);expect(storage.values.size).toBe(0)});
  it("rejects missing required fields",()=>{const backup=validBackup() as unknown as {data:Record<string,unknown>};delete backup.data.history;expect(()=>restoreBackup(backup)).toThrow(BackupError);expect(storage.values.size).toBe(0)});
  it("reports unknown versions at the versioned migration boundary",()=>{expect(()=>restoreBackup({...validBackup(),version:2})).toThrowError(expect.objectContaining({code:"unsupported-version"}));expect(storage.values.size).toBe(0)});
  it("does not partially write any invalid nested value",()=>{storage.setItem(keys.settings,"original");const backup=validBackup() as unknown as {data:{history:Array<{drawnAt:string}>}};backup.data.history[0].drawnAt="not-a-date";expect(()=>restoreBackup(backup)).toThrow(BackupError);expect(storage.getItem(keys.settings)).toBe("original");expect(storage.getItem(keys.history)).toBeNull()});
});

describe("draw storage",()=>{
  it("returns the same new entry that is immediately available in history",()=>{
    const entry=saveDraw([paper]);
    expect(entry.papers).toEqual([paper]);
    expect(getHistory()[0]).toEqual(entry);
  });
});
