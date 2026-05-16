import React from 'react';
import { Outlet } from 'react-router-dom';
import { StatusBar } from './StatusBar';

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground-muted selection:bg-selection-bg selection:text-foreground">
      <StatusBar />
      <main className="flex flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
