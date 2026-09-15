import type { GachaSettings, SelectedTopic } from "../types";

export function relatedBookTopics(settings: GachaSettings): SelectedTopic[] {
  const seen = new Set<string>();

  return [
    ...settings.expertTopics,
    ...settings.relatedTopics,
    ...settings.otherTopics,
  ].filter((topic) => {
    const key = topic.name.trim().toLocaleLowerCase();
    if (!key || seen.has(key) || seen.size >= 3) return false;
    seen.add(key);
    return true;
  });
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
