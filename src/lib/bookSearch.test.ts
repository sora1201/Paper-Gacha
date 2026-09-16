import { describe, expect, it } from "vitest";
import { extractSpecialistKeywords, paperBookSearchCandidates, paperBookSearchQuery } from "./bookSearch";
import type { Paper } from "../types";

const makePaper=(overrides:Partial<Paper>={}):Paper=>({id:"paper",title:"A Study of Methods and Results",authors:[],year:null,abstract:null,topics:[],doi:null,landingPageUrl:null,openAccessUrl:null,citedByCount:0,category:"expert",...overrides});

describe("paper book search terms",()=>{
  it("prioritizes one relevant, broad OpenAlex topic",()=>{
    const paper=makePaper({title:"Graph neural networks for molecules",topics:[{id:"1",name:"Unrelated Science"},{id:"2",name:"Graph Neural Networks"},{id:"3",name:"Molecular Learning"}]});
    expect(paperBookSearchQuery(paper,["Configured Topic"])).toBe("Graph Neural Networks");
  });

  it("extracts specialist terms from title and abstract without topics",()=>{
    const paper=makePaper({title:"Transformer architectures for protein folding",abstract:"Protein folding prediction uses attention mechanisms and structural bioinformatics."});
    const query=paperBookSearchQuery(paper);
    expect(query).toMatch(/transformer|protein|folding|architectures/);
    expect(query).not.toBe(paper.title);
  });

  it("removes general, numeric, short, and author-name terms",()=>{
    const paper=makePaper({title:"Study analysis method effect results approach 2026",abstract:"Li Wu study the analysis method.",authors:["Li Wu"]});
    expect(extractSpecialistKeywords(paper)).toEqual([]);
  });

  it("works without an abstract and falls back through configured topics to a broad generic query",()=>{
    const generic=makePaper({title:"Study analysis methods",abstract:null});
    expect(paperBookSearchQuery(generic,["Quantum Computing"])).toBe("Quantum Computing");
    expect(paperBookSearchQuery(generic)).toBe("academic research");
    expect(paperBookSearchQuery(generic,[],"研究")).toBe("研究");
  });

  it("extracts a useful Japanese term",()=>{
    const paper=makePaper({title:"量子コンピューティングによる創薬",abstract:"量子アルゴリズムを応用する。"});
    expect(paperBookSearchQuery(paper)).not.toBe(paper.title);
    expect(paperBookSearchQuery(paper)).toMatch(/量子|創薬/);
  });
});
