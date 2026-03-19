import { LANGUAGE_COLORS } from '@/types';

interface LanguageBarProps {
  languages: Record<string, number>;
  showLabels?: boolean;
}

export function LanguageBar({ languages, showLabels = false }: LanguageBarProps) {
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
        {sorted.map(([lang, bytes]) => {
          const pct = (bytes / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={lang}
              className="h-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: LANGUAGE_COLORS[lang] || '#8b8b8b',
              }}
              title={`${lang}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {sorted.slice(0, 6).map(([lang, bytes]) => {
            const pct = ((bytes / total) * 100).toFixed(1);
            return (
              <span key={lang} className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: LANGUAGE_COLORS[lang] || '#8b8b8b' }}
                />
                <span className="font-medium text-foreground">{lang}</span>
                <span>{pct}%</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
