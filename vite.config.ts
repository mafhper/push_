import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import crypto from "node:crypto";

function resolveBasePath(env: Record<string, string>) {
  const explicitBase = env.VITE_SITE_BASE_PATH?.trim();
  if (explicitBase) return explicitBase;

  if (env.GITHUB_ACTIONS === "true" && env.GITHUB_REPOSITORY) {
    const repoName = env.GITHUB_REPOSITORY.split("/")[1];
    return repoName ? `/${repoName}/` : "/";
  }
  return "/";
}

function createPagesFallbackPlugin(basePath: string) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const redirectScript = [
    "(function () {",
    `  var base = ${JSON.stringify(normalizedBase)};`,
    "  var target = window.location.pathname + window.location.search + window.location.hash;",
    '  sessionStorage.setItem("push_redirect", target);',
    "  window.location.replace(base);",
    "})();",
  ].join("\n");
  const scriptHash = crypto.createHash("sha256").update(redirectScript).digest("base64");
  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    "    <title>Push_ redirect</title>",
    `    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; script-src 'self' 'sha256-${scriptHash}'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https: blob:; font-src 'self' data:" />`,
    '    <meta name="referrer" content="strict-origin-when-cross-origin" />',
    "  </head>",
    "  <body>",
    `    <script>${redirectScript}</script>`,
    "  </body>",
    "</html>",
  ].join("\n");

  return {
    name: "push-pages-fallback",
    apply: "build" as const,
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "404.html",
        source: html,
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const basePath = resolveBasePath(env);
  const runtimeAppPath =
    command === "serve" || mode === "development"
      ? path.resolve(__dirname, "./src/app/LocalApp.tsx")
      : path.resolve(__dirname, "./src/app/PublicApp.tsx");

  return {
    base: basePath,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), createPagesFallbackPlugin(basePath)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@runtime-app": runtimeAppPath,
      },
    },
  };
});
