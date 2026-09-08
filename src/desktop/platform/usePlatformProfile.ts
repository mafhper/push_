import { useEffect, useState } from "react";
import type { PlatformProfile } from "./platform";
import { detectPlatform } from "./detect";
import { linux } from "../profiles";

let cached: PlatformProfile | null = null;

export function usePlatformProfile(): PlatformProfile {
  const [profile, setProfile] = useState<PlatformProfile>(cached ?? linux);

  useEffect(() => {
    let active = true;
    if (cached) {
      setProfile(cached);
      return;
    }
    detectPlatform().then((p) => {
      if (!active) return;
      cached = p;
      setProfile(p);
    });
    return () => {
      active = false;
    };
  }, []);

  return profile;
}