import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { PublicRuntimeContext, type PublicRuntimeMode } from "@/contexts/public-runtime-context";

const STORAGE_KEY = "push_public_username";

function sanitizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function PublicRuntimeProvider({ children }: PropsWithChildren) {
  const [username, setUsernameState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const normalized = sanitizeUsername(stored);
    if (normalized) {
      setUsernameState(normalized);
    }
  }, []);

  const value = useMemo(() => {
    const setUsername = (value: string) => {
      const normalized = sanitizeUsername(value);
      setUsernameState(normalized || null);

      if (typeof window !== "undefined") {
        if (normalized) {
          window.sessionStorage.setItem(STORAGE_KEY, normalized);
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    const clearUsername = () => {
      setUsernameState(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    };

    const mode: PublicRuntimeMode = username ? "public-profile" : "snapshot";

    return {
      mode,
      username,
      setUsername,
      clearUsername,
    };
  }, [username]);

  return <PublicRuntimeContext.Provider value={value}>{children}</PublicRuntimeContext.Provider>;
}
