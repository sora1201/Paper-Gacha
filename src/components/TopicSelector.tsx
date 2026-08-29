import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SelectedTopic } from "../types";

export function TopicSelector({ value, onChange }: { value: SelectedTopic[]; onChange: (v: SelectedTopic[]) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  function addKeyword() {
    const name = query.trim();
    if (!name || value.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    onChange([...value, { id: `keyword:${encodeURIComponent(name.toLocaleLowerCase())}`, name }]);
    setQuery("");
  }

  return <div className="topic-selector">
    <div className="selected-topics">{value.map((topic) => <span className="topic-chip" key={topic.id}>{topic.name}<button type="button" onClick={() => onChange(value.filter((item) => item.id !== topic.id))} aria-label={t("settings.remove", { name: topic.name })}><X size={14}/></button></span>)}</div>
    <form className="keyword-form" onSubmit={(event) => { event.preventDefault(); addKeyword(); }}>
      <label className="search-box"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("settings.search")} aria-label={t("settings.search")}/></label>
      <button type="submit" className="add-keyword" disabled={!query.trim()}><Plus size={16}/>{t("settings.addKeyword")}</button>
    </form>
    <p className="keyword-hint">{t("settings.keywordHint")}</p>
  </div>;
}
