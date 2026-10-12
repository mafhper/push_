import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "node:fs";

// Mesmo motivo do `vite.config.ts`: o loader nativo do Vite nao define a global
// de diretorio do CommonJS, e `import.meta.dirname` e a forma ESM equivalente.
const appPackage = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "package.json"), "utf-8")) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __PUSH_RUNTIME_MODE__: JSON.stringify("local"),
    __PUSH_TAURI_BUILD__: JSON.stringify(false),
    __PUSH_APP_VERSION__: JSON.stringify(appPackage.version),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@runtime-app": path.resolve(import.meta.dirname, "./src/app/LocalApp.tsx"),
    },
  },
});
