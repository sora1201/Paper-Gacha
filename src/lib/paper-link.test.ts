import { describe, expect, it } from "vitest";
import { paperAccessUrl } from "./paper-link";
import type { Paper } from "../types";

const paper = (changes: Partial<Paper> = {}): Paper => ({
  id: "https://openalex.org/W123",
  title: "Paper",
  authors: [],
  year: 2026,
  abstract: null,
  topics: [],
  doi: "10.1177/example",
  landingPageUrl: "https://journals.sagepub.com/doi/10.1177/example",
  openAccessUrl: null,
  citedByCount: 0,
  category: "expert",
  ...changes,
});

describe("paperAccessUrl", () => {
  it("prefers the publisher reading page", () => {
    expect(paperAccessUrl(paper())).toBe("https://journals.sagepub.com/doi/10.1177/example");
  });

  it("does not replace the publisher page with a PDF or repository copy", () => {
    expect(paperAccessUrl(paper({ openAccessUrl: "https://repository.example/paper.pdf" }))).toBe("https://journals.sagepub.com/doi/10.1177/example");
  });

  it("uses the DOI when the publisher page is unavailable", () => {
    expect(paperAccessUrl(paper({ id: "crossref-record", landingPageUrl: null }))).toBe("https://doi.org/10.1177/example");
  });

  it("uses an open copy only as a final fallback", () => {
    expect(paperAccessUrl(paper({ doi: null, landingPageUrl: null, openAccessUrl: "https://repository.example/paper.pdf" }))).toBe("https://repository.example/paper.pdf");
  });
});
