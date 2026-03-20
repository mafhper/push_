import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function resolveBasePath() {
  if (process.env.VITE_SITE_BASE_PATH) return process.env.VITE_SITE_BASE_PATH;
  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY) {
    const repoName = process.env.GITHUB_REPOSITORY.split("/")[1];
    return repoName ? `/${repoName}/` : "/";
  }
  return "/";
}

export default defineConfig(({ command, mode }) => {
  const runtimeAppPath =
    command === "serve" || mode === "development"
      ? path.resolve(__dirname, "./src/app/LocalApp.tsx")
      : path.resolve(__dirname, "./src/app/PublicApp.tsx");

  return {
    base: resolveBasePath(),
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@runtime-app": runtimeAppPath,
      },
    },
  };
});
