import type { Paper } from "../types";

export function paperBookKeywords(papers: Paper[], limit = 3): string[] {
  const seen = new Set<string>();

  return papers.flatMap((paper) => paper.topics).filter((topic) => {
    const key = topic.name.trim().toLocaleLowerCase();
    if (!key || seen.has(key) || seen.size >= limit) return false;
    seen.add(key);
    return true;
  }).map((topic) => topic.name);
}

export function amazonSearchUrl(
  topicName: string,
  language: string,
  associateTag?: string,
): string {
  const domain = language.toLowerCase().startsWith("ja")
    ? "www.amazon.co.jp"
    : "www.amazon.com";
  const url = new URL(`https://${domain}/s`);
  url.searchParams.set("k", topicName);
  const tag = associateTag?.trim();
  if (tag) url.searchParams.set("tag", tag);
  return url.toString();
}
