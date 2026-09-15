import { describe, expect, it } from "vitest";
import { amazonSearchUrl, relatedBookTopics } from "./amazon";
import type { GachaSettings } from "../types";

const settings: GachaSettings = {
  expertTopics: [{ id: "1", name: "Machine Learning" }],
  relatedTopics: [
    { id: "2", name: "machine learning" },
    { id: "3", name: "Statistics" },
  ],
  otherTopics: [
    { id: "4", name: "Philosophy" },
    { id: "5", name: "History" },
  ],
  expertCount: 3,
  relatedCount: 2,
  otherCount: 1,
  publicationYears: 3,
};

describe("relatedBookTopics", () => {
  it("deduplicates topic names in category order and limits the list to three", () => {
    expect(relatedBookTopics(settings).map((topic) => topic.name)).toEqual([
      "Machine Learning",
      "Statistics",
      "Philosophy",
    ]);
  });
});

describe("amazonSearchUrl", () => {
  it("uses Amazon Japan and includes a configured associate tag", () => {
    const url = new URL(amazonSearchUrl("機械学習", "ja-JP", "paper-22"));
    expect(url.hostname).toBe("www.amazon.co.jp");
    expect(url.searchParams.get("k")).toBe("機械学習");
    expect(url.searchParams.get("tag")).toBe("paper-22");
  });

  it("uses Amazon.com without a tag when one is not configured", () => {
    const url = new URL(amazonSearchUrl("Machine Learning", "en"));
    expect(url.hostname).toBe("www.amazon.com");
    expect(url.searchParams.get("tag")).toBeNull();
  });
});
