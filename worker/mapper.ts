import type { Paper, PaperCategory } from "../src/types";

export function abstractText(index: Record<string, number[]> | null | undefined) {
  if (!index) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const position of positions) words[position] = word;
  return words.join(" ") || null;
}

/** Reject machine-readable endpoints: the app should link to reading pages, not XML APIs. */
function isReadingPageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return !url.hostname.toLowerCase().startsWith("api.")
      && !url.pathname.toLowerCase().endsWith(".xml")
      && url.searchParams.get("httpAccept")?.toLowerCase() !== "text/xml";
  } catch { return false; }
}

export function mapWork(work: any, category: PaperCategory): Paper {
  const doi = typeof work.doi === "string" ? work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : null;
  const optionalString = (value: unknown) => typeof value === "string" && value.trim() ? value : null;
  const locations = Array.isArray(work.locations) ? work.locations : [];
  const publisherLocation = [work.primary_location, ...locations].find((location: any) => location?.source?.type !== "repository" && isReadingPageUrl(location?.landing_page_url));
  const repository = locations.find((location: any) => location?.is_oa && location?.source?.type === "repository" && (isReadingPageUrl(location.pdf_url) || isReadingPageUrl(location.landing_page_url)));
  const openLocation = repository || work.best_oa_location;
  const openAccessUrl = [openLocation?.pdf_url, openLocation?.landing_page_url].find(isReadingPageUrl) || null;
  return { id: String(work.id || ""), title: String(work.title || work.display_name || "Untitled"), authors: Array.isArray(work.authorships) ? work.authorships.map((a: any) => a.author?.display_name).filter(Boolean) : [], year: Number.isInteger(work.publication_year) ? work.publication_year : null, abstract: abstractText(work.abstract_inverted_index), topics: Array.isArray(work.topics) ? work.topics.slice(0, 5).map((t: any) => ({ id: String(t.id || ""), name: String(t.display_name || "") })) : [], doi, landingPageUrl: publisherLocation?.landing_page_url || (isReadingPageUrl(work.primary_location?.landing_page_url) ? work.primary_location.landing_page_url : null) || work.id || null, openAccessUrl, citedByCount: Number(work.cited_by_count) || 0, category, venue: optionalString(work.primary_location?.source?.display_name), volume: optionalString(work.biblio?.volume), issue: optionalString(work.biblio?.issue), firstPage: optionalString(work.biblio?.first_page), lastPage: optionalString(work.biblio?.last_page), publicationDate: optionalString(work.publication_date) };
}

export function mapCrossrefWork(work: any, category: PaperCategory): Paper {
  const first = (value: unknown) => Array.isArray(value) && typeof value[0] === "string" ? value[0] : null;
  const doi = typeof work.DOI === "string" ? work.DOI : null;
  const dateParts = work.published?.["date-parts"]?.[0] || work.issued?.["date-parts"]?.[0];
  const year = Number.isInteger(dateParts?.[0]) ? dateParts[0] : null;
  const publicationDate = Array.isArray(dateParts) ? dateParts.map((part: number, index: number) => String(part).padStart(index ? 2 : 4, "0")).join("-") : null;
  const page = typeof work.page === "string" ? work.page.split("-") : [];
  const openAccessUrl = Array.isArray(work.link) ? work.link.map((link: any) => link?.URL).find(isReadingPageUrl) || null : null;
  return { id: doi ? `https://doi.org/${doi}` : String(work.URL || work.resource?.primary?.URL || crypto.randomUUID()), title: first(work.title) || "Untitled", authors: Array.isArray(work.author) ? work.author.map((author: any) => [author.given, author.family].filter(Boolean).join(" ")).filter(Boolean) : [], year, abstract: typeof work.abstract === "string" ? work.abstract.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null : null, topics: Array.isArray(work.subject) ? work.subject.slice(0, 5).map((name: string) => ({ id: name, name })) : [], doi, landingPageUrl: isReadingPageUrl(work.URL) ? work.URL : doi ? `https://doi.org/${doi}` : null, openAccessUrl, citedByCount: Number(work["is-referenced-by-count"]) || 0, category, venue: first(work["container-title"]), volume: typeof work.volume === "string" ? work.volume : null, issue: typeof work.issue === "string" ? work.issue : null, firstPage: page[0] || null, lastPage: page[1] || null, publicationDate };
}
