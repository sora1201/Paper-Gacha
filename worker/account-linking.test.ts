import { describe, expect, it } from "vitest";
import { accountLinking } from "./account-linking";

describe("Better Auth account linking policy", () => {
  it("regresses account_not_linked for a verified Google identity with the same email", () => {
    expect(accountLinking).toEqual({
      enabled: true,
      trustedProviders: ["google"],
      disableImplicitLinking: false,
      allowDifferentEmails: false,
      requireLocalEmailVerified: false,
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

  it("allows a matching verified Google email to link to an unverified local account", () => {
    const localAccount = { email: "reader@example.test", emailVerified: false };
    const googleProfile = { provider: "google", email: "reader@example.test", emailVerified: true } as const;
    const sameEmail = localAccount.email === googleProfile.email;
    const trustedVerifiedProvider = accountLinking.trustedProviders.includes(googleProfile.provider) && googleProfile.emailVerified;

    expect(localAccount.emailVerified).toBe(false);
    expect(accountLinking.requireLocalEmailVerified).toBe(false);
    expect(sameEmail && trustedVerifiedProvider).toBe(true);
  });

  it("still rejects a verified Google identity with a different email", () => {
    const localEmail: string = "reader@example.test";
    const googleEmail: string = "someone-else@example.test";
    expect(localEmail === googleEmail || accountLinking.allowDifferentEmails).toBe(false);
  });
});
