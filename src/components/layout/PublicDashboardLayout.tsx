import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicSnapshotManifest } from "@/hooks/useGitHubPublic";
import { DashboardLayoutFrame } from "./DashboardLayoutFrame";

export function PublicDashboardLayout() {
  const { mode, username } = usePublicRuntime();
  const { data: manifest } = usePublicSnapshotManifest();
  const modeLabel =
    mode === "public-profile"
      ? "public-profile"
      : manifest?.status.dataMode === "authenticated"
        ? "authenticated-snapshot"
        : "public-pages";

  return <DashboardLayoutFrame modeLabel={modeLabel} identityLabel={username ? `@${username}` : null} />;
}
