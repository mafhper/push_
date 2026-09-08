export type PlatformId = "mac" | "windows" | "linux";

export const PLATFORMS: readonly PlatformId[] = ["mac", "windows", "linux"];

export function isPlatform(value: unknown): value is PlatformId {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}

export type WindowControlsStyle = "traffic-lights" | "windows" | "linux";
export type CloseHoverBehavior = "native-danger" | "danger" | "neutral";

export interface PlatformProfile {
  id: PlatformId;
  titlebarHeight: number;
  cornerRadius: number;
  fontFamily: string;
  windowControls: WindowControlsStyle;
  closeHoverBehavior: CloseHoverBehavior;
}

export function normalizePlatform(raw: string): PlatformId {
  switch (raw) {
    case "macos":
    case "darwin":
      return "mac";
    case "windows":
      return "windows";
    case "linux":
    case "freebsd":
    case "openbsd":
    case "netbsd":
    case "android":
    case "ios":
      return "linux";
    default:
      return "linux";
  }
}