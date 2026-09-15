import type { SyncData } from "../src/lib/sync";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "private, no-store" } });

/** userId is always supplied by Better Auth's verified session, never request data. */
export async function handleSync(request: Request, db: D1Database, userId: string): Promise<Response> {
  if (request.method === "GET") {
    const row = await db.prepare("SELECT data, version, updated_at FROM user_sync_data WHERE user_id = ?").bind(userId).first<{data:string;version:number}>();
    return json({ data: row ? JSON.parse(row.data) : null, version: row?.version ?? 0 });
  }
  if (request.method !== "PUT") return json({ error: "Method not allowed" }, 405);
  const text = await request.text();
  if (text.length > 2_000_000) return json({ error: "Sync payload is too large" }, 413);
  const data = JSON.parse(text) as SyncData;
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.favorites) || !Array.isArray(data.history) || !Array.isArray(data.drawn)) return json({ error: "Invalid sync payload" }, 400);
  data.history = data.history.sort((a,b)=>Date.parse(b.drawnAt)-Date.parse(a.drawnAt)).slice(0,100);
  data.updatedAt = new Date().toISOString();
  await db.prepare(`INSERT INTO user_sync_data (user_id,data,version,updated_at) VALUES (?,?,1,?)
    ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,version=user_sync_data.version+1,updated_at=excluded.updated_at`)
    .bind(userId, JSON.stringify(data), data.updatedAt).run();
  return json({ data });
}
