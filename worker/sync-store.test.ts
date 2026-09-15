import { describe, expect, it, vi } from "vitest";
import { handleSync } from "./sync-store";

function database(row: unknown = null) {
  const bound: unknown[][] = [];
  const db = { prepare: vi.fn(() => ({ bind: (...values:unknown[]) => { bound.push(values); return { first: async()=>row, run:async()=>({success:true,results:[],meta:{}}) } } })) } as unknown as D1Database;
  return { db, bound };
}
describe("sync authorization boundary",()=>{
  it("queries only the session user's row and ignores request parameters",async()=>{const {db,bound}=database();await handleSync(new Request("https://app.test/api/sync?userId=attacker"),db,"session-user");expect(bound[0]).toEqual(["session-user"])});
  it("writes the session user ID rather than a client-provided ID",async()=>{const {db,bound}=database();const payload={schemaVersion:1,settings:{},settingsUpdatedAt:"",preferences:{},preferencesUpdatedAt:"",favorites:[],history:[],drawn:[],updatedAt:"",userId:"attacker"};const response=await handleSync(new Request("https://app.test/api/sync",{method:"PUT",body:JSON.stringify(payload)}),db,"session-user");expect(response.status).toBe(200);expect(bound[0][0]).toBe("session-user")});
});
