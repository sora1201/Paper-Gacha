import type { Paper } from "../types";

function authorText(authors:string[]):string {
  if(authors.length<2)return authors[0]||"";
  if(authors.length===2)return `${authors[0]} and ${authors[1]}`;
  return `${authors.slice(0,-1).join(", ")}, and ${authors.at(-1)}`;
}

/** Create a plain-text IEEE-style reference, omitting unavailable metadata. */
export function ieeeCitation(paper:Paper):string {
  const parts:string[]=[];
  const authors=authorText(paper.authors.filter(Boolean));
  if(authors)parts.push(authors);
  parts.push(`“${paper.title},”`);
  if(paper.venue)parts.push(paper.venue);
  if(paper.volume)parts.push(`vol. ${paper.volume}`);
  if(paper.issue)parts.push(`no. ${paper.issue}`);
  if(paper.firstPage&&paper.lastPage)parts.push(`pp. ${paper.firstPage}–${paper.lastPage}`);
  else if(paper.firstPage)parts.push(`p. ${paper.firstPage}`);
  else if(paper.lastPage)parts.push(`p. ${paper.lastPage}`);
  const dateYear=paper.publicationDate?.match(/^\d{4}/)?.[0];
  if(dateYear||paper.year)parts.push(String(dateYear||paper.year));
  if(paper.doi)parts.push(`doi: ${paper.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i,"")}`);
  else {
    const url=paper.openAccessUrl||paper.landingPageUrl;
    if(url)parts.push(url);
  }
  return `${parts.join(", ").replace(/,”,/g,",”")}.`;
}

export function shareTextFor(paper:Paper,memo:string):string {
  const citation=ieeeCitation(paper);
  return memo.trim()?`${citation}\n\n${memo.trim()}`:citation;
}

type ShareNavigator={share?:(data:{title:string;text:string})=>Promise<void>;clipboard?:{writeText:(text:string)=>Promise<void>}};
export async function deliverShare(text:string,title:string,navigation:ShareNavigator=navigator):Promise<"shared"|"copied"> {
  if(navigation.share){await navigation.share({title,text});return "shared";}
  if(!navigation.clipboard)throw new Error("Sharing is unavailable");
  await navigation.clipboard.writeText(text);
  return "copied";
}
