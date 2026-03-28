import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const projectRoot = process.cwd();

export function readText(relativePath) {
  return readFileSync(path.resolve(projectRoot, relativePath), "utf8");
}

export function walk(directory, include = () => true) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath, include);
    }
    return include(fullPath) ? [fullPath] : [];
  });
}

export function toRelative(filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}

export function failIfAny(errors) {
  if (errors.length === 0) return;
  throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);
}

export function extractFlatEntries(relativePath) {
  const text = readText(relativePath);
  const matches = [...text.matchAll(/^\s{2}([A-Za-z0-9]+):\s*(.+),?$/gm)];
  return new Map(matches.map(([, key, value]) => [key, value.trim()]));
}

export function extractKeys(relativePath) {
  return [...extractFlatEntries(relativePath).keys()];
}

export function ensureNoPattern({ filePath, pattern, label, errors }) {
  const text = readFileSync(filePath, "utf8");
  if (pattern.test(text)) {
    errors.push(`${toRelative(filePath)} contains ${label}`);
  }
}
