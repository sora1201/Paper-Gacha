import type { GachaSettings, SelectedTopic } from "../types";

const outsideFields = [
  { name: "Architecture", terms: ["architect", "building", "urban", "建築", "都市"] },
  { name: "Marine biology", terms: ["marine", "ocean", "fish", "aquatic", "海洋", "水産"] },
  { name: "Musicology", terms: ["music", "sound", "audio", "音楽", "音響"] },
  { name: "Archaeology", terms: ["archaeolog", "ancient", "heritage", "考古", "古代", "文化財"] },
  { name: "Agricultural science", terms: ["agricultur", "crop", "farm", "soil", "農学", "農業", "作物"] },
  { name: "Astronomy", terms: ["astronom", "space", "planet", "star", "cosmolog", "天文", "宇宙", "惑星"] },
  { name: "Linguistics", terms: ["linguist", "language", "speech", "言語", "音声"] },
  { name: "Sports science", terms: ["sport", "athlet", "exercise", "スポーツ", "運動"] },
  { name: "Geology", terms: ["geolog", "earth", "rock", "mineral", "地質", "岩石", "鉱物"] },
  { name: "Art history", terms: ["art", "painting", "visual culture", "美術", "絵画", "芸術"] },
] as const;

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase();

/** Selects a stable outside field while avoiding fields named by the user's usual keywords. */
export function automaticOtherTopic(expert: SelectedTopic[], related: SelectedTopic[]): SelectedTopic {
  const keywords = normalize([...expert, ...related].map((topic) => topic.name).join(" "));
  const eligible = outsideFields.filter((field) =>
    !field.terms.some((term) => keywords.includes(term)),
  );
  const pool = eligible.length > 0 ? eligible : outsideFields;
  let hash = 0;
  for (const character of keywords) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  const selected = pool[hash % pool.length];
  return { id: `auto-other:${encodeURIComponent(selected.name.toLocaleLowerCase())}`, name: selected.name };
}

export function withAutomaticOtherTopic(settings: GachaSettings): GachaSettings {
  return {
    ...settings,
    otherTopics: settings.otherCount > 0
      ? [automaticOtherTopic(settings.expertTopics, settings.relatedTopics)]
      : [],
  };
}
