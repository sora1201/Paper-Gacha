import type { GachaSettings, Paper, RelatedBook } from "../types";
import { paperExtractedQuery, paperTopicQuery } from "./bookSearch";

function uniqueQueries(values:string[], limit:number) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLocaleLowerCase();
    if (!key || seen.has(key) || seen.size >= limit) return false;
    seen.add(key);
    return true;
  });
}

export function relatedBookQueries(papers:Paper[], settings:GachaSettings, language:string, limit=3):string[] {
  const generic = language.toLowerCase().startsWith("ja") ? "研究" : "academic research";
  const topics = papers.map(paperTopicQuery);
  const extracted = papers.map(paperExtractedQuery);
  const titles = papers.map(paper => paper.title);
  const configured = [...settings.expertTopics,...settings.relatedTopics,...settings.otherTopics].map(topic => topic.name);
  const queries = uniqueQueries([...topics,...extracted,...configured,...titles,generic],limit);
  while (queries.length < limit) queries.push(generic);
  return queries;
}

export type RelatedBookSlot = {type:"book";book:RelatedBook}|{type:"search";query:string};

export function relatedBookSlots(books:RelatedBook[], queries:string[], limit=3):RelatedBookSlot[] {
  const selectedBooks = books.slice(0,limit);
  const fulfilled = new Set(selectedBooks.map(book => book.query.toLocaleLowerCase()));
  const fallbacks = queries.filter(query => !fulfilled.has(query.toLocaleLowerCase()));
  const generic = queries.at(-1) ?? "academic research";
  while (fallbacks.length < limit - selectedBooks.length) fallbacks.push(generic);
  return [...selectedBooks.map(book => ({type:"book" as const,book})),...fallbacks.slice(0,limit-selectedBooks.length).map(query => ({type:"search" as const,query}))];
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
