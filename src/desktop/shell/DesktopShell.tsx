import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { PlatformProfile } from "../platform/platform";
import { usePlatformProfile } from "../platform/usePlatformProfile";
import { PlatformTitlebar } from "./PlatformTitlebar";
import styles from "./DesktopShell.module.css";

export interface DesktopShellProps {
  title?: string;
  children: ReactNode;
  titlebarContent?: ReactNode;
  appIcon?: ReactNode;
  className?: string;
  profile?: PlatformProfile;
}

export function DesktopShell({ title, children, titlebarContent, appIcon, className, profile: forcedProfile }: DesktopShellProps) {
  const detected = usePlatformProfile();
  const profile = forcedProfile ?? detected;

  const style = useMemo<CSSProperties>(
    () => ({
      fontFamily: profile.fontFamily,
      ["--ui-platform-radius" as string]: `${profile.cornerRadius}px`,
    }),
    [profile],
  );

  return (
    <div className={`${styles.shell} ${className ?? ""}`} data-os={profile.id} style={style}>
      <PlatformTitlebar profile={profile} title={title} appIcon={appIcon}>
        {titlebarContent}
      </PlatformTitlebar>
      <div className={styles.workspace}>{children}</div>
    </div>
  );
}