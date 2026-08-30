import { Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PaperCard } from "../components/PaperCard";
import { fetchCandidates } from "../lib/api";
import { drawPapers } from "../lib/draw";
import { getDrawnIds, saveDraw } from "../lib/storage";
import type { GachaSettings, Paper, PaperCategory } from "../types";

const categories: PaperCategory[] = ["expert", "related", "other"];

type GachaPageProps = {
  settings: GachaSettings;
  favorites: Paper[];
  onFavorite: (paper: Paper) => void;
  onToast: (message: string) => void;
};

export function GachaPage({
  settings,
  favorites,
  onFavorite,
  onToast,
}: GachaPageProps) {
  const { t } = useTranslation();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [error, setError] = useState("");

  const valid =
    settings.expertCount + settings.relatedCount + settings.otherCount > 0 &&
    categories.every((category) => {
      const count = settings[`${category}Count` as keyof GachaSettings] as number;
      const topics = settings[
        `${category}Topics` as keyof GachaSettings
      ] as unknown[];
      return count === 0 || topics.length > 0;
    });

  async function draw() {
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    try {
      const [{ candidates }] = await Promise.all([
        fetchCandidates(settings),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      const picked = drawPapers(candidates, settings, getDrawnIds());
      setDispensing(true);
      await new Promise((resolve) => setTimeout(resolve, 420));
      setPapers(picked);
      saveDraw(picked);
      await new Promise((resolve) => setTimeout(resolve, 380));
    } catch {
      setError(t("gacha.error"));
    } finally {
      setDispensing(false);
      setLoading(false);
    }
  }

  return (
    <div className="page gacha-page">
      {dispensing && <div className="draw-flash" aria-hidden="true" />}
      <section className={`hero gacha-hero ${loading ? "is-drawing" : ""} ${dispensing ? "is-dispensing" : ""}`}>
        <header className="gacha-intro">
          <p className="eyebrow">
            <Sparkles size={15} />
            {t("gacha.eyebrow")}
          </p>
          <h1>{t("gacha.title")}</h1>
        </header>

        <div className="gacha-side-copy gacha-side-copy-left">
          <span className="side-number">01</span>
          <strong>{t("gacha.mixTitle")}</strong>
          <p>{t("gacha.description")}</p>
        </div>

        <div className="gacha-machine-wrap">
          <div className="machine-spark machine-spark-one">✦</div>
          <div className="machine-spark machine-spark-two">✦</div>
          <div className="gacha-machine" aria-hidden="true">
            <div className="machine-dome">
              <span className="dome-shine" />
              <div className="capsule capsule-one"><i /></div>
              <div className="capsule capsule-two"><i /></div>
              <div className="capsule capsule-three"><i /></div>
              <div className="capsule capsule-four"><i /></div>
              <div className="capsule capsule-five"><i /></div>
            </div>
            <div className="machine-rim" />
            <div className="machine-body">
              <div className="machine-badge"><img src="/paper-gacha-app-icon.png" alt="" /></div>
              <div className="paper-window"><span /> <span /> <span /></div>
              <div className="machine-chute"><span>{t("gacha.paperSlot")}</span><i className="dispensed-paper" /></div>
            </div>
            <div className="machine-foot" />
          </div>

          <button
            className="gacha-handle"
            onClick={draw}
            disabled={!valid || loading}
            aria-describedby={!valid ? "gacha-setup-help" : undefined}
            aria-label={loading ? t("gacha.drawing") : t("gacha.turnHandle")}
          >
            <span className="handle-plate"><span className="handle-arm"><i /></span></span>
          </button>
          <div className="handle-caption" aria-live="polite">
            <i aria-hidden="true">↳</i>
            <span>{loading ? t("gacha.drawing") : t("gacha.handleHint")}</span>
          </div>
        </div>

        <div className="gacha-side-copy gacha-side-copy-right">
          <span className="side-number">02</span>
          <strong>{t("gacha.turnTitle")}</strong>
          <p>{t("gacha.turnDescription")}</p>
        </div>

        <div className="gacha-feedback">
          {!valid && (
            <div className="setup-callout" id="gacha-setup-help">
              <strong>{t("gacha.invalidTitle")}</strong>
              <span>{t("gacha.invalid")}</span>
              <Link to="/settings">
                <Settings2 size={18} />
                {t("gacha.goSettings")}
              </Link>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>

      {papers.length > 0 && (
        <section className="results">
          <p className="eyebrow">{t("gacha.results")}</p>
          {categories.map((category) => {
            const list = papers.filter((paper) => paper.category === category);
            const requested = settings[
              `${category}Count` as keyof GachaSettings
            ] as number;
            if (!requested) return null;
            return (
              <div className="result-group" key={category}>
                <div className="group-heading">
                  <h2>{t(`common.${category}`)}</h2>
                  <span>
                    {list.length} / {requested}
                  </span>
                </div>
                {list.length < requested && (
                  <p className="shortage">
                    {t("gacha.shortage", { actual: list.length, requested })}
                  </p>
                )}
                <div className="paper-grid">
                  {list.map((paper) => (
                    <PaperCard
                      key={paper.id}
                      paper={paper}
                      isFavorite={favorites.some(
                        (favorite) => favorite.id === paper.id,
                      )}
                      onFavorite={onFavorite}
                      onToast={onToast}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
