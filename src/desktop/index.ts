export { DesktopShell, type DesktopShellProps } from "./shell/DesktopShell";
export { PlatformTitlebar, type PlatformTitlebarProps } from "./shell/PlatformTitlebar";
export { WindowControls, type WindowControlsProps } from "./shell/WindowControls";
export { MacDots } from "./shell/MacDots";
export type { PlatformId, PlatformProfile, WindowControlsStyle, CloseHoverBehavior } from "./platform/platform";
export { normalizePlatform, isPlatform } from "./platform/platform";
export { usePlatformProfile } from "./platform/usePlatformProfile";