import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // mermaid-isomorphic uses import.meta.resolve, which breaks when bundled.
  serverExternalPackages: ["rehype-mermaid", "mermaid-isomorphic", "playwright"],
};

export default nextConfig;
