import { Image as ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LANGUAGE_COLORS } from "@/types";
import { cn } from "@/lib/utils";

const CACHE_PREFIX = "gl_repo_logo:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type LogoCacheEntry = {
  url: string | null;
  checkedAt: number;
};

interface RepoLogoProps {
  owner: string;
  repo: string;
  defaultBranch: string;
  language?: string | null;
  className?: string;
}

export function RepoLogo({ owner, repo, defaultBranch, language, className }: RepoLogoProps) {
  const cacheKey = `${CACHE_PREFIX}${owner}/${repo}/${defaultBranch}`;
  const candidates = useMemo(() => buildLogoCandidates(owner, repo, defaultBranch), [owner, repo, defaultBranch]);
  const [index, setIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(() => readCachedLogo(cacheKey));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
    setSrc(readCachedLogo(cacheKey) ?? candidates[0] ?? null);
  }, [cacheKey, candidates]);

  function handleLoad() {
    writeLogoCache(cacheKey, src);
  }

  function handleError() {
    const nextIndex = index + 1;
    const next = candidates[nextIndex];
    if (next) {
      setIndex(nextIndex);
      setSrc(next);
      return;
    }

    writeLogoCache(cacheKey, null);
    setFailed(true);
    setSrc(null);
  }

  if (!src || failed) {
    const color = language && LANGUAGE_COLORS[language] ? LANGUAGE_COLORS[language] : "hsl(var(--primary))";
    return (
      <span
        aria-hidden="true"
        className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-surface-2", className)}
        style={{ borderColor: `${color}55`, color }}
      >
        <ImageIcon size={16} strokeWidth={1.7} />
      </span>
    );
  }

  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-surface-2", className)}>
      <img src={src} alt="" className="h-[72%] w-[72%] object-contain" loading="lazy" onLoad={handleLoad} onError={handleError} />
    </span>
  );
}

function buildLogoCandidates(owner: string, repo: string, defaultBranch: string) {
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}`;
  return [
    `${base}/logo.svg`,
    `${base}/logo.png`,
    `${base}/Logo.svg`,
    `${base}/Logo.png`,
    `${base}/public/logo.svg`,
    `${base}/public/logo.png`,
    `${base}/public/favicon.svg`,
    `${base}/public/favicon.ico`,
    `${base}/assets/logo.svg`,
    `${base}/assets/logo.png`,
    `${base}/src/assets/logo.svg`,
    `${base}/src/assets/logo.png`,
    `${base}/.github/logo.png`,
    `${base}/icon.svg`,
    `${base}/icon.png`,
    `${base}/favicon.svg`,
    `${base}/favicon.png`,
    `${base}/apple-touch-icon.png`,
  ];
}

function readCachedLogo(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LogoCacheEntry;
    if (!entry || Date.now() - entry.checkedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return entry.url;
  } catch {
    return null;
  }
}

function writeLogoCache(key: string, url: string | null) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ url, checkedAt: Date.now() } satisfies LogoCacheEntry));
  } catch {
    // Logo cache is opportunistic and must never block repository navigation.
  }
}
