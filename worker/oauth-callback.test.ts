import { describe, expect, it } from "vitest";
import { normalizeGoogleCallbackResponse, oauthSettingsUrl } from "./oauth-callback";

const callback = new Request("https://paper-gacha.sora-yamada.workers.dev/api/auth/callback/google");
const origin = "https://paper-gacha.sora-yamada.workers.dev";

describe("Google OAuth callback", () => {
  it("keeps Better Auth's successful settings redirect and session cookie", () => {
    const source = new Response(null, { status: 302, headers: {
      location: `${origin}/settings`,
      "set-cookie": "better-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=Lax",
    } });
    const response = normalizeGoogleCallbackResponse(callback, source, origin);
    expect(response.headers.get("location")).toBe(`${origin}/settings`);
    expect(response.headers.get("set-cookie")).toContain("Path=/; HttpOnly; Secure; SameSite=Lax");
  });

  it("turns a successful non-redirect callback response into /settings", () => {
    const source = new Response("ok", { headers: { "set-cookie": "better-auth.session_token=; Path=/" } });
    const response = normalizeGoogleCallbackResponse(callback, source, origin);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${origin}/settings`);
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=");
  });

  it("sends callback errors and unsafe redirect targets back to settings", () => {
    const response = normalizeGoogleCallbackResponse(callback, Response.redirect("https://example.test/error"), origin);
    expect(response.headers.get("location")).toBe(oauthSettingsUrl(origin, "oauth_callback_failed"));
  });

  it("does not change non-callback auth responses", () => {
    const request = new Request(`${origin}/api/auth/get-session`);
    const source = Response.json({ user: { id: "1" } });
    expect(normalizeGoogleCallbackResponse(request, source, origin)).toBe(source);
  });
});
