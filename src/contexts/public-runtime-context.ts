import { createContext } from "react";

export type PublicRuntimeMode = "snapshot" | "public-profile";

export type PublicRuntimeContextValue = {
  mode: PublicRuntimeMode;
  username: string | null;
  setUsername: (username: string) => void;
  clearUsername: () => void;
};

export const PublicRuntimeContext = createContext<PublicRuntimeContextValue | null>(null);
