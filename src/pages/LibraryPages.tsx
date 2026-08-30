import { ArrowUpRight, BookHeart, Heart, History as HistoryIcon, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PaperCard } from "../components/PaperCard";
import { deliverShare, ieeeCitation } from "../lib/citation";
import type { HistoryEntry, Paper } from "../types";

const Cards = ({papers,favorites,onFavorite,onToast}:{papers:Paper[];favorites:Paper[];onFavorite:(p:Paper)=>void;onToast:(s:string)=>void}) => <div className="paper-grid">{papers.map(p=><PaperCard key={p.id} paper={p} isFavorite={favorites.some(f=>f.id===p.id)} onFavorite={onFavorite} onToast={onToast}/>)}</div>;

export function FavoritesPage({favorites,onFavorite,onToast}:{favorites:Paper[];onFavorite:(p:Paper)=>void;onToast:(s:string)=>void}) {
  const {t}=useTranslation();
  return <div className="page library-page"><header className="page-heading"><p className="eyebrow">LIBRARY</p><h1>{t("favorites.title")}</h1><p>{t("favorites.description")}</p></header>{favorites.length?<Cards papers={favorites} favorites={favorites} onFavorite={onFavorite} onToast={onToast}/>:<div className="empty"><BookHeart/><p>{t("favorites.empty")}</p></div>}</div>;
}

const paperUrl = (paper: Paper) => paper.openAccessUrl || (paper.doi ? `https://doi.org/${paper.doi}` : paper.landingPageUrl);

export function HistoryPage({history,favorites,onFavorite,onToast}:{history:HistoryEntry[];favorites:Paper[];onFavorite:(p:Paper)=>void;onToast:(s:string)=>void}) {
  const {t,i18n}=useTranslation();
  const dateFormatter = new Intl.DateTimeFormat(i18n.language,{dateStyle:"long"});
  const timeFormatter = new Intl.DateTimeFormat(i18n.language,{timeStyle:"short"});
  const groups = history.reduce<Array<{date:string;entries:HistoryEntry[]}>>((result,entry) => {
    const date=dateFormatter.format(new Date(entry.drawnAt));
    const group=result.at(-1);
    if(group?.date===date) group.entries.push(entry);
    else result.push({date,entries:[entry]});
    return result;
  },[]);

  async function sharePaper(paper:Paper) {
    try {
      const result=await deliverShare(ieeeCitation(paper),paper.title);
      if(result==="copied") onToast(t("common.copied"));
    } catch(error) {
      if((error as Error).name!=="AbortError") onToast(t("common.shareFailed"));
    }
  }

  return <div className="page library-page history-page">
    <header className="page-heading"><p className="eyebrow">ARCHIVE</p><h1>{t("history.title")}</h1><p>{t("history.description")}</p></header>
    {groups.length ? <div className="history-groups">{groups.map(group => <section className="history-day" key={group.date}>
      <h2>{group.date}</h2>
      <div className="history-day-draws">{group.entries.map(entry => <div className="history-draw" key={entry.id}>
        <p className="history-time">{t("history.drawnAt",{time:timeFormatter.format(new Date(entry.drawnAt))})}</p>
        <ol className="reference-list">{entry.papers.map(paper => {
          const url=paperUrl(paper);
          const favorite=favorites.some(item=>item.id===paper.id);
          return <li key={paper.id}><div className="reference-content"><span className={`reference-category ${paper.category}`}>{t(`common.${paper.category}`)}</span><p>{ieeeCitation(paper)}</p></div><div className="reference-actions">{url && <a href={url} target="_blank" rel="noreferrer"><ArrowUpRight size={16}/><span>{t("common.open")}</span></a>}<button onClick={()=>void sharePaper(paper)}><Share2 size={16}/><span>{t("common.share")}</span></button><button className={favorite?"active":""} onClick={()=>onFavorite(paper)}><Heart size={16} fill={favorite?"currentColor":"none"}/><span>{t(favorite?"common.removeFavorite":"common.favorite")}</span></button></div></li>;
        })}</ol>
      </div>)}</div>
    </section>)}</div> : <div className="empty"><HistoryIcon/><p>{t("history.empty")}</p></div>}
  </div>;
}
