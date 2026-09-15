import { describe, expect, it, vi } from "vitest";
import type { GachaCandidates, GachaSettings, Paper, PaperCategory } from "../types";
import { drawPapers } from "./draw";

const makePaper = (id: string, category: PaperCategory): Paper => ({ id, category, title: id, abstract: "abstract", authors: [], year: 2026, topics: [], doi: null, landingPageUrl: null, openAccessUrl: null, citedByCount: 0 });
const settings: GachaSettings = {
  expertTopics: [{ id: "e1", name: "E1" }, { id: "e2", name: "E2" }],
  relatedTopics: [{ id: "r1", name: "R1" }], otherTopics: [{ id: "o1", name: "O1" }],
  expertCount: 2, relatedCount: 1, otherCount: 1, publicationYears: null,
};
const candidates: GachaCandidates = {
  expert: { e1: [makePaper("low", "expert"), makePaper("duplicate", "expert")], e2: [makePaper("high", "expert"), makePaper("duplicate", "expert")] },
  related: { r1: [makePaper("duplicate", "related"), makePaper("related", "related")] },
  other: { o1: [makePaper("other-a", "other"), makePaper("other-b", "other")] },
};

describe("drawPapers", () => {
  it("uses semantic order, excludes read papers, deduplicates categories, and respects counts", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const result = drawPapers(candidates, settings, new Set(["low"]), { expert: ["high", "duplicate", "low"], related: ["duplicate", "related"] });
    expect(result.map(paper => paper.id)).toEqual(["high", "duplicate", "related", "other-a"]);
    expect(result.filter(paper => paper.category === "expert")).toHaveLength(2);
    expect(result.filter(paper => paper.category === "related")).toHaveLength(1);
    expect(new Set(result.map(paper => paper.id)).size).toBe(result.length);
  });

  it("retains shuffled topic-alternating fallback when no AI ranking is returned", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const result = drawPapers(candidates, { ...settings, relatedCount: 0, otherCount: 0 }, new Set());
    expect(result.map(paper => paper.id)).toEqual(["low", "high"]);
  });

  it("does not select papers for a zero-count category even when a ranking exists", () => {
    const result = drawPapers(candidates, { ...settings, expertCount: 0, relatedCount: 0, otherCount: 0 }, new Set(), { expert: ["high"] });
    expect(result).toEqual([]);
  });
});
