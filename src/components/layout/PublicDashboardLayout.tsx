import { usePublicSnapshotManifest } from "@/hooks/useGitHubPublic";
import { DashboardLayoutFrame } from "./DashboardLayoutFrame";

export function PublicDashboardLayout() {
  const { data: manifest } = usePublicSnapshotManifest();
  const modeLabel = manifest?.status.dataMode === "authenticated" ? "authenticated-snapshot" : "public-pages";
  return <DashboardLayoutFrame modeLabel={modeLabel} />;
}
