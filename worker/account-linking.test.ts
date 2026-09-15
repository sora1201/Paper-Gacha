import { describe, expect, it } from "vitest";
import { accountLinking } from "./account-linking";

describe("Better Auth account linking policy", () => {
  it("regresses account_not_linked for a verified Google identity with the same email", () => {
    expect(accountLinking).toEqual({
      enabled: true,
      trustedProviders: ["google"],
      disableImplicitLinking: false,
      allowDifferentEmails: false,
    });
    expect(accountLinking.trustedProviders).toContain("google");
    expect(accountLinking.disableImplicitLinking).toBe(false);
  });

  it("allows no provider except Google to implicitly link", () => {
    expect(accountLinking.trustedProviders).not.toContain("credential");
    expect(accountLinking.trustedProviders).toHaveLength(1);
  });

  it("does not permit linking identities with different email addresses", () => {
    expect(accountLinking.allowDifferentEmails).toBe(false);
  });
});
