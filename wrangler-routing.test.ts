import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloudflare static asset routing", () => {
  it("runs the Worker before SPA fallback for every API request", () => {
    const config = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
    expect(config).toContain('"run_worker_first": ["/api/*"]');
    expect(config).toContain('"not_found_handling": "single-page-application"');
  });
});
