import { removePersistedQueryCache } from "@/services/query-persistence";

/**
 * Local data owned by the account, not by the installation (PU14).
 *
 * The repository selection, the featured repository and the saved identity are
 * stored without an account in the key, so they survive a token swap. The logo
 * cache and the legacy cache entries are keyed the same way. This list is the
 * inventory the reconciliation offers to delete — and it is the only thing it
 * deletes: preferences (`gl_settings`) and the token itself live elsewhere.
 */
export const ACCOUNT_LOCAL_KEYS = [
  "gl_selected_repos",
  "gl_primary_repo",
  "gl_github_identity",
] as const;

export const ACCOUNT_LOCAL_PREFIXES = ["gl_repo_logo:", "gl_cache_"] as const;

/**
 * Removes the account-agnostic local data. Returns the keys that were present,
 * so the caller can report what actually happened. Call it only after an
 * explicit confirmation: nothing here is recoverable.
 */
export function clearAccountLocalData(storage: Storage = window.localStorage): string[] {
  const removed: string[] = [];

  for (const key of ACCOUNT_LOCAL_KEYS) {
    if (storage.getItem(key) === null) continue;
    storage.removeItem(key);
    removed.push(key);
  }

  // Collect first: removing while walking a Storage by index skips entries.
  const prefixed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (ACCOUNT_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) prefixed.push(key);
  }
  for (const key of prefixed) {
    storage.removeItem(key);
    removed.push(key);
  }

  // The persisted query cache is the same data in the desktop shell; a stale
  // entry would repopulate another account's repositories after a restart.
  void removePersistedQueryCache().catch(() => undefined);

  return removed;
}
