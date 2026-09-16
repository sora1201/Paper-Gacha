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
  it("routes SAGE records through OpenAlex instead of a commonly blocked direct link", () => {
    expect(paperAccessUrl(paper())).toBe("https://openalex.org/W123");
  });

  it("also avoids SAGE URLs incorrectly reported as open-access copies", () => {
    expect(paperAccessUrl(paper({ openAccessUrl: "https://journals.sagepub.com/doi/pdf/10.1177/example" }))).toBe("https://openalex.org/W123");
  });

  it("continues to prefer open-access copies from other hosts", () => {
    expect(paperAccessUrl(paper({ openAccessUrl: "https://repository.example/paper.pdf" }))).toBe("https://repository.example/paper.pdf");
  });

  it("uses the DOI for records which do not have an open copy", () => {
    expect(paperAccessUrl(paper({ id: "crossref-record", landingPageUrl: null }))).toBe("https://doi.org/10.1177/example");
  });
});
