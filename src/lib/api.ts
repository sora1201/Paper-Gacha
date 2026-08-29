import type { GachaCandidates, GachaSettings } from "../types";
async function parse<T>(response:Response):Promise<T>{if(!response.ok){const body=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(body?.error||`Request failed (${response.status})`)}return response.json() as Promise<T>}
export async function fetchCandidates(settings:GachaSettings){return parse<{candidates:GachaCandidates}>(await fetch("/api/gacha",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(settings)}));}
