import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildAvatarCandidates, probePagesAssets, repoInitials } from "@/lib/repo-logo";
import { LANGUAGE_COLORS } from "@/types";

const CACHE_PREFIX = "gl_repo_logo:v4:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type LogoCacheEntry = {
  url: string | null;
  checkedAt: number;
};

interface RepositoryAvatarProps {
  owner: string;
  repo: string;
  defaultBranch: string;
  language?: string | null;
  className?: string;
}

export function RepositoryAvatar({ owner, repo, defaultBranch, language, className }: RepositoryAvatarProps) {
  const cacheKey = `${CACHE_PREFIX}${owner}/${repo}/${defaultBranch}`;
  const guessed = useMemo(
    () => buildAvatarCandidates(owner, repo, defaultBranch),
    [owner, repo, defaultBranch],
  );
  const [probed, setProbed] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(() => readAvatarCache(cacheKey));
  const [failed, setFailed] = useState(false);
  const landedRef = useRef(false);

  const candidates = useMemo(() => {
    if (!probed || probed.length === 0) return guessed;
    return [...probed, ...guessed.filter((candidate) => !probed.includes(candidate))];
  }, [probed, guessed]);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
    landedRef.current = false;
    const cached = readAvatarCache(cacheKey);
    setSrc(cached ?? guessed[0] ?? null);

    const needsProbe = guessed.length > 1 && !cached;
    if (!needsProbe) {
      setProbed(null);
      return;
    }
    setProbed(null);
    let cancelled = false;
    probePagesAssets(owner, repo)
      .then((assets) => {
        if (!cancelled && !landedRef.current) {
          setProbed(assets);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cacheKey, owner, repo, guessed]);

  function handleLoad() {
    landedRef.current = true;
    writeAvatarCache(cacheKey, src);
  }

  function handleError() {
    const nextIndex = index + 1;
    const next = candidates[nextIndex];
    if (next) {
      setIndex(nextIndex);
      setSrc(next);
      return;
    }

    writeAvatarCache(cacheKey, null);
    setFailed(true);
    setSrc(null);
  }

  useEffect(() => {
    if (probed && probed.length > 0 && !landedRef.current) {
      setIndex(0);
      setSrc(probed[0]);
    }
  }, [probed]);

  if (!src || failed) {
    const color = (language && LANGUAGE_COLORS[language]) || "var(--primary)";
    const initials = repoInitials(repo);
    return (
      <div
        role="img"
        aria-label={repo}
        className={cn("relative flex shrink-0 items-center justify-center overflow-hidden", className)}
        style={{
          background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
          border: `1px solid ${color}33`,
          color,
        }}
      >
        <span className="select-none font-headline text-base font-black leading-none tracking-tight">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-surface-2", className)}>
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-[72%] w-[72%] object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

function readAvatarCache(key: string) {
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

function writeAvatarCache(key: string, url: string | null) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ url, checkedAt: Date.now() } satisfies LogoCacheEntry));
  } catch {
    // Avatar cache is opportunistic and must never block repository navigation.
  }
}