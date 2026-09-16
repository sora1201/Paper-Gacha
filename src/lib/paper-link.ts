import type { Paper } from "../types";

const openAlexRecord = (paper: Paper) =>
  /^https:\/\/openalex\.org\/W\d+$/i.test(paper.id) ? paper.id : null;

/** Prefer the publisher's reading page; file and repository links are fallbacks. */
export function paperAccessUrl(paper: Paper) {
  if (paper.landingPageUrl) return paper.landingPageUrl;
  if (paper.doi) return `https://doi.org/${paper.doi}`;
  return paper.openAccessUrl || openAlexRecord(paper);
}
