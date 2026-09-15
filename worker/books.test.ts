import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({ createAuth: vi.fn(), handleAuth: vi.fn() }));
vi.mock("./sync-store", () => ({ handleSync: vi.fn() }));
vi.mock("./ranking", () => ({ tryRankPapers: vi.fn() }));

import worker from "./index";

describe("related books route", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns only real volumes with a cover and ISBN", async () => {
    const upstream = vi.fn(async (_input:string | URL | Request) => Response.json({ items: [{
      id: "volume-1",
      volumeInfo: {
        title: "A Real Book",
        authors: ["A. Author"],
        imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9780000000001" }],
      },
    }] }));
    vi.stubGlobal("fetch", upstream);
    const request = new Request("https://paper-gacha.example/api/books", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keywords: ["machine learning"] }),
    });

    const response = await worker.fetch(request, {} as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ books: [{
      id: "volume-1",
      title: "A Real Book",
      authors: ["A. Author"],
      thumbnail: "https://books.google.com/cover.jpg",
      isbn: "9780000000001",
    }] });
    expect(upstream).toHaveBeenCalledOnce();
    expect(String(upstream.mock.calls[0][0])).toContain("q=machine+learning");
  });

  it("rejects malformed keyword input", async () => {
    const response = await worker.fetch(new Request("https://paper-gacha.example/api/books", {
      method: "POST",
      body: JSON.stringify({ keywords: "not-an-array" }),
    }), {} as never);
    expect(response.status).toBe(400);
  });
});
