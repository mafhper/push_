export const SITE_NAME = "Push_";
export const SITE_TAGLINE = "A semantic command center for your public GitHub footprint.";
export const SITE_REPOSITORY_URL = "https://github.com/mafhper/push_";
export const SITE_BASE_URL = import.meta.env.BASE_URL;
export const LOCAL_RUNTIME_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const PROMO_ROUTES = [
  { href: "/", label: "Home" },
  { href: "/technology", label: "Tech" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
] as const;

export const APP_ROUTES = [
  { href: "/app", label: "Painel" },
  { href: "/app/alerts", label: "Alertas" },
  { href: "/app/settings", label: "Configuracoes" },
] as const;

export const LOCAL_SYNC_DOC = [
  "1. No localhost, conecte seu token GitHub na tela de configuracoes para descobrir seus repositorios publicos.",
  "2. Escolha quais repositorios publicos quer exibir e qual deles sera o destaque local.",
  "3. Quando quiser atualizar o Pages publico, rode `npm run data:sync` com `.env.local` configurado.",
  "4. O site publicado continua consumindo apenas snapshots estaticos, sem token no browser.",
] as const;

export function isLocalSecureRuntime() {
  if (typeof window === "undefined") return false;
  return import.meta.env.DEV && LOCAL_RUNTIME_HOSTS.has(window.location.hostname);
}
