import { describe, expect, it } from "vitest";
import { mapCrossrefWork } from "./mapper";

describe("mapCrossrefWork", () => {
  it("maps Crossref fallback results into paper cards", () => {
    const paper = mapCrossrefWork({
      DOI: "10.1000/fallback",
      title: ["Fallback paper"],
      author: [{ given: "Ada", family: "Lovelace" }],
      published: { "date-parts": [[2025, 4, 3]] },
      abstract: "<jats:p>A useful abstract.</jats:p>",
      subject: ["Computer Science"],
      URL: "https://doi.org/10.1000/fallback",
      "container-title": ["Journal of Fallbacks"],
      page: "10-19",
    }, "expert");

    expect(paper).toMatchObject({
      id: "https://doi.org/10.1000/fallback",
      title: "Fallback paper",
      authors: ["Ada Lovelace"],
      year: 2025,
      publicationDate: "2025-04-03",
      abstract: "A useful abstract.",
      firstPage: "10",
      lastPage: "19",
      category: "expert",
    });
  });

  it("handles sparse Crossref records", () => {
    const paper = mapCrossrefWork({ URL: "https://example.test/work" }, "other");
    expect(paper.title).toBe("Untitled");
    expect(paper.year).toBeNull();
    expect(paper.authors).toEqual([]);
  });
});
