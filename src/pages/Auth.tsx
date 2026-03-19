import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { validateToken } from '@/services/github';
import { Key, ExternalLink, Shield, Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const { t, updateSettings, setSession, settings } = useApp();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(settings.rememberToken);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    const result = await validateToken(token.trim());
    if (result) {
      updateSettings({ rememberToken: remember });
      setSession({
        token: token.trim(),
        username: result.login,
        avatarUrl: result.avatarUrl,
        authenticatedAt: new Date().toISOString(),
      });
      navigate('/');
    } else {
      setError(t('connectionError'));
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-fluid-4xl font-bold tracking-tight text-balance"
          >
            {t('welcomeTitle')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-fluid-base"
          >
            {t('welcomeSubtitle')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-5"
        >
          {/* Token input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Key size={14} strokeWidth={1.5} />
              Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={t('tokenPlaceholder')}
                className="w-full h-12 rounded-xl border border-input bg-secondary/50 px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="rounded border-border"
            />
            {t('rememberToken')}
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-critical/10 border border-critical/20 px-3 py-2 text-sm text-critical">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={loading || !token.trim()}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} strokeWidth={1.5} />
            )}
            {t('connectButton')}
          </button>

          {/* Security info */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Shield size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>{t('tokenHelp')}</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-warning">
              <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>{t('tokenWarning')}</span>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">{t('permissionsNeeded')}:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                {t('permMetadata')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                {t('permActions')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                {t('permDependabot')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                {t('permContents')}
              </li>
            </ul>
          </div>

          {/* Link to create PAT */}
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink size={13} />
            {t('onboardingStep1')}
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
