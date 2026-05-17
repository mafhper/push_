import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { StatusBar } from './StatusBar';

type AppShellRuntime = 'local' | 'public';

export function AppShell({ runtime = 'local' }: { runtime?: AppShellRuntime }) {
  useEffect(() => {
    document.documentElement.classList.add('app-shell-active');
    document.body.classList.add('app-shell-active');
    return () => {
      document.documentElement.classList.remove('app-shell-active');
      document.body.classList.remove('app-shell-active');
    };
  }, []);

  return (
    <div className="app-viewport flex flex-col bg-background text-foreground-muted selection:bg-selection-bg selection:text-foreground">
      <StatusBar runtime={runtime} />
      <main className="flex min-h-0 w-full flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
