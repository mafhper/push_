import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "node:fs";

const appPackage = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8")) as { version: string };

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
      "@": path.resolve(__dirname, "./src"),
      "@runtime-app": path.resolve(__dirname, "./src/app/LocalApp.tsx"),
    },
  },
});
