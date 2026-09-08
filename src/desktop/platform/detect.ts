import { platform } from "@tauri-apps/plugin-os";
import type { PlatformId, PlatformProfile } from "../platform/platform";
import { normalizePlatform } from "../platform/platform";
import { mac, windows, linux } from "../profiles";

const PROFILES: Record<PlatformId, PlatformProfile> = { mac, windows, linux };

export async function detectPlatform(): Promise<PlatformProfile> {
  let id: PlatformId = "linux";
  try {
    id = normalizePlatform(await platform());
  } catch {
    // sem runtime Tauri: mantém baseline linux
  }
  return PROFILES[id];
}

export function detectPlatformSync(): PlatformProfile {
  return PROFILES.linux;
}