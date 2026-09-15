import { describe, expect, it } from "vitest";
import { automaticOtherTopic, withAutomaticOtherTopic } from "./automaticOther";
import type { GachaSettings } from "../types";

const topic = (name: string) => ({ id: `keyword:${name}`, name });

describe("automaticOtherTopic", () => {
  it("avoids a field represented by expert or related keywords", () => {
    const selected = automaticOtherTopic([topic("Astronomy")], [topic("Marine ecosystems")]);
    expect(selected.name).not.toBe("Astronomy");
    expect(selected.name).not.toBe("Marine biology");
    expect(selected.id).toMatch(/^auto-other:/);

    expect(automaticOtherTopic([topic("天文学")], []).name).not.toBe("Astronomy");
  });

  it("is stable for the same discovery mix", () => {
    expect(automaticOtherTopic([topic("Machine learning")], []))
      .toEqual(automaticOtherTopic([topic("Machine learning")], []));
  });

  it("replaces manually stored other keywords only when Other is active", () => {
    const settings: GachaSettings = {
      expertTopics: [topic("Economics")], relatedTopics: [], otherTopics: [topic("Legacy")],
      expertCount: 1, relatedCount: 0, otherCount: 1, publicationYears: 3,
    };
    expect(withAutomaticOtherTopic(settings).otherTopics).toHaveLength(1);
    expect(withAutomaticOtherTopic({ ...settings, otherCount: 0 }).otherTopics).toEqual([]);
  });
});
