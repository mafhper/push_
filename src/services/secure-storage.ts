import { isTauriRuntime } from "@/config/site";
import { deletePasswords, getPasswords, setPasswords, joinKeyPrefix } from "tauri-plugin-keyring-store-api";

const ACCOUNT = joinKeyPrefix("push", "github_token");

export function isSecureStorageAvailable() {
  return isTauriRuntime();
}

export async function saveGithubToken(token: string) {
  if (!isSecureStorageAvailable()) return;
  await setPasswords([{ account: ACCOUNT, secret: token }]);
}

export async function loadGithubToken(): Promise<string | null> {
  if (!isSecureStorageAvailable()) return null;
  const [value] = await getPasswords([ACCOUNT]);
  return value && value.length > 0 ? value : null;
}

export async function clearGithubToken() {
  if (!isSecureStorageAvailable()) return;
  await deletePasswords([ACCOUNT]);
}