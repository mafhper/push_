import { useContext } from "react";
import { PublicRuntimeContext } from "@/contexts/public-runtime-context";

export function usePublicRuntime() {
  const context = useContext(PublicRuntimeContext);
  if (!context) {
    throw new Error("usePublicRuntime must be used inside PublicRuntimeProvider");
  }

  return context;
}
