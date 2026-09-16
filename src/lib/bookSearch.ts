import type { Paper } from "../types";

const COMMON_WORDS = new Set<string>([
  "about","after","among","analysis","approach","based","between","data","effect","effects","from","into","method","methods","model","models","paper","result","results","study","studies","using","with",
  "and","are","for","how","its","our","the","their","this","through","toward","towards","was","were",
]);
const COMMON_JAPANESE = new Set<string>(["研究","分析","手法","方法","効果","結果","アプローチ","データ","モデル"]);

const normalized = (value:string) => value.trim().replace(/\s+/g," ");
const authorTokens = (paper:Paper) => new Set(paper.authors.flatMap(author => author.toLocaleLowerCase().match(/[a-z][a-z'-]+/g) ?? []));

function englishTerms(paper:Paper) {
  const title = paper.title.toLocaleLowerCase();
  const abstract = (paper.abstract ?? "").toLocaleLowerCase();
  const authors = authorTokens(paper);
  const valid = (word:string) => word.length >= 3 && word.length <= 30 && !COMMON_WORDS.has(word) && !authors.has(word) && !/^\d+$/.test(word);
  const titleWords:string[] = title.match(/[a-z][a-z'-]*/g) ?? [];
  const abstractWords:string[] = abstract.match(/[a-z][a-z'-]*/g) ?? [];
  const score = new Map<string,number>();
  for (const word of [...titleWords,...abstractWords]) if (valid(word)) score.set(word,(score.get(word) ?? 0)+(titleWords.includes(word)?5:1));
  const phrases:string[]=[];
  for (let index=0;index<titleWords.length-1;index++) if (valid(titleWords[index])&&valid(titleWords[index+1])) phrases.push(`${titleWords[index]} ${titleWords[index+1]}`);
  const rankedPhrases=phrases.map(phrase=>({term:phrase,score:phrase.split(" ").reduce((sum,word)=>sum+(score.get(word)??0),0)+4}));
  const rankedWords=[...score].map(([term,value])=>({term,score:value}));
  return [...rankedPhrases,...rankedWords].sort((a,b)=>b.score-a.score||a.term.localeCompare(b.term)).map(item=>item.term);
}

function japaneseTerms(paper:Paper) {
  const text=`${paper.title} ${paper.abstract ?? ""}`;
  const candidates=text.match(/[一-龠々ァ-ヶー]{2,16}/g) ?? [];
  const score=new Map<string,number>();
  for (const term of candidates) if (!COMMON_JAPANESE.has(term)) score.set(term,(score.get(term)??0)+(paper.title.includes(term)?5:1));
  return [...score].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([term])=>term);
}

export function extractSpecialistKeywords(paper:Paper, limit=2):string[] {
  const hasJapanese=/[一-龠ぁ-んァ-ヶ]/.test(`${paper.title}${paper.abstract ?? ""}`);
  const ranked=hasJapanese?japaneseTerms(paper):englishTerms(paper);
  const selected:string[]=[];
  for (const term of ranked) {
    if (selected.some(existing=>existing.includes(term)||term.includes(existing))) continue;
    selected.push(term);
    if (selected.length===limit) break;
  }
  return selected;
}

export function paperTopicQuery(paper:Paper):string {
  const content=`${paper.title} ${paper.abstract ?? ""}`.toLocaleLowerCase();
  return paper.topics.map((topic,index)=>{const name=normalized(topic.name);const tokens=name.toLocaleLowerCase().match(/[a-z]{4,}/g)??[];const overlap=tokens.filter(token=>content.includes(token.slice(0,Math.min(5,token.length)))).length;return {name,score:(content.includes(name.toLocaleLowerCase())?10:0)+overlap*4-index};})
    .filter(topic=>topic.name).sort((a,b)=>b.score-a.score).slice(0,2).map(topic=>topic.name).join(" ");
}

export const paperExtractedQuery=(paper:Paper)=>extractSpecialistKeywords(paper).join(" ");

export function paperBookSearchCandidates(paper:Paper, configuredTopics:string[]=[]):string[] {
  const configured=normalized(configuredTopics.slice(0,2).join(" "));
  const values=[paperTopicQuery(paper),paperExtractedQuery(paper),configured,normalized(paper.title)];
  return values.filter((value,index)=>value&&values.findIndex(item=>item.toLocaleLowerCase()===value.toLocaleLowerCase())===index);
}

export const paperBookSearchQuery=(paper:Paper,configuredTopics:string[]=[])=>paperBookSearchCandidates(paper,configuredTopics)[0]||normalized(paper.title);
