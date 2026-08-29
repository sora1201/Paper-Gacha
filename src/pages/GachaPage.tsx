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
      const { candidates } = await fetchCandidates(settings);
      const picked = drawPapers(candidates, settings, getDrawnIds());
      setPapers(picked);
      saveDraw(picked);
    } catch {
      setError(t("gacha.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page gacha-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={15} />
            {t("gacha.eyebrow")}
          </p>
          <h1>{t("gacha.title")}</h1>
          <p>{t("gacha.description")}</p>

          <button
            className={`draw-button gachapon-button ${loading ? "drawing" : ""}`}
            onClick={draw}
            disabled={!valid || loading}
            aria-describedby={!valid ? "gacha-setup-help" : undefined}
          >
            <span className="gachapon-handle" aria-hidden="true">
              <span className="handle-bar" />
            </span>
            <span>{loading ? t("gacha.drawing") : t("gacha.draw")}</span>
          </button>

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

        <div className={`hero-art ${loading ? "drawing" : ""}`} aria-hidden="true">
          <span className="art-glow" />
          <img src="/paper-gacha-app-icon.png" alt="" />
          <span className="art-note">OPEN A NEW IDEA</span>
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
