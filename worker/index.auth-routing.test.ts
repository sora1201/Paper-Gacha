import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAuth: vi.fn(),
  handleAuth: vi.fn(),
}));

vi.mock("./auth", () => mocks);

import worker from "./index";

describe("Worker auth routing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes the real Google callback path to handleAuth before SPA assets", async () => {
    const assetsFetch = vi.fn(async () => new Response("SPA", { status: 200, headers: { "content-type": "text/html" } }));
    mocks.handleAuth.mockResolvedValue(new Response(null, {
      status: 302,
      headers: {
        location: "https://paper-gacha.sora-yamada.workers.dev/settings",
        "set-cookie": "better-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=Lax",
      },
    }));
    const env = { ASSETS: { fetch: assetsFetch } } as never;
    const request = new Request("https://paper-gacha.sora-yamada.workers.dev/api/auth/callback/google");

    const response = await worker.fetch(request, env);

    expect(mocks.handleAuth).toHaveBeenCalledOnce();
    expect(mocks.handleAuth).toHaveBeenCalledWith(request, env);
    expect(assetsFetch).not.toHaveBeenCalled();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://paper-gacha.sora-yamada.workers.dev/settings");
    expect(response.headers.get("set-cookie")).toContain("Path=/; HttpOnly; Secure; SameSite=Lax");
  });
});
