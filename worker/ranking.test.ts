import { describe, expect, it, vi } from "vitest";
import type { Paper } from "../src/types";
import { EMBEDDING_MODEL, rankPapers, tryRankPapers } from "./ranking";

const paper = (id: string, title: string, abstract: string | null): Paper => ({
  id, title, abstract, authors: [], year: 2026, topics: [], doi: null,
  landingPageUrl: null, openAccessUrl: null, citedByCount: 0, category: "expert",
});

describe("semantic paper ranking", () => {
  it("orders by cosine similarity and applies the legacy keyword bonus", async () => {
    const ai = { run: vi.fn().mockResolvedValue({ data: [[1, 0], [0.9, 0.1], [1, 0]] }) };
    const ordered = await rankPapers(ai, [{ id: "t", name: "graph learning" }], [
      paper("similar", "A nearby result", "Representation methods"),
      paper("keyword", "Graph learning survey", "A broad review"),
    ]);

    expect(ordered).toEqual(["keyword", "similar"]);
    expect(ai.run).toHaveBeenCalledWith(EMBEDDING_MODEL, {
      text: expect.arrayContaining([expect.stringContaining("graph learning")]),
    });
  });

  it("deduplicates IDs and puts papers without abstracts last", async () => {
    const ai = { run: vi.fn().mockResolvedValue({ data: [[1], [1]] }) };
    const ordered = await rankPapers(ai, [{ id: "t", name: "biology" }], [
      paper("missing", "Title only", null),
      paper("scored", "Biology", "An abstract"),
      paper("scored", "Duplicate", "Duplicate abstract"),
    ]);
    expect(ordered).toEqual(["scored", "missing"]);
  });

  it("rejects malformed AI output so the caller can safely fall back", async () => {
    const ai = { run: vi.fn().mockResolvedValue({ data: [] }) };
    await expect(rankPapers(ai, [{ id: "t", name: "biology" }], [paper("p", "P", "Abstract")])).rejects.toThrow("Invalid embedding response");
  });

  it("returns no order when the binding is missing or the provider fails", async () => {
    expect(await tryRankPapers(undefined, [{ id: "t", name: "biology" }], [paper("p", "P", "Abstract")])).toBeUndefined();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ai = { run: vi.fn().mockRejectedValue(new Error("secret provider detail")) };
    expect(await tryRankPapers(ai, [{ id: "t", name: "biology" }], [paper("p", "P", "Abstract")])).toBeUndefined();
    expect(warning).toHaveBeenCalledWith("Semantic ranking unavailable; using fallback");
  });
});
