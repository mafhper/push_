import React, { useState, useEffect, useMemo } from 'react';
import { Image as ImageIcon, Code2, Terminal, Globe, Cpu, FileJson, Laptop } from 'lucide-react';
import { LANGUAGE_COLORS } from '@/types';

interface ProjectImageProps {
  owner: string;
  repo: string;
  defaultBranch: string;
  language?: string | null;
  className?: string;
}

const LANGUAGE_ICONS: Record<string, React.ElementType> = {
  TypeScript: Code2,
  JavaScript: Code2,
  Python: Terminal,
  HTML: Globe,
  CSS: Globe,
  Rust: Cpu,
  Go: Cpu,
  Java: Laptop,
  PHP: FileJson,
};

export function ProjectImage({ owner, repo, defaultBranch, language, className }: ProjectImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const isApp = repo.toLowerCase() === 'push_underline' || repo.toLowerCase() === 'project-genesis';

  // Memoize candidates to avoid effect re-runs and include common variations
  const logoCandidates = useMemo(() => {
    if (isApp) return ['/favicon.svg'];
    
    const base = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}`;
    return [
      `${base}/logo.png`,
      `${base}/Logo.png`,
      `${base}/logo.svg`,
      `${base}/public/logo.png`,
      `${base}/public/favicon.svg`,
      `${base}/public/favicon.ico`,
      `${base}/assets/logo.png`,
      `${base}/src/assets/logo.png`,
      `${base}/.github/logo.png`,
      `${base}/icon.png`,
      `${base}/Icon.png`,
      `${base}/favicon.png`,
      `${base}/apple-touch-icon.png`,
    ];
  }, [owner, repo, defaultBranch, isApp]);

  useEffect(() => {
    setImgSrc(logoCandidates[0]);
    setErrorCount(0);
  }, [logoCandidates]);

  const handleError = () => {
    if (errorCount < logoCandidates.length - 1) {
      const nextIndex = errorCount + 1;
      setErrorCount(nextIndex);
      setImgSrc(logoCandidates[nextIndex]);
    } else {
      setImgSrc(null);
    }
  };

  if (!imgSrc) {
    const Icon = (language && LANGUAGE_ICONS[language]) || ImageIcon;
    const bgColor = (language && LANGUAGE_COLORS[language]) || 'var(--primary)';
    
    return (
      <div 
        className={`flex items-center justify-center relative overflow-hidden shrink-0 ${className}`}
        style={{ 
          background: `linear-gradient(135deg, ${bgColor}22 0%, ${bgColor}11 100%)`,
          border: `1px solid ${bgColor}33`
        }}
      >
        <span className="absolute -bottom-4 -right-2 text-8xl font-black opacity-[0.03] select-none pointer-events-none">
          {repo.charAt(0).toUpperCase()}
        </span>
        
        <div className="relative flex flex-col items-center gap-2 z-10">
          <div 
            className="p-3 rounded-2xl bg-background/50 shadow-sm border border-border/50"
            style={{ color: bgColor }}
          >
            <Icon size={isApp ? 40 : 28} strokeWidth={1.5} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
            {language || 'Project'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-secondary/5 shrink-0 overflow-hidden ${className}`}>
      <img
        src={imgSrc}
        alt={`${repo} logo`}
        className="max-h-[70%] max-w-[70%] object-contain transition-all duration-500 group-hover:scale-110 drop-shadow-sm"
        onError={handleError}
      />
    </div>
  );
}
