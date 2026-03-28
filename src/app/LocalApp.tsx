import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { useApp } from "@/contexts/useApp";
import { PromoLayout } from "@/components/Layout";
import { LocalDashboardLayout } from "@/components/layout/LocalDashboardLayout";
import ScrollToTop from "@/components/ScrollToTop";

const HomePage = lazy(() => import("../pages/promo/Home"));
const TechnologyPage = lazy(() => import("../pages/promo/Technology"));
const FAQPage = lazy(() => import("../pages/promo/FAQ"));
const AboutPage = lazy(() => import("../pages/promo/About"));
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

export default function LocalApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <ScrollToTop />
            <Suspense fallback={<AppLoadingFallback />}>
              <Routes>
                <Route element={<PromoLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/technology" element={<TechnologyPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/about" element={<AboutPage />} />
                </Route>

                <Route path="/app" element={<LocalDashboardLayout />}>
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
    </QueryClientProvider>
  );
}

function AppLoadingFallback() {
  const { t } = useApp();
  return <div className="editorial-frame px-6 py-20 text-sm text-muted-foreground">{t("loadingAppShell")}</div>;
}
