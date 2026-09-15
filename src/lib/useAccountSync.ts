import {useCallback,useEffect,useRef,useState} from "react";
import type {AccountUser,SyncStatus} from "../types";
import {applySyncDocument,localDocument,mergeSyncDocuments} from "./sync";
import * as supabase from "./supabase";

export function useAccountSync(onData:()=>void){
  const initial=supabase.consumeOAuthCallback()??supabase.getSession();
  const session=useRef(initial);const timer=useRef<number|undefined>(undefined);
  const [user,setUser]=useState<AccountUser|null>(initial?.user??null);const [status,setStatus]=useState<SyncStatus>(navigator.onLine?"synced":"offline");const [lastSynced,setLastSynced]=useState<string|null>(null);
  const sync=useCallback(async()=>{if(!session.current)return;if(!navigator.onLine){setStatus("offline");return}setStatus("syncing");try{session.current=await supabase.refreshSession(session.current);const cloud=await supabase.readCloud(session.current);const merged=cloud?mergeSyncDocuments(localDocument(),cloud):localDocument();await supabase.writeCloud(session.current,merged);applySyncDocument(merged);onData();setLastSynced(new Date().toISOString());setStatus("synced")}catch{setStatus(navigator.onLine?"error":"offline")}},[onData]);
  const schedule=useCallback(()=>{if(!session.current)return;window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>void sync(),700)},[sync]);
  useEffect(()=>{if(session.current)void sync();const changed=()=>schedule();const online=()=>void sync();const offline=()=>setStatus("offline");window.addEventListener("paper-gacha:local-change",changed);window.addEventListener("online",online);window.addEventListener("offline",offline);return()=>{window.clearTimeout(timer.current);window.removeEventListener("paper-gacha:local-change",changed);window.removeEventListener("online",online);window.removeEventListener("offline",offline)}},[schedule,sync]);
  return {user,status,lastSynced,sync,google:supabase.signInWithGoogle,async login(email:string,password:string){session.current=await supabase.signIn(email,password);setUser(session.current.user);await sync()},async signup(email:string,password:string){const result=await supabase.signUp(email,password);if(result){session.current=result;setUser(result.user);await sync()}return Boolean(result)},reset:supabase.resetPassword,async logout(){await supabase.signOut(session.current);session.current=null;setUser(null);setLastSynced(null);setStatus(navigator.onLine?"synced":"offline")}};
}
