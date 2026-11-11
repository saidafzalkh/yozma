import { describe, expect, it, vi } from "vitest";
import { checkUzbek, proofreadOld } from "./tahrirchi";

type Body = { nodes: { offset: number; fields: { value: string; markup: boolean }[] }[]; ws: number };

function okFetch(respond: (value: string) => unknown[]) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Body;
    const value = body.nodes[0].fields[0].value;
    return new Response(JSON.stringify({ action: "SUGGESTIONS", data: respond(value) }), { status: 200 });
  });
}

describe("proofreadOld", () => {
  it("sends raw Authorization key and ws:1", async () => {
    const f = okFetch(() => []);
    await proofreadOld("salom", { apiKey: "KEY", fetch: f as unknown as typeof fetch });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://websocket.tahrirchi.uz/proofread");
    expect((init?.headers as Record<string, string>).Authorization).toBe("KEY");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    const body = JSON.parse(String(init?.body)) as Body;
    expect(body.ws).toBe(1);
    expect(body.nodes[0].fields[0]).toEqual({ value: "salom", markup: false });
  });

  it("splits 12000 chars on paragraphs and shifts offsets", async () => {
    const para = "a".repeat(2999);
    const text = Array.from({ length: 4 }, () => para).join("\n\n"); // ~12000
    const f = okFetch(() => [{ offset: 1, length: 2, token: "aa", type: "x", corrections: ["b"] }]);
    const res = await proofreadOld(text, { apiKey: "K", fetch: f as unknown as typeof fetch });
    expect(f.mock.calls.length).toBeGreaterThanOrEqual(3);
    const sent = f.mock.calls.map((c) => (JSON.parse(String(c[1]?.body)) as Body).nodes[0].fields[0].value);
    for (const s of sent) expect(s.length).toBeLessThanOrEqual(5000);
    // second chunk starts after the first chunk and its "\n\n" separator
    expect(res[1].offset).toBe(sent[0].length + 2 + 1);
    expect(res[0].offset).toBe(1);
  });

  it("splits a single oversized paragraph on whitespace", async () => {
    const text = Array.from({ length: 1500 }, () => "word").join(" ");
    const f = okFetch(() => []);
    await proofreadOld(text, { apiKey: "K", fetch: f as unknown as typeof fetch });
    expect(f.mock.calls.length).toBeGreaterThanOrEqual(2);
    for (const c of f.mock.calls) {
      expect((JSON.parse(String(c[1]?.body)) as Body).nodes[0].fields[0].value.length).toBeLessThanOrEqual(5000);
    }
  });

  it("throws the API message on HTTP 4xx", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ message: "bad key" }), { status: 401 }));
    await expect(proofreadOld("x", { apiKey: "K", fetch: f as unknown as typeof fetch })).rejects.toThrow("bad key");
  });
});

describe("checkUzbek", () => {
  it("maps old-alphabet offsets back to the new-alphabet markdown", async () => {
    const md = "Salom.\n\nBu şahr katta.\n";
    const f = okFetch((v) => {
      const i = v.indexOf("shahr");
      return i < 0 ? [] : [{ offset: i, length: 5, token: "shahr", type: "spelling", corrections: ["shahar"] }];
    });
    const res = await checkUzbek(md, { apiKey: "K", fetch: f as unknown as typeof fetch });
    expect(res).toHaveLength(1);
    expect(res[0].offset).toBe(md.indexOf("şahr"));
    expect(res[0].length).toBe(4);
    expect(md.slice(res[0].offset, res[0].offset + res[0].length)).toBe("şahr");
    expect(res[0].oldToken).toBe("shahr");
  });

  it("does not send protected segments", async () => {
    const f = okFetch(() => []);
    await checkUzbek("---\ntitle: x\n---\n\n```\ncode\n```\n", { apiKey: "K", fetch: f as unknown as typeof fetch });
    for (const c of f.mock.calls) {
      const v = (JSON.parse(String(c[1]?.body)) as Body).nodes[0].fields[0].value;
      expect(v).not.toContain("code");
      expect(v).not.toContain("title");
    }
  });

  it("maps a token in a later chunk to the right word of the source", async () => {
    const md = `${"a".repeat(4990)}\n\nBu şahr katta.\n`;
    const f = okFetch((v) => {
      const i = v.indexOf("shahr");
      return i < 0 ? [] : [{ offset: i, length: 5, token: "shahr", type: "x", corrections: [] }];
    });
    const res = await checkUzbek(md, { apiKey: "K", fetch: f as unknown as typeof fetch });
    expect(f.mock.calls.length).toBe(2);
    expect(res).toHaveLength(1);
    expect(md.slice(res[0].offset, res[0].offset + res[0].length)).toBe("şahr");
  });
});
