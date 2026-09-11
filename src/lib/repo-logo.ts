const APP_REPOS = ["push_underline", "project-genesis"];

const ALLOWED_LOGOS_HOSTS = ["github.com", "raw.githubusercontent.com", "githubusercontent.com", "github.io"];

const KNOWN_REPO_LOGOS: Record<string, string> = {
  "mafhper/sonara_hub": "https://mafhper.github.io/sonara_hub/brand/sonara-mark.svg",
  "mafhper/nebula": "https://mafhper.github.io/nebula/logo.png",
  "mafhper/mafhper": "https://mafhper.github.io/logo.svg",
  "mafhper/release-core": "https://raw.githubusercontent.com/mafhper/release-core/main/docs/images/logo/icon-512.png",
};

const rawAssets = [
  "logo.svg",
  "logo.png",
  "Logo.svg",
  "Logo.png",
  "wordmark.svg",
  "wordmark.png",
  "public/logo.svg",
  "public/logo.png",
  "public/favicon.svg",
  "public/favicon.ico",
  "public/favicon.png",
  "assets/logo.svg",
  "assets/logo.png",
  "src/assets/logo.svg",
  "src/assets/logo.png",
  ".github/logo.png",
  "icon.svg",
  "icon.png",
  "Icon.png",
  "brand/logo.svg",
  "brand/logo.png",
  "favicon.svg",
  "favicon.png",
  "apple-touch-icon.png",
];

const docsAssets = [
  "docs/logo.svg",
  "docs/logo.png",
  "docs/brand/logo.svg",
  "docs/brand/logo.png",
  "docs/assets/logo.svg",
  "docs/assets/logo.png",
  "docs/img/logo.png",
  "docs/images/logo/icon-512.png",
  "docs/images/logo/icon.png",
  "docs/images/logo/logo.png",
  "docs/images/logo/logo.svg",
];

const tauriIcons = [
  "src-tauri/icons/icon.png",
  "src-tauri/icons/128x128.png",
  "apps/desktop/src-tauri/icons/icon.png",
  "apps/desktop/src-tauri/icons/128x128.png",
];

const pagesAssets = [
  "logo.svg",
  "logo.png",
  "favicon.svg",
  "favicon.png",
  "favicon.ico",
  "icon.svg",
  "icon.png",
  "apple-touch-icon.png",
  "brand/logo.svg",
  "brand/logo.png",
  "brand/icon.svg",
  "assets/logo.svg",
  "assets/logo.png",
];

export function buildAvatarCandidates(owner: string, repo: string, defaultBranch: string): string[] {
  const repoKey = `${owner}/${repo}`.toLowerCase();
  if (APP_REPOS.includes(repo.toLowerCase())) return ["/favicon.svg"];

  const knownLogo = KNOWN_REPO_LOGOS[repoKey];
  if (knownLogo && isAllowedLogoUrl(knownLogo)) {
    return [knownLogo];
  }

  const encode = (value: string) => encodeURIComponent(value).replace(/%2F/gi, "/");
  const safeOwner = encode(owner);
  const safeRepo = encode(repo);
  const safeBranch = encode(defaultBranch);
  const isProfile = owner.toLowerCase() === repo.toLowerCase();

  const rawBase = `https://raw.githubusercontent.com/${safeOwner}/${safeRepo}/${safeBranch}`;
  const pagesBase = `https://${safeOwner}.github.io/${safeRepo}`;

  const candidates: string[] = [];

  for (const asset of [...rawAssets, ...docsAssets, ...tauriIcons]) {
    candidates.push(`${rawBase}/${asset}`);
  }

  for (const asset of pagesAssets) {
    candidates.push(`${pagesBase}/${asset}`);
    if (isProfile) {
      candidates.push(`https://${safeOwner}.github.io/${asset}`);
    }
  }

  return candidates;
}

function isAllowedLogoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_LOGOS_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function repoInitials(name: string): string {
  const chars = (value: string) => Array.from(value);
  const words = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return chars(words[0]).slice(0, 2).join("").toUpperCase();
  return words.slice(0, 2).map((word) => chars(word)[0]).join("").toUpperCase();
}

