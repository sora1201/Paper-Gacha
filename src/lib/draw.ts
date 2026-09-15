import type { GachaCandidates, GachaRanking, GachaSettings, Paper, PaperCategory, SelectedTopic } from "../types";

const shuffle = <T,>(items: T[]) => {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[randomIndex]] = [output[randomIndex], output[index]];
  }
  return output;
};

const config: Record<PaperCategory, { topics: keyof GachaSettings; count: keyof GachaSettings }> = {
  expert: { topics: "expertTopics", count: "expertCount" },
  related: { topics: "relatedTopics", count: "relatedCount" },
  other: { topics: "otherTopics", count: "otherCount" },
};

export function drawPapers(candidates: GachaCandidates, settings: GachaSettings, excluded: Set<string>, ranking?: GachaRanking) {
  const result: Paper[] = [];
  const used = new Set(excluded);
  for (const category of Object.keys(config) as PaperCategory[]) {
    const { topics, count } = config[category];
    const selected = settings[topics] as SelectedTopic[];
    const needed = settings[count] as number;
    if (needed <= 0) continue;
    const categoryPapers = selected.flatMap(topic => candidates[category]?.[topic.id] || []);
    const byId = new Map(categoryPapers.map(paper => [paper.id, paper]));

    // Only expert/related receive an AI order. With no order (including an AI
    // outage), retain the original shuffled, topic-alternating selection. "other"
    // intentionally always follows that serendipitous path.
    const rankedIds = category === "other" ? undefined : ranking?.[category];
    if (rankedIds) {
      for (const id of rankedIds) {
        const paper = byId.get(id);
        if (!paper || used.has(id)) continue;
        used.add(id);
        result.push({ ...paper, category });
        if (result.filter(item => item.category === category).length === needed) break;
      }
      continue;
    }

    const queues = selected.map(topic => shuffle(candidates[category]?.[topic.id] || []));
    while (result.filter(paper => paper.category === category).length < needed) {
      let added = false;
      for (const queue of queues) {
        const paper = queue.find(item => !used.has(item.id));
        if (paper) {
          used.add(paper.id);
          result.push({ ...paper, category });
          queue.splice(queue.indexOf(paper), 1);
          added = true;
          if (result.filter(item => item.category === category).length === needed) break;
        }
      }
      if (!added) break;
    }
  }
  return result;
}
