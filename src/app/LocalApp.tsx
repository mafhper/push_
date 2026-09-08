import { QueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { Persister, PersistedClient } from "@tanstack/query-persist-client-core";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { useApp } from "@/contexts/useApp";
import {
  PromoLayout as PromoLayoutWeb,
} from "@/components/Layout";
import { AppShell } from "@/components/layout/AppShell";
import ScrollToTop from "@/components/ScrollToTop";
import { isTauriRuntime } from "@/config/site";
import {
  CACHE_VERSION,
  QUERY_CACHE_MAX_AGE,
  createQueryPersister,
  shouldPersistQuery,
} from "@/services/query-persistence";

const HomePage = lazy(() => import("../pages/promo/Home"));
const DashboardPage = lazy(() => import("../pages/Dashboard"));
const RepoDetailPage = lazy(() => import("../pages/RepoDetail"));
const AlertsPage = lazy(() => import("../pages/Alerts"));
const SettingsPage = lazy(() => import("../pages/Settings"));
const NotFoundPage = lazy(() => import("../pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

const noopPersister: Persister = {
  persistClient: () => undefined,
  restoreClient: (): PersistedClient | undefined => undefined,
  removeClient: () => undefined,
};

function createPersistOptions() {
  if (!isTauriRuntime()) {
    return { persister: noopPersister, maxAge: QUERY_CACHE_MAX_AGE };
  }
  return {
    persister: createQueryPersister(),
    maxAge: QUERY_CACHE_MAX_AGE,
    buster: String(CACHE_VERSION),
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) => shouldPersistQuery(query),
    },
  };
}

const persistOptions = createPersistOptions();

export default function LocalApp() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <ScrollToTop />
            <Suspense fallback={<AppLoadingFallback />}>
              <Routes>
                {!__PUSH_TAURI_BUILD__ && (
                  <Route element={<PromoLayoutWeb />}>
                    <Route path="/" element={<HomePage />} />
                  </Route>
                )}
                {__PUSH_TAURI_BUILD__ && (
                  <Route path="/" element={<Navigate to="/app" replace />} />
                )}

                <Route path="/app" element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="repo/:owner/:repo" element={<RepoDetailPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                <Route path="/auth" element={<Navigate to="/app/settings" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </PersistQueryClientProvider>
  );
}

function AppLoadingFallback() {
  const { t } = useApp();
  return <div className="px-6 py-20 text-sm text-muted-foreground">{t("loadingAppShell")}</div>;
}
