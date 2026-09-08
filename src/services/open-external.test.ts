import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isExternalHref, setupExternalLinkHandler } from './open-external';

vi.mock('@/config/site', async () => {
  const actual = await vi.importActual<typeof import('@/config/site')>('@/config/site');
  return { ...actual, isTauriRuntime: vi.fn(() => false) };
});

vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn(() => Promise.resolve()) }));

describe('isExternalHref', () => {
  it('returns true for http(s) absolute URLs', () => {
    expect(isExternalHref('https://github.com/mafhper/push_')).toBe(true);
    expect(isExternalHref('http://example.com')).toBe(true);
  });

  it('returns false for relative, mailto, and void links', () => {
    expect(isExternalHref('/app/settings')).toBe(false);
    expect(isExternalHref('#section')).toBe(false);
    expect(isExternalHref('mailto:hi@example.com')).toBe(false);
    expect(isExternalHref('javascript:void(0)')).toBe(false);
  });

  it('returns false for empty or missing href', () => {
    expect(isExternalHref(null)).toBe(false);
    expect(isExternalHref(undefined)).toBe(false);
    expect(isExternalHref('')).toBe(false);
  });
});

describe('setupExternalLinkHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('is a no-op outside the Tauri runtime', async () => {
    const { isTauriRuntime } = await import('@/config/site');
    vi.mocked(isTauriRuntime).mockReturnValue(false);

    const remove = setupExternalLinkHandler();
    document.body.innerHTML = '<a id="ext" href="https://github.com/mafhper/push_">Open</a>';

    const anchor = document.getElementById('ext') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    anchor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    remove();
  });

  it('opens external links via the opener plugin inside the Tauri runtime', async () => {
    const { isTauriRuntime } = await import('@/config/site');
    vi.mocked(isTauriRuntime).mockReturnValue(true);

    const remove = setupExternalLinkHandler();
    document.body.innerHTML = '<a id="ext" href="https://github.com/mafhper/push_">Open</a>';

    const anchor = document.getElementById('ext') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    anchor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    expect(openUrl).toHaveBeenCalledWith('https://github.com/mafhper/push_');
    remove();
  });

  it('leaves internal links untouched inside the Tauri runtime', async () => {
    const { isTauriRuntime } = await import('@/config/site');
    vi.mocked(isTauriRuntime).mockReturnValue(true);

    const remove = setupExternalLinkHandler();
    document.body.innerHTML = '<a id="int" href="/app/settings">Settings</a>';

    const anchor = document.getElementById('int') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    anchor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    expect(openUrl).not.toHaveBeenCalled();
    remove();
  });

  it('keeps modified clicks (ctrl/meta) untouched', async () => {
    const { isTauriRuntime } = await import('@/config/site');
    vi.mocked(isTauriRuntime).mockReturnValue(true);

    const remove = setupExternalLinkHandler();
    document.body.innerHTML = '<a id="ext" href="https://github.com/mafhper/push_">Open</a>';

    const anchor = document.getElementById('ext') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    anchor.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    remove();
  });
});