import { describe, expect, it } from "vitest";
import { googleSignInPayload } from "./auth";

describe("Google sign-in request", () => {
  it("always sends the same-origin settings success and error callbacks", () => {
    expect(googleSignInPayload("https://paper-gacha.sora-yamada.workers.dev")).toEqual({
      provider: "google",
      callbackURL: "https://paper-gacha.sora-yamada.workers.dev/settings",
      errorCallbackURL: "https://paper-gacha.sora-yamada.workers.dev/settings?authError=oauth_sign_in_failed",
    });
  });
});
