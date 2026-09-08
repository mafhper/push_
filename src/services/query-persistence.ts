import { Store } from '@tauri-apps/plugin-store';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { AsyncStorage, Persister, PersistedClient } from '@tanstack/query-persist-client-core';
import type { Query } from '@tanstack/react-query';
import { bootMark } from '@/services/startup-metrics';
import { notifyCacheHydrated } from '@/services/window-reveal';

export const CACHE_VERSION = 1;
export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

const QUERY_CACHE_FILE = 'query-cache.json';
const QUERY_CACHE_KEY = 'push:query-cache';

const ALLOWED_QUERY_TOP_LEVEL = new Set([
  'dashboard-overview',
  'repos',
  'repo-snapshot',
  'commits',
  'workflows',
  'dependabot',
  'languages',
  'contributors',
  'rateLimit',
  'snapshot-manifest',
]);

function isPersistableKey(queryKey: unknown): boolean {
  return Array.isArray(queryKey) && ALLOWED_QUERY_TOP_LEVEL.has(String(queryKey[0]));
}

export function shouldPersistQuery(query: Query): boolean {
  return isPersistableKey(query.queryKey);
}

interface CacheEnvelope {
  version: number;
  timestamp: number;
  clientState: PersistedClient['clientState'];
}

let storePromise: Promise<Store> | null = null;
function getStore(): Promise<Store> {
  storePromise ??= Store.load(QUERY_CACHE_FILE);
  return storePromise;
}

function createTauriQueryStorage(): AsyncStorage<string> {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const store = await getStore();
        const envelope = (await store.get(key)) as CacheEnvelope | undefined;
        if (!envelope) return null;
        if (envelope.version !== CACHE_VERSION) {
          await store.delete(key);
          return null;
        }
        const clientState = {
          ...envelope.clientState,
          queries: envelope.clientState.queries.filter((q) => isPersistableKey(q.queryKey)),
        };
        return JSON.stringify({
          buster: String(CACHE_VERSION),
          timestamp: envelope.timestamp,
          clientState,
        } satisfies PersistedClient);
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      const store = await getStore();
      const persisted = JSON.parse(value) as PersistedClient;
      const envelope: CacheEnvelope = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        clientState: persisted.clientState,
      };
      await store.set(key, envelope);
    },
    async removeItem(key: string): Promise<void> {
      const store = await getStore();
      await store.delete(key);
    },
  };
}

export function createQueryPersister(): Persister {
  const base = createAsyncStoragePersister({
    storage: createTauriQueryStorage(),
    key: QUERY_CACHE_KEY,
    throttleTime: 500,
  });

  return {
    ...base,
    async restoreClient(): Promise<PersistedClient | undefined> {
      const restored = await base.restoreClient();
      bootMark('cache-hydrated');
      notifyCacheHydrated();
      return restored;
    },
  };
}

export async function removePersistedQueryCache(): Promise<void> {
  const store = await getStore();
  await store.delete(QUERY_CACHE_KEY);
}