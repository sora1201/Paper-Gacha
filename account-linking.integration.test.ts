import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Better Auth account linking integration", () => {
  it("passes the restricted linking policy to Better Auth", () => {
    const authSource = readFileSync(new URL("./worker/auth.ts", import.meta.url), "utf8");
    expect(authSource).toContain('import { accountLinking } from "./account-linking"');
    expect(authSource).toContain("account: { accountLinking }");
  });
});
