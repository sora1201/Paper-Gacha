import { describe,expect,it,vi } from "vitest";
import { deliverShare,ieeeCitation,shareTextFor } from "./citation";
import type { Paper } from "../types";

const paper=(changes:Partial<Paper>={}):Paper=>({id:"W1",title:"A useful paper",authors:["A. Author","B. Writer"],year:2024,abstract:null,topics:[],doi:"10.1000/example",landingPageUrl:"https://openalex.org/W1",openAccessUrl:null,citedByCount:0,category:"expert",...changes});

describe("ieeeCitation",()=>{
  it("formats complete metadata",()=>expect(ieeeCitation(paper({venue:"Journal of Tests",volume:"12",issue:"3",firstPage:"10",lastPage:"19",publicationDate:"2024-05-10"}))).toBe('A. Author and B. Writer, “A useful paper,” Journal of Tests, vol. 12, no. 3, pp. 10–19, 2024, doi: 10.1000/example.'));
  it("omits a missing venue and pages without stray commas",()=>expect(ieeeCitation(paper({volume:"2",issue:null}))).toBe('A. Author and B. Writer, “A useful paper,” vol. 2, 2024, doi: 10.1000/example.'));
  it("uses an available URL only when DOI is absent",()=>expect(ieeeCitation(paper({doi:null,openAccessUrl:"https://example.test/paper"}))).toBe('A. Author and B. Writer, “A useful paper,” 2024, https://example.test/paper.'));
  it("handles no authors",()=>expect(ieeeCitation(paper({authors:[]}))).toBe('“A useful paper,” 2024, doi: 10.1000/example.'));
  it("preserves Japanese titles and author names",()=>expect(ieeeCitation(paper({title:"論文の題名",authors:["山田 太郎"],venue:"情報学会誌"}))).toBe('山田 太郎, “論文の題名,” 情報学会誌, 2024, doi: 10.1000/example.'));
});

describe("sharing",()=>{
  it("adds a trimmed memo after a blank line and omits it when empty",()=>{
    expect(shareTextFor(paper(),"  Read this  ")).toContain(".\n\nRead this");
    expect(shareTextFor(paper(),"   ")).toBe(ieeeCitation(paper()));
  });
  it("passes the completed text to the Web Share API",async()=>{
    const share=vi.fn().mockResolvedValue(undefined);
    expect(await deliverShare("reference\n\nnote","Title",{share})).toBe("shared");
    expect(share).toHaveBeenCalledWith({title:"Title",text:"reference\n\nnote"});
  });
  it("passes the same completed text to the clipboard fallback",async()=>{
    const writeText=vi.fn().mockResolvedValue(undefined);
    expect(await deliverShare("reference\n\nnote","Title",{clipboard:{writeText}})).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("reference\n\nnote");
  });
});
