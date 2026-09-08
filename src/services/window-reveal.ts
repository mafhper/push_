import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauriRuntime } from '@/config/site';
import { bootMark } from '@/services/startup-metrics';

const SHELL_READY_EVENT = 'push:shell-ready';
const HYDRATION_TIMEOUT_MS = 2500;
const SHOW_RETRIES = 2;
const SHOW_RETRY_DELAY_MS = 250;

let hydrationResolver: (() => void) | null = null;
const hydrationPromise = new Promise<void>((resolve) => {
  hydrationResolver = resolve;
});

export function notifyCacheHydrated() {
  hydrationResolver?.();
  hydrationResolver = null;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function showWindow(): Promise<boolean> {
  const windowApi = getCurrentWindow();
  for (let attempt = 0; attempt <= SHOW_RETRIES; attempt += 1) {
    try {
      await windowApi.show();
      return true;
    } catch {
      if (attempt < SHOW_RETRIES) {
        await new Promise((r) => setTimeout(r, SHOW_RETRY_DELAY_MS));
      }
    }
  }
  return false;
}

export async function revealWindowWhenReady() {
  if (!isTauriRuntime()) return;

  await Promise.race([
    hydrationPromise,
    new Promise((resolve) => setTimeout(resolve, HYDRATION_TIMEOUT_MS)),
  ]);
  await nextFrame();

  const shown = await showWindow();
  if (shown) {
    bootMark('window-visible');
    await emit(SHELL_READY_EVENT);
  }
}