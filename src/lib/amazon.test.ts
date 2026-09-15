import { describe, expect, it } from "vitest";
import { amazonSearchUrl, relatedBookQueries, relatedBookSlots } from "./amazon";
import type { GachaSettings, Paper, RelatedBook } from "../types";

const paper = (title:string, topics:Paper["topics"]=[]):Paper => ({id:title,title,authors:[],year:null,abstract:null,topics,doi:null,landingPageUrl:null,openAccessUrl:null,citedByCount:0,category:"expert"});
const settings = (names:string[]=[]):GachaSettings => ({expertTopics:names.map((name,index)=>({id:String(index),name})),relatedTopics:[],otherTopics:[],expertCount:1,relatedCount:0,otherCount:0,publicationYears:3});
const book = (id:string,query:string):RelatedBook => ({id,title:`Book ${id}`,authors:["Author"],thumbnail:"https://example.com/cover.jpg",isbn:id,query});

describe("relatedBookQueries", () => {
  it("prioritizes drawn-paper topics and deduplicates them", () => {
    expect(relatedBookQueries([
      paper("one", [{id:"1",name:"Machine Learning"},{id:"2",name:"Statistics"}]),
      paper("two", [{id:"3",name:"machine learning"},{id:"4",name:"Philosophy"},{id:"5",name:"History"}]),
    ],settings(["Configured"]),"en")).toEqual([
      "Machine Learning",
      "Statistics",
      "Philosophy",
    ]);
  });

  it("falls back from a title to configured topics and then a localized generic query", () => {
    expect(relatedBookQueries([paper("A Paper Title")],settings(["Configured Topic"]),"en")).toEqual(["A Paper Title","Configured Topic","academic research"]);
    expect(relatedBookQueries([paper("論文タイトル")],settings(),"ja")).toEqual(["論文タイトル","研究","研究"]);
  });
});

describe("relatedBookSlots", () => {
  const queries=["first","second","academic research"];

  it("shows three search fallbacks when no books were fetched", () => {
    expect(relatedBookSlots([],queries)).toEqual(queries.map(query=>({type:"search",query})));
  });

  it("keeps real book cards and fills one or two missing positions", () => {
    const one=relatedBookSlots([book("1","first")],queries);
    expect(one.map(slot=>slot.type)).toEqual(["book","search","search"]);
    expect(one[0]).toEqual({type:"book",book:book("1","first")});
    expect(relatedBookSlots([book("1","first"),book("2","second")],queries).map(slot=>slot.type)).toEqual(["book","book","search"]);
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
