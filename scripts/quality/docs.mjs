import path from "node:path";
import { existsSync } from "node:fs";
import { failIfAny, readText } from "./common.mjs";

const readmes = ["README.md", "README.pt-BR.md", "README.es.md"];
const errors = [];

for (const readme of readmes) {
  if (!existsSync(path.resolve(readme))) {
    errors.push(`Missing ${readme}`);
    continue;
  }

  const text = readText(readme);
  for (const linkedReadme of readmes) {
    if (!text.includes(linkedReadme)) {
      errors.push(`${readme} must link to ${linkedReadme}`);
    }
  }

  if (/\bbun\s+(install|run)\b/i.test(text)) {
    errors.push(`${readme} still references Bun as an official workflow`);
  }
}

const packageJson = JSON.parse(readText("package.json"));
const scripts = new Set(Object.keys(packageJson.scripts ?? {}));

for (const readme of readmes) {
  const text = readText(readme);
  for (const match of text.matchAll(/npm run ([a-z0-9:-]+)/gi)) {
    const scriptName = match[1];
    if (!scripts.has(scriptName)) {
      errors.push(`${readme} references missing npm script "${scriptName}"`);
    }
  }
}

failIfAny(errors);
