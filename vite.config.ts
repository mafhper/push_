import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { assertPortFree } from "./scripts/sonda-porta.ts";

const appPackage = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8")) as { version: string };

// Contrato em tres arquivos: `src-tauri/tauri.conf.json` (`devUrl`),
// `playwright.config.ts` (`baseURL`) e este `vite.config.ts`. Mover uma sem as
// outras quebra em silencio. A porta e nomeada (fora de 5173-5175) para nao
// disputar a faixa de incremento do Vite com o resto da frota.
const DEV_PORT = 5300;

function resolveBasePath(env: Record<string, string>) {
  const explicitBase = env.VITE_SITE_BASE_PATH?.trim();
  if (explicitBase) return explicitBase;

  if (env.GITHUB_ACTIONS === "true" && env.GITHUB_REPOSITORY) {
    const repoName = env.GITHUB_REPOSITORY.split("/")[1];
    return repoName ? `/${repoName}/` : "/";
  }
  return "/";
}

function createPagesFallbackPlugin(basePath: string): Plugin {
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
    "    <title>push_ redirect</title>",
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

export default defineConfig(async ({ command, mode, isPreview }) => {
  const env = loadEnv(mode, __dirname, "");
  const isTauriBuild = Boolean(env.TAURI_ENV_PLATFORM);
  const isLocalRuntime = command === "serve" || mode === "development" || isTauriBuild;
  const basePath = isTauriBuild ? "/" : resolveBasePath(env);
  const runtimeAppPath = isLocalRuntime
    ? path.resolve(__dirname, "./src/app/LocalApp.tsx")
    : path.resolve(__dirname, "./src/app/PublicApp.tsx");

  // A porta 5300 e CONTRATO, nao preferencia: o `devUrl` do tauri.conf.json e o
  // `baseURL` do Playwright apontam para ela. Por isso o host `::` nao pode
  // realocar — o Tauri abriria uma janela em branco.
  //
  // E `strictPort: true` sozinho NAO bastaria: ele so dispara quando o bind
  // falha, e com host nao-loopback o bind NAO falha mesmo com `127.0.0.1:5300`
  // ocupado (medido em 2026-09-30 no icon-core e em 2026-10-01 para `::`).
  // A unica defesa e sondar o loopback ANTES do bind.
  //
  // So no `serve`, e nunca no `preview`: no `build` a porta nao existe, e a CI
  // roda build. Mas `vite preview` TAMBEM e `command === "serve"` — e o preview
  // sobe em 4173, nao em 5300, entao a 5300 nao e contrato dele e nao deve
  // reprovar por causa dela. `isPreview` separa os dois.
  if (command === "serve" && !isPreview) {
    await assertPortFree(DEV_PORT);
  }

  return {
    base: basePath,
    define: {
      __PUSH_RUNTIME_MODE__: JSON.stringify(isLocalRuntime ? "local" : "public"),
      __PUSH_TAURI_BUILD__: JSON.stringify(isTauriBuild),
      __PUSH_APP_VERSION__: JSON.stringify(appPackage.version),
    },
    server: {
      // `::` e IPv6-only no Windows: `127.0.0.1:5300` da ECONNRESET enquanto
      // `[::1]:5300` responde 200 (medido em 2026-10-01, ver
      // `.dev/scripts/medir-host-alcance.mjs`). O Playwright e o `devUrl` do
      // Tauri usam `localhost`, que resolve para o lado IPv6 e funciona — mas
      // qualquer pessoa que digite `127.0.0.1:5300` nao conecta, e essa e a
      // URL que a documentacao da frota usa.
      //
      // **O motivo do `::` nao esta documentado** — nem no README, nem no
      // AGENTS.md, e o `git log -S` nao acha o commit que o introduziu. Entao
      // ele esta aqui por costume, nao por decisao registrada. Decidir e
      // trabalho do dono: `::` so faz sentido se o servidor precise ser
      // alcancado por IPv6. Se nao precisa, `0.0.0.0` aceita os dois lados e
      // remove o sintoma.
      host: "::",
      port: DEV_PORT,
      // A sonda acima ja reprovou a corrida; isto cobre o bind que acontecer
      // DEPOIS dela.
      strictPort: true,
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
