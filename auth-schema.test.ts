import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(new URL("./worker/auth-schema.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("./migrations/0001_auth_and_sync.sql", import.meta.url), "utf8");

const expectedColumns = {
  user: ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"],
  session: ["id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId"],
  account: ["id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"],
  verification: ["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"],
} as const;

describe("Better Auth Drizzle schema", () => {
  it("defines every migrated Better Auth table and column", () => {
    for (const [table, columns] of Object.entries(expectedColumns)) {
      expect(schemaSource).toContain(`sqliteTable("${table}"`);
      expect(migration).toContain(`CREATE TABLE "${table}"`);
      for (const column of columns) {
        expect(schemaSource).toMatch(new RegExp(`\\b${column}: (?:text|integer)\\("${column}"`));
        expect(migration).toContain(`"${column}"`);
      }
    }
  });

  it("uses Date conversion for every Better Auth timestamp INTEGER", () => {
    for (const column of ["createdAt", "updatedAt", "expiresAt", "accessTokenExpiresAt", "refreshTokenExpiresAt"]) {
      const occurrences = schemaSource.match(new RegExp(`integer\\("${column}", \\{ mode: "timestamp" \\}\\)`, "g"));
      expect(occurrences?.length).toBeGreaterThan(0);
    }
    expect(schemaSource).toContain('integer("emailVerified", { mode: "boolean" })');
  });

  it("exports all four model names for adapter discovery", () => {
    expect(schemaSource).toContain("export const authSchema = { user, session, account, verification }");
  });
});
