import { useApp } from '@/contexts/AppContext';
import { RateLimitBar } from '@/components/RateLimitBar';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Shield, Menu, X, Activity } from 'lucide-react';
import { useState } from 'react';
import { useGlobalWatcher } from '@/hooks/useCIWatcher';

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, session } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Background monitoring for CI failures and security alerts
  useGlobalWatcher();

  const navItems = session ? [
    { path: '/', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/alerts', label: t('alerts'), icon: Shield },
    { path: '/settings', label: t('settings'), icon: Settings },
  ] : [];

  return (
    <div className="min-h-svh bg-background text-foreground transition-theme">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/')}
                className="text-lg font-black tracking-tighter text-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <div className="bg-primary text-primary-foreground p-1 rounded-lg flex items-center justify-center">
                  <Activity size={18} strokeWidth={3} />
                </div>
                <span>PUSH<span className="text-primary">_</span>UNDERLINE</span>
              </button>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-1">
                {navItems.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <item.icon size={15} strokeWidth={1.5} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {session && <RateLimitBar />}
              {session && (
                <div className="hidden sm:flex items-center gap-2">
                  <img
                    src={session.avatarUrl}
                    alt={session.username}
                    className="h-7 w-7 rounded-full border border-border"
                  />
                  <span className="text-sm font-medium text-foreground">{session.username}</span>
                </div>
              )}
              {/* Mobile menu button */}
              <button
                className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border py-2 space-y-1">
              {navItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                    {item.label}
                  </button>
                );
              })}
              {session && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <img src={session.avatarUrl} alt={session.username} className="h-6 w-6 rounded-full border border-border" />
                  <span className="text-sm text-foreground">{session.username}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-[1800px] px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
