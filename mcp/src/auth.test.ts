import { describe, expect, it, vi } from "vitest";
import { defaultHandler, isAllowed, type AuthEnv } from "./auth";

describe("isAllowed", () => {
  it("compares GitHub logins without case sensitivity", () => {
    expect(isAllowed("Saidafzalkh", "saidafzalkh")).toBe(true);
    expect(isAllowed("foreign", "saidafzalkh")).toBe(false);
    expect(isAllowed("", "saidafzalkh")).toBe(false);
  });
});

function setup(login: string) {
  const original = { clientId: "client", redirectUri: "https://client.test/callback", scope: ["write"], state: "client-state", responseType: "code" };
  const completeAuthorization = vi.fn().mockResolvedValue({ redirectTo: "https://client.test/done" });
  const finishUpstream = vi.fn().mockResolvedValue({ request: original, data: {}, headers: new Headers() });
  const env: AuthEnv = {
    GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret", ALLOWED_GITHUB_LOGIN: "saidafzalkh",
    OAUTH_PROVIDER: { finishUpstream, completeAuthorization } as unknown as AuthEnv["OAUTH_PROVIDER"],
  };
  const fetch = vi.fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({ access_token: "upstream-token" }))
    .mockResolvedValueOnce(Response.json({ login }));
  return { env, fetch, completeAuthorization, finishUpstream };
}

describe("GitHub callback", () => {
  it("rejects foreign login before completing authorization", async () => {
    const s = setup("foreign");
    const res = await defaultHandler.fetch(new Request("https://mcp.test/callback?code=code&state=state"), s.env, s.fetch);
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Ruxsat yöq");
    expect(s.completeAuthorization).not.toHaveBeenCalled();
    expect(s.finishUpstream).toHaveBeenCalled();
    expect(s.fetch).toHaveBeenCalledTimes(2);
  });
  it("completes authorization with only the allowed login as props", async () => {
    const s = setup("Saidafzalkh");
    const res = await defaultHandler.fetch(new Request("https://mcp.test/callback?code=code&state=state"), s.env, s.fetch);
    expect(res.status).toBe(302);
    expect(s.completeAuthorization).toHaveBeenCalledWith(expect.objectContaining({ userId: "Saidafzalkh", props: { login: "Saidafzalkh" } }));
  });
  it("does not exchange a code if upstream state validation fails", async () => {
    const s = setup("saidafzalkh");
    s.finishUpstream.mockRejectedValue(new Error("bad state"));
    expect((await defaultHandler.fetch(new Request("https://mcp.test/callback?code=x"), s.env, s.fetch)).status).toBe(400);
    expect(s.fetch).not.toHaveBeenCalled();
    expect(s.completeAuthorization).not.toHaveBeenCalled();
  });
  it("fails closed on GitHub errors", async () => {
    const s = setup("saidafzalkh");
    s.fetch.mockReset().mockResolvedValue(Response.json({ error: "bad_verification_code" }));
    expect((await defaultHandler.fetch(new Request("https://mcp.test/callback?code=x"), s.env, s.fetch)).status).toBe(400);
    expect(s.completeAuthorization).not.toHaveBeenCalled();
  });
});
