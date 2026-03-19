import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";
import HomePage from "@/pages/promo/Home";
import TechnologyPage from "@/pages/promo/Technology";
import FAQPage from "@/pages/promo/FAQ";
import AboutPage from "@/pages/promo/About";
import Dashboard from "@/pages/Dashboard";
import RepoDetail from "@/pages/RepoDetail";
import AlertsPage from "@/pages/Alerts";
import SettingsPage from "@/pages/Settings";
import AuthPage from "@/pages/Auth";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/repo/:owner/:repo" element={<RepoDetail />} />
            <Route path="/app/alerts" element={<AlertsPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/index" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
