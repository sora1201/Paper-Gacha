export type PaperCategory = "expert" | "related" | "other";
export type Paper = { id:string; title:string; authors:string[]; year:number|null; abstract:string|null; topics:{id:string;name:string}[]; doi:string|null; landingPageUrl:string|null; openAccessUrl:string|null; citedByCount:number; category:PaperCategory };
export type SelectedTopic = { id:string; name:string };
export type GachaSettings = { expertTopics:SelectedTopic[]; relatedTopics:SelectedTopic[]; otherTopics:SelectedTopic[]; expertCount:number; relatedCount:number; otherCount:number; publicationYears:1|3|5|10|null };
export type Language = "ja"|"en";
export type AppPreferences = {language:Language};
export type DrawnPaperRecord = {paperId:string;drawnAt:string};
export type HistoryEntry = {id:string;drawnAt:string;papers:Paper[]};
export type GachaCandidates = Record<PaperCategory, Record<string, Paper[]>>;
export type BackupFile = {
  format:"paper-gacha-backup";
  version:1;
  exportedAt:string;
  data:{settings:GachaSettings;preferences:AppPreferences;drawn:DrawnPaperRecord[];favorites:Paper[];history:HistoryEntry[]};
};
