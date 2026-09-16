import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { GachaPage } from "./GachaPage";
import "../i18n";
import type { GachaSettings, Paper } from "../types";

const settings:GachaSettings={expertTopics:[],relatedTopics:[],otherTopics:[],expertCount:1,relatedCount:0,otherCount:0,publicationYears:3};
const paper:Paper={id:"paper",title:"Fallback Paper",authors:[],year:2026,abstract:null,topics:[],doi:null,landingPageUrl:null,openAccessUrl:null,citedByCount:0,category:"expert"};

describe("GachaPage related books", () => {
  it("renders the affiliate section and search cards whenever a paper exists", () => {
    const html=renderToStaticMarkup(<MemoryRouter><GachaPage settings={settings} papers={[paper]} favorites={[]} onDraw={()=>{}} onFavorite={()=>{}} onToast={()=>{}}/></MemoryRouter>);
    expect(html).toContain('class="related-books"');
    expect(html.match(/class="related-book-search"/g)).toHaveLength(3);
    expect(html).toContain("Fallback Paper");
  });
});
