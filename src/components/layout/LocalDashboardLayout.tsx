import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { useSnapshotManifest } from "@/hooks/useGitHub";
import { DashboardLayoutFrame } from "./DashboardLayoutFrame";

export function LocalDashboardLayout() {
  const { session } = useApp();
  const { data: manifest } = useSnapshotManifest();
  const localSecureMode = isLocalSecureRuntime();
  const modeLabel = localSecureMode && session?.token
    ? "local-authenticated"
    : manifest?.status.dataMode === "authenticated"
      ? "authenticated-snapshot"
      : "public-pages";

  return <DashboardLayoutFrame modeLabel={modeLabel} identityLabel={session?.username ? `@${session.username}` : null} />;
}
