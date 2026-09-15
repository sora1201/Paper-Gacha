import { describe, expect, it } from "vitest";
import { amazonSearchUrl, paperBookKeywords } from "./amazon";
import type { Paper } from "../types";

const paper = (id:string, topics:Paper["topics"]):Paper => ({id,title:id,authors:[],year:null,abstract:null,topics,doi:null,landingPageUrl:null,openAccessUrl:null,citedByCount:0,category:"expert"});

describe("paperBookKeywords", () => {
  it("uses drawn-paper topics, deduplicates names, and limits the list to three", () => {
    expect(paperBookKeywords([
      paper("one", [{id:"1",name:"Machine Learning"},{id:"2",name:"Statistics"}]),
      paper("two", [{id:"3",name:"machine learning"},{id:"4",name:"Philosophy"},{id:"5",name:"History"}]),
    ])).toEqual([
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
