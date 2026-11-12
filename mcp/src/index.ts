import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { env } from "cloudflare:workers";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp/server";
import { defaultHandler, isAllowed, type AuthEnv } from "./auth";
import { createServer, type ToolEnv } from "./server";

interface Env extends AuthEnv, ToolEnv {
  OAUTH_KV: KVNamespace;
  MCP_RESOURCE: string;
}

const bindings = env as unknown as Env;
const mcpHandler = createMcpHandler(() => {
  const login = getMcpAuthContext()?.props.login;
  if (typeof login !== "string" || !isAllowed(login, bindings.ALLOWED_GITHUB_LOGIN)) throw new Error("Ruxsat yöq");
  return createServer(bindings);
});

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler: { fetch: mcpHandler },
  defaultHandler: { fetch: (request, env) => defaultHandler.fetch(request, env) },
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  resourceMetadata: { resource: bindings.MCP_RESOURCE },
});
