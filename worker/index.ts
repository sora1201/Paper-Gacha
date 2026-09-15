import { mapCrossrefWork, mapWork } from "./mapper";
import type { GachaSettings, PaperCategory, SelectedTopic } from "../src/types";
import { createAuth, handleAuth, type AuthEnv } from "./auth";
import { handleSync } from "./sync-store";
import { tryRankPapers, type AiBinding } from "./ranking";

const openAlexBase = "https://api.openalex.org";
const crossrefBase = "https://api.crossref.org";
const requestHeaders = {
  "user-agent": "Paper Gacha/0.1 (mailto:hello@paper-gacha.app)",
};

type Env = AuthEnv & {
  ASSETS: { fetch(request: Request): Promise<Response> };
  OPENALEX_API_KEY?: string;
  AI?: AiBinding;
};

type GoogleBookVolume = { id?:string; volumeInfo?:{ title?:string; authors?:string[]; imageLinks?:{ thumbnail?:string }; industryIdentifiers?:{type?:string;identifier?:string}[] } };

async function findRelatedBook(keyword:string) {
  const params = new URLSearchParams({ q: keyword, maxResults: "5", printType: "books", orderBy: "relevance" });
  const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?${params}`) as {items?:GoogleBookVolume[]};
  for (const item of data.items ?? []) {
    const info = item.volumeInfo;
    const isbn = info?.industryIdentifiers?.find(identifier => identifier.type === "ISBN_13")?.identifier
      ?? info?.industryIdentifiers?.find(identifier => identifier.type === "ISBN_10")?.identifier;
    const thumbnail = info?.imageLinks?.thumbnail;
    if (item.id && info?.title && isbn && thumbnail) return {
      id: item.id,
      title: info.title,
      authors: info.authors ?? [],
      thumbnail: thumbnail.replace(/^http:/, "https:"),
      isbn,
    };
  }
  return null;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { headers: requestHeaders, signal: controller.signal });
    if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
    return await response.json() as any;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenAlex(topic: SelectedTopic, category: PaperCategory, settings: GachaSettings, apiKey?: string) {
  const filters = ["is_retracted:false"];
  if (settings.publicationYears) {
    const from = new Date().getUTCFullYear() - settings.publicationYears + 1;
    filters.push(`from_publication_date:${from}-01-01`);
  }
  const params = new URLSearchParams({
    search: topic.name,
    filter: filters.join(","),
    sample: "40",
    "per-page": "40",
    select: "id,title,display_name,authorships,publication_year,abstract_inverted_index,topics,doi,primary_location,best_oa_location,cited_by_count",
    mailto: "hello@paper-gacha.app",
  });
  if (apiKey) params.set("api_key", apiKey);
  const data = await fetchJson(`${openAlexBase}/works?${params}`);
  return (data.results || []).map((work: any) => mapWork(work, category));
}

async function fetchCrossref(topic: SelectedTopic, category: PaperCategory, settings: GachaSettings) {
  const params = new URLSearchParams({
    "query.bibliographic": topic.name,
    rows: "40",
    mailto: "hello@paper-gacha.app",
  });
  if (settings.publicationYears) {
    const from = new Date().getUTCFullYear() - settings.publicationYears + 1;
    params.set("filter", `from-pub-date:${from}-01-01`);
  }
  const data = await fetchJson(`${crossrefBase}/works?${params}`);
  return (data.message?.items || []).map((work: any) => mapCrossrefWork(work, category));
}

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "cache-control": "public, max-age=300" },
});

async function sessionUser(request: Request, env: Env) {
  const session = await createAuth(env, request.url).api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/auth/")) return handleAuth(request, env);
      if (url.pathname === "/api/sync") {
        const user = await sessionUser(request, env);
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "cache-control": "private, no-store" } });
        return handleSync(request, env.DB, user.id);
      }
      if (url.pathname === "/api/gacha" && request.method === "POST") {
        const settings = await request.json() as GachaSettings;
        const candidates: any = { expert: {}, related: {}, other: {} };
        const categories: PaperCategory[] = ["expert", "related", "other"];
        const failures: string[] = [];

        await Promise.all(categories.flatMap((category) => {
          const topics = settings[`${category}Topics` as keyof GachaSettings] as SelectedTopic[];
          return topics.map(async (topic) => {
            try {
              candidates[category][topic.id] = await fetchOpenAlex(topic, category, settings, env.OPENALEX_API_KEY);
            } catch (openAlexError) {
              try {
                candidates[category][topic.id] = await fetchCrossref(topic, category, settings);
              } catch (crossrefError) {
                candidates[category][topic.id] = [];
                failures.push(`${topic.name}: ${String(openAlexError)}; ${String(crossrefError)}`);
              }
            }
          });
        }));

        const hasResults = categories.some((category) =>
          Object.values(candidates[category]).some((papers: any) => papers.length > 0));
        if (!hasResults && failures.length) {
          return json({ error: "Paper services are temporarily unavailable", details: failures }, 503);
        }
        const ranking: Partial<Record<PaperCategory, string[]>> = {};
        await Promise.all((["expert", "related"] as PaperCategory[]).map(async category => {
          const topics = settings[`${category}Topics` as keyof GachaSettings] as SelectedTopic[];
          const papers = topics.flatMap(topic => candidates[category][topic.id] || []);
          const order = await tryRankPapers(env.AI, topics, papers);
          if (order) ranking[category] = order;
        }));
        return json({ candidates, ...(Object.keys(ranking).length ? { ranking } : {}) }, 200);
      }
      if (url.pathname === "/api/books" && request.method === "POST") {
        const body = await request.json() as {keywords?:unknown};
        if (!Array.isArray(body.keywords) || !body.keywords.every(keyword => typeof keyword === "string")) {
          return json({ error: "Invalid keywords" }, 400);
        }
        const keywords = body.keywords.map(keyword => keyword.trim()).filter(Boolean).slice(0, 3);
        const settled = await Promise.allSettled(keywords.map(findRelatedBook));
        const seen = new Set<string>();
        const books = settled.flatMap(result => {
          if (result.status !== "fulfilled" || !result.value || seen.has(result.value.isbn)) return [];
          seen.add(result.value.isbn);
          return [result.value];
        });
        return json({ books });
      }
      if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      return json({ error: message }, error instanceof SyntaxError ? 400 : 500);
    }
  },
};
