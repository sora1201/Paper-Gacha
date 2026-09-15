import type { Paper, SelectedTopic } from "../src/types";

export const EMBEDDING_MODEL = "@cf/qwen/qwen3-embedding-0.6b";
const MAX_EMBEDDED_PAPERS = 24;
const MAX_ABSTRACT_CHARS = 1_500;

export type AiBinding = {
  run(model: string, input: { text: string[] }): Promise<unknown>;
};

function embeddingData(value: unknown): number[][] | null {
  if (!value || typeof value !== "object") return null;
  const data = (value as { data?: unknown }).data;
  if (!Array.isArray(data) || !data.every(row => Array.isArray(row) && row.every(item => typeof item === "number"))) return null;
  return data as number[][];
}

function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

function uniquePapers(papers: Paper[]) {
  const seen = new Set<string>();
  return papers.filter(paper => paper.id && !seen.has(paper.id) && seen.add(paper.id));
}

/**
 * Produces a transient ID order rather than adding AI scores to Paper records.
 * Papers without abstracts are appended after scored papers: a title alone is not
 * enough evidence for the requested title+abstract semantic comparison.
 */
export async function rankPapers(ai: AiBinding, topics: SelectedTopic[], papers: Paper[]): Promise<string[]> {
  const unique = uniquePapers(papers);
  const withAbstract = unique.filter(paper => paper.abstract?.trim());
  const toEmbed = withAbstract.slice(0, MAX_EMBEDDED_PAPERS);
  if (!topics.length || !toEmbed.length) return unique.map(paper => paper.id);

  const keywords = topics.map(topic => topic.name.trim()).filter(Boolean);
  const query = `Research papers about: ${keywords.join("; ")}`;
  const texts = [query, ...toEmbed.map(paper => `${paper.title}\n${paper.abstract!.slice(0, MAX_ABSTRACT_CHARS)}`)];
  const vectors = embeddingData(await ai.run(EMBEDDING_MODEL, { text: texts }));
  if (!vectors || vectors.length !== texts.length) throw new Error("Invalid embedding response");

  const normalizedKeywords = keywords.map(keyword => keyword.toLocaleLowerCase());
  const ranked = toEmbed.map((paper, index) => {
    const searchable = `${paper.title}\n${paper.abstract}`.toLocaleLowerCase();
    const keywordMatches = normalizedKeywords.filter(keyword => searchable.includes(keyword)).length;
    return { id: paper.id, index, score: cosine(vectors[0], vectors[index + 1]) + 0.03 * keywordMatches };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  // Abstract-bearing overflow stays ahead of abstract-less records without spending
  // additional Workers AI tokens. The latter remain available as a last resort.
  return [
    ...ranked.map(item => item.id),
    ...withAbstract.slice(MAX_EMBEDDED_PAPERS).map(paper => paper.id),
    ...unique.filter(paper => !paper.abstract?.trim()).map(paper => paper.id),
  ];
}

export async function tryRankPapers(ai: AiBinding | undefined, topics: SelectedTopic[], papers: Paper[]) {
  if (!ai) return undefined;
  try {
    return await rankPapers(ai, topics, papers);
  } catch {
    // Do not surface provider errors, quota information, or request details.
    console.warn("Semantic ranking unavailable; using fallback");
    return undefined;
  }
}
