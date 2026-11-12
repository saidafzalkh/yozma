import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface AuthEnv {
  OAUTH_PROVIDER: OAuthHelpers;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_GITHUB_LOGIN: string;
}

export function isAllowed(login: string, allowed: string): boolean {
  return login.length > 0 && login.toLowerCase() === allowed.toLowerCase();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function redirect(headers: Headers, location: string): Response {
  headers.set("Location", location);
  return new Response(null, { status: 302, headers });
}

export const defaultHandler = {
  // The injected fetch keeps upstream sign-in testable without contacting GitHub.
  async fetch(request: Request, env: AuthEnv, doFetch: typeof fetch = globalThis.fetch): Promise<Response> {
    const url = new URL(request.url);
    const oauth = env.OAUTH_PROVIDER;
    try {
      if (url.pathname === "/authorize" && request.method === "GET") {
        const auth = await oauth.parseAuthRequest(request);
        const details = await oauth.describeConsent(auth);
        const consent = await oauth.beginConsent(auth);
        consent.headers.set("Content-Type", "text/html; charset=utf-8");
        consent.headers.set("Content-Security-Policy", "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
        return new Response(`<!doctype html><html lang="uz"><meta charset="utf-8"><title>Yozma — ruxsat</title><h1>Yozma uçun ruxsat</h1><p>Mijoz: ${escapeHtml(details.clientName)}</p><p>Token manzili: ${escapeHtml(details.redirectHost)}</p><p>Ruxsatlar: ${escapeHtml(details.scope.join(", "))}</p>${details.redirectIsLoopback ? "<p>Bu mahalliy manzil. Uni boşqa dastur ham tinglay olişi mumkin.</p>" : ""}<form method="post" action="/authorize"><input type="hidden" name="handle" value="${escapeHtml(consent.handle)}"><button name="decision" value="approve">Ruxsat beriş</button><button name="decision" value="deny">Rad etiş</button></form></html>`, { headers: consent.headers });
      }
      if (url.pathname === "/authorize" && request.method === "POST") {
        const form = await request.formData();
        const handle = String(form.get("handle") ?? "");
        if (form.get("decision") !== "approve") {
          const denied = await oauth.denyConsent(request, handle);
          return redirect(denied.headers, denied.redirectTo);
        }
        const approved = await oauth.approveConsent(request, handle);
        const upstream = await oauth.beginUpstream(approved.request, { headers: approved.headers });
        const github = new URL("https://github.com/login/oauth/authorize");
        github.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/callback`, scope: "read:user", state: upstream.state }).toString();
        return redirect(upstream.headers, github.href);
      }
      if (url.pathname === "/callback" && request.method === "GET") {
        const resumed = await oauth.finishUpstream(request);
        const code = url.searchParams.get("code");
        if (!code || url.searchParams.has("error")) return new Response("Kiriş bekor qilindi", { status: 400, headers: resumed.headers });
        const tokenResponse = await doFetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${url.origin}/callback` }).toString(),
        });
        if (!tokenResponse.ok) throw new Error("token exchange failed");
        const token: unknown = await tokenResponse.json();
        if (!token || typeof token !== "object" || !("access_token" in token) || typeof token.access_token !== "string" || !token.access_token) throw new Error("missing token");
        const userResponse = await doFetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Yozma-MCP", "X-GitHub-Api-Version": "2022-11-28" } });
        if (!userResponse.ok) throw new Error("user lookup failed");
        const user: unknown = await userResponse.json();
        if (!user || typeof user !== "object" || !("login" in user) || typeof user.login !== "string") throw new Error("missing login");
        const login = user.login;
        if (!isAllowed(login, env.ALLOWED_GITHUB_LOGIN)) return new Response("Ruxsat yöq", { status: 403, headers: resumed.headers });
        const { redirectTo } = await oauth.completeAuthorization({ request: resumed.request, userId: login, metadata: {}, scope: resumed.request.scope, props: { login } });
        return redirect(resumed.headers, redirectTo);
      }
      return new Response("Topilmadi", { status: 404 });
    } catch {
      return new Response("Kirişda xato. Qayta urinib köring.", { status: 400 });
    }
  },
};
