import type { CSSProperties, ReactNode } from "react";
import type { PlatformProfile } from "../platform/platform";
import { MacDots } from "./MacDots";
import { WindowControls } from "./WindowControls";
import styles from "./PlatformTitlebar.module.css";

export interface PlatformTitlebarProps {
  profile: PlatformProfile;
  title: string;
  children?: ReactNode;
  appIcon?: ReactNode;
  labels?: { minimize?: string; maximize?: string; close?: string };
}

export function PlatformTitlebar({ profile, title, children, appIcon, labels }: PlatformTitlebarProps) {
  const style: CSSProperties = { height: profile.titlebarHeight };
  const isMac = profile.windowControls === "traffic-lights";

  return (
    <header className={styles.titlebar} style={style} data-os={profile.id}>
      <div className={styles.drag} data-tauri-drag-region>
        {isMac && <MacDots />}
        {!isMac && appIcon && <span className={styles.appIcon}>{appIcon}</span>}
        <span className={styles.title}>{title}</span>
      </div>
      {children && <div className={styles.center}>{children}</div>}
      {!isMac && <WindowControls style={profile.windowControls} closeHoverBehavior={profile.closeHoverBehavior} labels={labels} />}
    </header>
  );
}