import type { Paper } from "../types";

const isSageUrl = (value: string | null) => {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "sagepub.com" || hostname.endsWith(".sagepub.com");
  } catch {
    return false;
  }
};

const openAlexRecord = (paper: Paper) =>
  /^https:\/\/openalex\.org\/W\d+$/i.test(paper.id) ? paper.id : null;

/**
 * Prefer an actual open copy. SAGE landing pages frequently reject direct links
 * with a bot-protection 403, so OpenAlex records are a safer route to their
 * available locations; the DOI remains part of the citation.
 */
export function paperAccessUrl(paper: Paper) {
  if (paper.openAccessUrl && !isSageUrl(paper.openAccessUrl)) return paper.openAccessUrl;
  if (isSageUrl(paper.openAccessUrl) || isSageUrl(paper.landingPageUrl)) {
    const record = openAlexRecord(paper);
    if (record) return record;
  }
  if (paper.doi) return `https://doi.org/${paper.doi}`;
  return paper.landingPageUrl || openAlexRecord(paper);
}
