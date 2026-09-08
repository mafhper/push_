import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import util from "util";
import { assertAlignedVersions } from "./release-version.mjs";

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

async function updateTauriConfig(newVersion) {
  const tauriConfigPath = path.join(__dirname, "..", "src-tauri", "tauri.conf.json");
  try {
    const content = await fs.readFile(tauriConfigPath, "utf8");
    const config = JSON.parse(content);
    config.version = newVersion;
    config.productName = "Push";
    if (Array.isArray(config.app?.windows) && config.app.windows[0]) {
      config.app.windows[0].title = "Push_";
    }
    await fs.writeFile(tauriConfigPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`${COLORS.green}✔ Updated tauri.conf.json to version ${newVersion}${COLORS.reset}`);
  } catch (err) {
    console.error(`${COLORS.red}✘ Failed to update tauri.conf.json${COLORS.reset}`, err);
    process.exit(1);
  }
}

async function updateCargoVersion(newVersion) {
  const cargoPath = path.join(__dirname, "..", "src-tauri", "Cargo.toml");
  try {
    let content = await fs.readFile(cargoPath, "utf8");
    content = content.replace(/^version\s*=\s*".*"$/m, `version = "${newVersion}"`);
    await fs.writeFile(cargoPath, content);
    console.log(`${COLORS.green}✔ Updated Cargo.toml to version ${newVersion}${COLORS.reset}`);
  } catch (err) {
    console.error(`${COLORS.red}✘ Failed to update Cargo.toml${COLORS.reset}`, err);
    process.exit(1);
  }
}

async function updatePackageJson(type) {
  try {
    await execAsync(`npm version ${type} --no-git-tag-version`);
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkgData = JSON.parse(await fs.readFile(pkgPath, "utf8"));
    return pkgData.version;
  } catch (err) {
    console.error(`${COLORS.red}✘ Failed to update package.json${COLORS.reset}`, err);
    process.exit(1);
  }
}

async function readCurrentVersions() {
  const packagePath = path.join(__dirname, "..", "package.json");
  const tauriConfigPath = path.join(__dirname, "..", "src-tauri", "tauri.conf.json");
  const cargoPath = path.join(__dirname, "..", "src-tauri", "Cargo.toml");

  const [packageContent, tauriContent, cargoContent] = await Promise.all([
    fs.readFile(packagePath, "utf8"),
    fs.readFile(tauriConfigPath, "utf8"),
    fs.readFile(cargoPath, "utf8"),
  ]);

  const packageVersion = JSON.parse(packageContent).version;
  const tauriVersion = JSON.parse(tauriContent).version;
  const cargoVersion = cargoContent.match(/^version\s*=\s*"([^"]+)"$/m)?.[1];
  if (!packageVersion || !tauriVersion || !cargoVersion) {
    throw new Error("Could not read every desktop version before release.");
  }

  return {
    "package.json": packageVersion,
    "tauri.conf.json": tauriVersion,
    "Cargo.toml": cargoVersion,
  };
}

async function updateChangeLog(version) {
  const logPath = path.join(__dirname, "..", "docs", "plan", "change.log");
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "/");
  const newEntry = `\n[${date} - v${version}]\nReleased version v${version}.\n`;

  try {
    const content = await fs.readFile(logPath, "utf8");
    await fs.writeFile(logPath, newEntry + content);
    console.log(`${COLORS.green}✔ Prepended to docs/plan/change.log${COLORS.reset}`);
  } catch {
    console.warn(`${COLORS.yellow}⚠ Could not update change.log (file might not exist)${COLORS.reset}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0] || "patch";

  if (!["patch", "minor", "major"].includes(type)) {
    console.error(`${COLORS.red}Invalid version type. Use: patch, minor, or major${COLORS.reset}`);
    process.exit(1);
  }

  console.log(`${COLORS.bold}🚀 Automating Release: ${type}${COLORS.reset}\n`);

  const currentVersions = await readCurrentVersions();
  const currentVersion = assertAlignedVersions(currentVersions);
  console.log(`${COLORS.green}✔ Desktop versions aligned at ${currentVersion}${COLORS.reset}`);

  const newVersion = await updatePackageJson(type);
  console.log(`${COLORS.green}✔ package.json updated to ${newVersion}${COLORS.reset}`);

  await updateTauriConfig(newVersion);
  await updateCargoVersion(newVersion);
  await updateChangeLog(newVersion);

  console.log(`\n${COLORS.bold}Next Steps:${COLORS.reset}`);
  console.log(`1. Review changes in ${COLORS.yellow}docs/plan/change.log${COLORS.reset}`);
  console.log(`2. Commit changes: ${COLORS.yellow}git add . && git commit -m "chore: release v${newVersion}"${COLORS.reset}`);
  console.log(`3. Tag release: ${COLORS.yellow}git tag v${newVersion}${COLORS.reset}`);
  console.log(`4. Push: ${COLORS.yellow}git push && git push --tags${COLORS.reset}`);
  console.log(`\n${COLORS.dim}Note: publish the release by pushing the version tag to GitHub.${COLORS.reset}`);
}

main();