import type { AppPreferences, DrawnPaperRecord, GachaSettings, HistoryEntry, Paper } from "../types";
import { defaults, initialLanguage, keys, read, write } from "./storage";

export type SyncData = {
  schemaVersion: 1;
  settings: GachaSettings;
  settingsUpdatedAt: string;
  preferences: AppPreferences;
  preferencesUpdatedAt: string;
  favorites: Paper[];
  history: HistoryEntry[];
  drawn: DrawnPaperRecord[];
  updatedAt: string;
};
export type SyncStatus = "synced" | "syncing" | "offline" | "failed";
type SyncMeta = { settingsUpdatedAt: string; preferencesUpdatedAt: string; updatedAt: string };
export const syncMetaKey = "paper-gacha:sync-meta";
export const syncOwnerKey = "paper-gacha:sync-owner";
const epoch = new Date(0).toISOString();

function latest(a: string, b: string) { return Date.parse(a) >= Date.parse(b) ? a : b; }
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const result = new Map<string, T>();
  for (const item of items) if (!result.has(key(item))) result.set(key(item), item);
  return [...result.values()];
}

export function mergeSyncData(local: SyncData, remote: SyncData): SyncData {
  const localSettingsWin = Date.parse(local.settingsUpdatedAt) >= Date.parse(remote.settingsUpdatedAt);
  const localPreferencesWin = Date.parse(local.preferencesUpdatedAt) >= Date.parse(remote.preferencesUpdatedAt);
  const favorites = uniqueBy([...local.favorites, ...remote.favorites], paper => paper.id);
  const history = uniqueBy([...local.history, ...remote.history], item => item.id)
    .sort((a, b) => Date.parse(b.drawnAt) - Date.parse(a.drawnAt)).slice(0, 100);
  const drawn = uniqueBy([...local.drawn, ...remote.drawn], item => item.paperId);
  return {
    schemaVersion: 1,
    settings: localSettingsWin ? local.settings : remote.settings,
    settingsUpdatedAt: latest(local.settingsUpdatedAt, remote.settingsUpdatedAt),
    preferences: localPreferencesWin ? local.preferences : remote.preferences,
    preferencesUpdatedAt: latest(local.preferencesUpdatedAt, remote.preferencesUpdatedAt),
    favorites, history, drawn,
    updatedAt: latest(local.updatedAt, remote.updatedAt),
  };
}

export function localSyncData(): SyncData {
  const hasLocalData = Object.values(keys).some(key => localStorage.getItem(key) !== null);
  const firstLocalTimestamp = hasLocalData ? new Date().toISOString() : epoch;
  const meta = read<SyncMeta>(syncMetaKey, { settingsUpdatedAt: firstLocalTimestamp, preferencesUpdatedAt: firstLocalTimestamp, updatedAt: firstLocalTimestamp });
  return { schemaVersion: 1, settings: read(keys.settings, defaults), settingsUpdatedAt: meta.settingsUpdatedAt,
    preferences: read(keys.preferences, { language: initialLanguage() }), preferencesUpdatedAt: meta.preferencesUpdatedAt,
    favorites: read(keys.favorites, []), history: read(keys.history, []), drawn: read(keys.drawn, []), updatedAt: meta.updatedAt };
}

/** Prevents one signed-in user's device cache from being uploaded to another account. */
export function prepareCacheForUser(userId: string) {
  const owner = localStorage.getItem(syncOwnerKey);
  if (owner && owner !== userId) {
    for (const key of Object.values(keys)) localStorage.removeItem(key);
    localStorage.removeItem(syncMetaKey);
  }
  localStorage.setItem(syncOwnerKey, userId);
}

export function storeSyncData(data: SyncData) {
  write(keys.settings, data.settings); write(keys.preferences, data.preferences); write(keys.favorites, data.favorites);
  write(keys.history, data.history.slice(0, 100)); write(keys.drawn, data.drawn);
  write(syncMetaKey, { settingsUpdatedAt: data.settingsUpdatedAt, preferencesUpdatedAt: data.preferencesUpdatedAt, updatedAt: data.updatedAt });
}

export function markLocalChange(kind?: "settings" | "preferences") {
  const now = new Date().toISOString();
  const current = read<SyncMeta>(syncMetaKey, { settingsUpdatedAt: epoch, preferencesUpdatedAt: epoch, updatedAt: epoch });
  write(syncMetaKey, { ...current, ...(kind === "settings" ? { settingsUpdatedAt: now } : {}),
    ...(kind === "preferences" ? { preferencesUpdatedAt: now } : {}), updatedAt: now });
}

export async function synchronize(): Promise<SyncData> {
  if (!navigator.onLine) throw new Error("offline");
  const response = await fetch("/api/sync", { credentials: "include" });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error(`sync-get-${response.status}`);
  const body = await response.json() as { data: SyncData | null };
  const merged = body.data ? mergeSyncData(localSyncData(), body.data) : { ...localSyncData(), updatedAt: new Date().toISOString() };
  const saved = await fetch("/api/sync", { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(merged) });
  if (!saved.ok) throw new Error(`sync-put-${saved.status}`);
  const canonical = (await saved.json() as { data: SyncData }).data;
  storeSyncData(canonical);
  return canonical;
}

export function createDebouncedSync(run: () => void, delay = 800) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => { if (timer) clearTimeout(timer); timer = setTimeout(run, delay); };
}
