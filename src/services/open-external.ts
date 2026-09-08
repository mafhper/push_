import { isTauriRuntime } from '@/config/site';

export async function openExternal(url: string | URL): Promise<void> {
  const target = typeof url === 'string' ? url : url.toString();

  if (isTauriRuntime()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(target);
    return;
  }

  const win = window.open(target, '_blank', 'noopener,noreferrer');
  if (win) win.opener = null;
}

export function isExternalHref(href: string | null | undefined): boolean {
  if (!href) return false;
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../') || href.startsWith('#')) {
    return false;
  }
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function setupExternalLinkHandler(): () => void {
  if (!isTauriRuntime()) return () => {};

  const handler = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = (event.target as Element | null)?.closest?.('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!isExternalHref(href)) return;
    event.preventDefault();
    void openExternal(href);
  };

  document.addEventListener('click', handler, true);
  return () => document.removeEventListener('click', handler, true);
}