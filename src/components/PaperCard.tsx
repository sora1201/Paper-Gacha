import { useEffect,useRef,useState } from "react";
import { ArrowUpRight,Heart,Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { deliverShare,ieeeCitation,shareTextFor,socialShareUrl } from "../lib/citation";
import type { SocialShareTarget } from "../lib/citation";
import type { Paper } from "../types";

const urlFor=(paper:Paper)=>paper.openAccessUrl||(paper.doi?`https://doi.org/${paper.doi}`:paper.landingPageUrl);

export function PaperCard({paper,isFavorite,onFavorite,onToast}:{paper:Paper;isFavorite:boolean;onFavorite:(p:Paper)=>void;onToast:(s:string)=>void}) {
  const {t}=useTranslation();
  const [expanded,setExpanded]=useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const [memo,setMemo]=useState("");
  const memoRef=useRef<HTMLTextAreaElement>(null);
  const shareButtonRef=useRef<HTMLButtonElement>(null);
  const url=urlFor(paper);
  const citation=ieeeCitation(paper);

  useEffect(()=>{
    if(!shareOpen)return;
    memoRef.current?.focus();
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setShareOpen(false);shareButtonRef.current?.focus();}};
    document.addEventListener("keydown",escape);
    return ()=>document.removeEventListener("keydown",escape);
  },[shareOpen]);

  function closeShare(){setShareOpen(false);shareButtonRef.current?.focus();}
  async function share(){
    try {
      const result=await deliverShare(shareTextFor(paper,memo),paper.title);
      setShareOpen(false);
      if(result==="copied")onToast(t("common.copied"));
    } catch(error) {
      if((error as Error).name!=="AbortError")onToast(t("common.shareFailed"));
    }
  }
  function shareTo(target:SocialShareTarget){
    window.open(socialShareUrl(target,shareTextFor(paper,memo),url),"_blank","noopener,noreferrer");
    setShareOpen(false);
  }

  return <>
    <article className={`paper-card ${paper.category}`}>
      <div className="card-top"><span className="category"><i/>{t(`common.${paper.category}`)}</span><button className={`icon-button ${isFavorite?"active":""}`} onClick={()=>onFavorite(paper)} aria-label={t(isFavorite?"common.removeFavorite":"common.favorite")}><Heart size={20} fill={isFavorite?"currentColor":"none"}/></button></div>
      <h3>{paper.title}</h3>
      <p className="meta">{paper.authors.length?paper.authors.slice(0,4).join(", "):"—"}<span>·</span>{paper.year??t("common.unknownYear")}</p>
      <div className="topic-row">{paper.topics.slice(0,3).map(topic=><span key={topic.id}>{topic.name}</span>)}</div>
      <div className={`abstract ${expanded?"expanded":""}`}>{paper.abstract||t("common.noAbstract")}</div>
      {paper.abstract&&<button className="text-button" onClick={()=>setExpanded(!expanded)}>{t(expanded?"common.showLess":"common.showMore")}</button>}
      <div className="card-actions"><a className={`paper-link ${!url?"disabled":""}`} href={url??undefined} target="_blank" rel="noreferrer" aria-disabled={!url}>{t("common.open")} <ArrowUpRight size={16}/></a><button ref={shareButtonRef} className="share" onClick={()=>setShareOpen(true)}><Share2 size={17}/>{t("common.share")}</button></div>
    </article>
    {shareOpen&&<div className="share-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)closeShare();}}>
      <div className="share-modal" role="dialog" aria-modal="true" aria-labelledby={`share-title-${paper.id}`}>
        <h2 id={`share-title-${paper.id}`}>{t("share.title")}</h2>
        <p className="share-description">{t("share.description")}</p>
        <div className="citation-preview" aria-label={t("share.preview")}>{citation}</div>
        <label htmlFor={`share-memo-${paper.id}`}>{t("share.memo")}</label>
        <textarea ref={memoRef} id={`share-memo-${paper.id}`} value={memo} onChange={event=>setMemo(event.target.value)} rows={5} placeholder={t("share.memoPlaceholder")}/>
        <fieldset className="share-destinations"><legend>{t("share.destination")}</legend><div className="share-destination-grid">
          {(["x","bluesky","linkedin","facebook"] as SocialShareTarget[]).map(target=><button key={target} onClick={()=>shareTo(target)}><span className={`social-mark ${target}`} aria-hidden="true">{target==="x"?"X":target==="bluesky"?"☁":target==="linkedin"?"in":"f"}</span>{t(`share.targets.${target}`)}</button>)}
        </div></fieldset>
        <div className="share-modal-actions"><button className="cancel" onClick={closeShare}>{t("share.cancel")}</button><button className="confirm" onClick={share}><Share2 size={17}/>{t("share.native")}</button></div>
      </div>
    </div>}
  </>;
}
