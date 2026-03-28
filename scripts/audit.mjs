import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const skipPrechecks = process.argv.includes("--skip-prechecks");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function walkFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return walkFiles(fullPath);
    }
    return [fullPath];
  });
}

function assertBuildFreeOfSecretsAndLocalAuth() {
  const distDirectory = path.resolve("dist");
  if (!existsSync(distDirectory)) {
    throw new Error("Build output directory not found.");
  }

  const files = walkFiles(distDirectory);
  const combined = files
    .filter((file) => /\.(html|js|css|json|txt)$/.test(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  const blockedPatterns = [
    { pattern: /ghp_[A-Za-z0-9_]+/g, label: "GitHub classic PAT prefix" },
    { pattern: /github_pat_[A-Za-z0-9_]+/g, label: "GitHub fine-grained PAT prefix" },
    { pattern: /Authorization:\s*Bearer/g, label: "Authorization bearer header" },
    { pattern: /document\.cookie/g, label: "cookie access" },
    { pattern: /GH_STATS_TOKEN/g, label: "snapshot token environment variable" },
  ];

  const matches = blockedPatterns
    .filter(({ pattern }) => pattern.test(combined))
    .map(({ label }) => label);

  if (matches.length > 0) {
    throw new Error(`Public build contains blocked runtime markers: ${matches.join(", ")}`);
  }
}

if (!skipPrechecks) {
  run("npm", ["run", "lint"]);
  run("npm", ["run", "type-check"]);
  run("npm", ["run", "test:ci"]);
  run("npm", ["run", "validate:i18n"]);
  run("npm", ["run", "validate:docs"]);
  run("npm", ["run", "validate:security"]);
  run("npm", ["run", "validate:patterns"]);
}

run("npm", ["run", "build"]);
assertBuildFreeOfSecretsAndLocalAuth();
