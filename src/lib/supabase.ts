import type {AccountUser} from "../types";
import type {SyncDocument} from "./sync";
const url=(import.meta.env.VITE_SUPABASE_URL as string|undefined)?.replace(/\/$/,"");
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
const sessionKey="paper-gacha:supabase-session";
type Session={access_token:string;refresh_token:string;expires_at?:number;user:AccountUser};
const headers=(token?:string)=>({apikey:anon??"","Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})});
function configured(){if(!url||!anon)throw new Error("Supabase is not configured")}
async function request(path:string,init:RequestInit={}){configured();const response=await fetch(`${url}${path}`,{...init,headers:{...headers(),...init.headers}});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.msg??body?.error_description??body?.message??"Supabase request failed");return body}
export function getSession():Session|null{try{return JSON.parse(localStorage.getItem(sessionKey)??"null") as Session|null}catch{return null}}
function saveSession(value:Session|null){if(value)localStorage.setItem(sessionKey,JSON.stringify(value));else localStorage.removeItem(sessionKey)}
const normalize=(body:any):Session=>({access_token:body.access_token,refresh_token:body.refresh_token,expires_at:body.expires_at,user:{id:body.user.id,email:body.user.email??null}});
export async function signIn(email:string,password:string){const session=normalize(await request("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})}));saveSession(session);return session}
export async function signUp(email:string,password:string){const body=await request("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password})});if(body.access_token){const session=normalize(body);saveSession(session);return session}return null}
export async function resetPassword(email:string){await request("/auth/v1/recover",{method:"POST",body:JSON.stringify({email,redirect_to:location.origin+"/settings"})})}
export function signInWithGoogle(){configured();location.assign(`${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin+"/settings")}`)}
export function consumeOAuthCallback(){const params=new URLSearchParams(location.hash.slice(1));if(!params.get("access_token"))return null;const payload=JSON.parse(atob(params.get("access_token")!.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));const session:Session={access_token:params.get("access_token")!,refresh_token:params.get("refresh_token")!,expires_at:Number(params.get("expires_at")),user:{id:payload.sub,email:payload.email??null}};saveSession(session);history.replaceState(null,"",location.pathname+location.search);return session}
export async function refreshSession(session:Session){if(!session.expires_at||session.expires_at>Date.now()/1000+60)return session;const next=normalize(await request("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:session.refresh_token})}));saveSession(next);return next}
export async function signOut(session:Session|null){if(session)await fetch(`${url}/auth/v1/logout`,{method:"POST",headers:headers(session.access_token)}).catch(()=>undefined);saveSession(null)}
export async function readCloud(session:Session):Promise<SyncDocument|null>{const rows=await request("/rest/v1/user_sync_data?select=data&limit=1",{headers:headers(session.access_token)});return rows[0]?.data??null}
export async function writeCloud(session:Session,data:SyncDocument){await request("/rest/v1/user_sync_data?on_conflict=user_id",{method:"POST",headers:{...headers(session.access_token),Prefer:"resolution=merge-duplicates"},body:JSON.stringify({user_id:session.user.id,data})})}
