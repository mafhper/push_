import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { clearOctokit } from '@/services/github';
import { notifications } from '@/services/notifications';
import {
  Settings as SettingsIcon, Palette, Globe, Timer, Trash2, LogOut, Download, Upload, Key, Bell, Check,
} from 'lucide-react';
import type { Theme, Language } from '@/types';

export default function SettingsPage() {
  const { t, settings, updateSettings, session, clearAll } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  const handleRequestPermission = async () => {
    const granted = await notifications.requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      updateSettings({ notificationsEnabled: true });
    }
  };

  const handleDisconnect = () => {
    clearOctokit();
    clearAll();
    navigate('/auth');
  };

  const handleExport = () => {
    const config = {
      settings,
      primaryRepo: localStorage.getItem('gl_primary_repo'),
      selectedRepos: localStorage.getItem('gl_selected_repos'),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'push-underline-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const config = JSON.parse(reader.result as string);
        if (config.settings) updateSettings(config.settings);
      } catch {
        // ignore
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('gl_cache_')) localStorage.removeItem(k);
    });
  };

  const maskedToken = session?.token
    ? `***...${session.token.slice(-4)}`
    : '';

  const themes: { value: Theme; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'golden', label: 'Golden' },
    { value: 'nord', label: 'Nord' },
    { value: 'midnight', label: 'Midnight' },
    { value: 'emerald', label: 'Emerald' },
  ];

  const languages: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Portugues (BR)' },
    { value: 'es', label: 'Espanol' },
  ];

  const intervals = [30, 60, 120, 300];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-fluid-2xl font-bold flex items-center gap-2">
          <SettingsIcon size={24} strokeWidth={1.5} />
          {t('settings')}
        </h1>
      </motion.div>

      {/* Token info */}
      <Section icon={Key} title={t('tokenMasked')}>
        <div className="flex items-center justify-between">
          <code className="text-sm text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">{maskedToken}</code>
        </div>
      </Section>

      {/* Theme */}
      <Section icon={Palette} title={t('theme')}>
        <div className="flex gap-2">
          {themes.map(th => (
            <button
              key={th.value}
              onClick={() => updateSettings({ theme: th.value })}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                settings.theme === th.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Language */}
      <Section icon={Globe} title={t('language')}>
        <div className="flex gap-2">
          {languages.map(l => (
            <button
              key={l.value}
              onClick={() => updateSettings({ lang: l.value })}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                settings.lang === l.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Polling */}
      <Section icon={Timer} title={t('pollingInterval')}>
        <div className="flex gap-2">
          {intervals.map(s => (
            <button
              key={s}
              onClick={() => updateSettings({ pollingInterval: s })}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                settings.pollingInterval === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {s}s
            </button>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title={t('notifications')}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('enableNotifications')}</span>
            <button
              onClick={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {notifPermission !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
            >
              <Bell size={14} />
              {t('requestPermission')}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-success">
              <Check size={14} />
              Permission Granted
            </div>
          )}
        </div>
      </Section>

      {/* Export / Import */}
      <Section icon={Download} title={t('exportConfig')}>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            <Download size={14} /> {t('exportConfig')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            <Upload size={14} /> {t('importConfig')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </Section>

      {/* Cache */}
      <Section icon={Trash2} title={t('clearCache')}>
        <button
          onClick={handleClearCache}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all"
        >
          <Trash2 size={14} /> {t('clearCacheDesc')}
        </button>
      </Section>

      {/* Disconnect */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <button
          onClick={handleDisconnect}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-critical/30 bg-critical/5 px-4 py-3 text-sm font-medium text-critical hover:bg-critical/10 transition-all"
        >
          <LogOut size={16} strokeWidth={1.5} />
          {t('disconnectButton')}
        </button>
      </motion.div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-3"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Icon size={14} strokeWidth={1.5} />
        {title}
      </h2>
      {children}
    </motion.div>
  );
}
