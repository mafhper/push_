import type { PlatformProfile } from "../platform/platform";

export const mac: PlatformProfile = {
  id: "mac", titlebarHeight: 40, cornerRadius: 10,
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, Arial, sans-serif',
  windowControls: "traffic-lights", closeHoverBehavior: "native-danger",
};

export const windows: PlatformProfile = {
  id: "windows", titlebarHeight: 36, cornerRadius: 8,
  fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif',
  windowControls: "windows", closeHoverBehavior: "danger",
};

export const linux: PlatformProfile = {
  id: "linux", titlebarHeight: 46, cornerRadius: 12,
  fontFamily: '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", sans-serif',
  windowControls: "linux", closeHoverBehavior: "neutral",
};