const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico)(?:\?|#|$)/i;
const LOGO_HINT_RE = /logo|icon|mark|brand|symbol/;
export const PAGES_ASSET_LIMIT = 6;

function repoPathPrefix(baseUrl: string): string {
  try {
    const pathname = new URL(baseUrl).pathname;
    if (!pathname || pathname === "/") return "/";
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  } catch {
    return "/";
  }
}

export function extractPagesAssets(html: string, pageUrl: string): string[] {
  const pageHost = (() => {
    try {
      return new URL(pageUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  const urls = new Set<string>();
  const siteRoot = repoPathPrefix(pageUrl);
  const add = (raw: string) => {
    try {
      const resolved = new URL(raw, pageUrl);
      if (resolved.protocol !== "https:") return;
      if (resolved.hostname.toLowerCase() !== pageHost) return;
      if (siteRoot !== "/" && !resolved.pathname.startsWith(siteRoot)) return;
      urls.add(resolved.href);
    } catch {
      // Ignore malformed references from the page.
    }
  };

  const linkRe = /<link\b[^>]*>/gi;
  for (const tag of html.matchAll(linkRe)) {
    if (!/\brel=["']?(?:icon|shortcut icon|apple-touch-icon)["']?/i.test(tag[0])) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(tag[0]);
    if (href) add(href[1]);
  }

  const metaRe = /<meta\b[^>]*>/gi;
  for (const tag of html.matchAll(metaRe)) {
    const property = /\b(?:property|name)=["']([^"']+)["']/i.exec(tag[0])?.[1] ?? "";
    if (!/^(?:og:image|twitter:image)$/i.test(property.trim())) continue;
    const content = /\bcontent=["']([^"']+)["']/i.exec(tag[0]);
    if (content) add(content[1]);
  }

  const assetRe = /(?:src|href)=["']([^"']+)["']/gi;
  for (const tag of html.matchAll(assetRe)) {
    const url = tag[1];
    if (!IMAGE_EXT_RE.test(url)) continue;
    if (!/assets\//i.test(url)) continue;
    add(url);
  }

  const score = (url: string): number => {
    let value = 0;
    if (/favicon/i.test(url)) value += 50;
    else if (LOGO_HINT_RE.test(url)) value -= 200;
    if (/\/assets\//i.test(url)) value -= 100;
    if (!IMAGE_EXT_RE.test(url)) value += 500;
    return value;
  };

  return Array.from(urls)
    .sort((left, right) => score(left) - score(right))
    .slice(0, PAGES_ASSET_LIMIT);
}

export async function probePagesAssets(owner: string, repo: string): Promise<string[]> {
  const isProfile = owner.toLowerCase() === repo.toLowerCase();
  const siteUrls = [
    ...(isProfile ? [`https://${owner.toLowerCase()}.github.io/`] : []),
    `https://${owner.toLowerCase()}.github.io/${encodeURIComponent(repo)}/`,
  ];

  const found: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      found.push(url);
    }
  };

  for (const siteUrl of siteUrls) {
    if (seen.has(siteUrl)) continue;
    seen.add(siteUrl);

    let html: string;
    try {
      const response = await fetch(siteUrl, { headers: { Accept: "text/html" } });
      if (!response.ok) continue;
      html = await response.text();
    } catch {
      continue;
    }

    for (const candidate of extractPagesAssets(html, siteUrl)) push(candidate);

    const queue = collectBundleChunks(html, siteUrl);
    const visited = new Set<string>([siteUrl]);
    let modulesFetched = 0;
    while (queue.length > 0 && found.length < PAGES_ASSET_LIMIT && modulesFetched < MODULE_LIMIT) {
      const chunkUrl = queue.shift()!;
      if (visited.has(chunkUrl)) continue;
      visited.add(chunkUrl);
      modulesFetched += 1;
      try {
        const chunkResponse = await fetch(chunkUrl, { headers: { Accept: "*/*" } });
        if (!chunkResponse.ok) continue;
        const text = await chunkResponse.text();
        for (const candidate of scanBundleAssets(text, siteUrl)) push(candidate);
        for (const child of collectBundleChunks(text, siteUrl)) {
          if (!visited.has(child) && !queue.includes(child)) queue.push(child);
        }
      } catch {
        // A unreachable module must not block logo discovery.
      }
      queue.sort((left, right) => chunkPriority(left) - chunkPriority(right));
    }
  }

  return found
    .sort((left, right) => sizeRank(right) - sizeRank(left))
    .slice(0, PAGES_ASSET_LIMIT);
}

const MODULE_LIMIT = 6;
const HOME_CHUNK_HINT_RE = /(?:home|inicio|landing|main|root|index|logo)/i;

function chunkPriority(url: string): number {
  if (/\.css(?:\?|$)/i.test(url)) return 0;
  if (HOME_CHUNK_HINT_RE.test(url)) return 0;
  return 1;
}

function sizeRank(url: string): number {
  const match = /-(\d{3,4})-/i.exec(url);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function collectBundleChunks(text: string, baseUrl: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const baseHost = new URL(baseUrl).hostname.toLowerCase();
  const siteRoot = repoPathPrefix(baseUrl);
  const chunkRe = /["'`]([^"'`]+\.(?:mjs|js|css)(?:\?[^"'`]*)?)["'`]/gi;
  for (const match of text.matchAll(chunkRe)) {
    const raw = match[1];
    if (raw.startsWith("data:") || raw.startsWith("http")) continue;
    try {
      const resolved = new URL(raw, baseUrl);
      if (resolved.protocol !== "https:") continue;
      if (resolved.hostname.toLowerCase() !== baseHost) continue;
      if (siteRoot !== "/" && !resolved.pathname.startsWith(siteRoot)) continue;
      if (seen.has(resolved.href)) continue;
      seen.add(resolved.href);
      result.push(resolved.href);
    } catch {
      // Skip malformed module references.
    }
  }
  return result;
}

export function scanBundleAssets(text: string, baseUrl: string): string[] {
  const baseHost = new URL(baseUrl).hostname.toLowerCase();
  const siteRoot = repoPathPrefix(baseUrl);
  const urls = new Set<string>();
  const add = (raw: string) => {
    try {
      const resolved = new URL(raw, baseUrl);
      if (resolved.protocol !== "https:") return;
      if (resolved.hostname.toLowerCase() !== baseHost) return;
      if (siteRoot !== "/" && !resolved.pathname.startsWith(siteRoot)) return;
      urls.add(resolved.href);
    } catch {
      // Ignore malformed references from the bundle.
    }
  };

  const imageUrlRe = /["'`(]([^"'`()]+\.(?:png|jpe?g|gif|svg|webp|avif|ico))["'`)]/gi;
  for (const match of text.matchAll(imageUrlRe)) {
    if (!/assets\//i.test(match[1])) continue;
    add(match[1]);
  }

  return Array.from(urls);
}