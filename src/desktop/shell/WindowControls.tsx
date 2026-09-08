import { getCurrentWindow } from "@tauri-apps/api/window";
import type { CloseHoverBehavior, WindowControlsStyle } from "../platform/platform";
import { isTauriRuntime } from "@/config/site";
import styles from "./WindowControls.module.css";
import { MinimizeIcon, MaximizeIcon, CloseIcon } from "./control-icons";

export interface WindowControlsProps {
  style: WindowControlsStyle;
  closeHoverBehavior?: CloseHoverBehavior;
  labels?: { minimize?: string; maximize?: string; close?: string };
}

export function WindowControls({ style, closeHoverBehavior = "danger", labels }: WindowControlsProps) {
  const l = {
    minimize: labels?.minimize ?? "Minimize",
    maximize: labels?.maximize ?? "Maximize",
    close: labels?.close ?? "Close",
  };

  const fire = async (fn?: () => Promise<void> | void) => {
    if (!fn) return;
    try { await fn(); } catch { /* fora do Tauri: no-op */ }
  };

  const win = isTauriRuntime() ? getCurrentWindow() : undefined;

  if (style === "traffic-lights") {
    return (
      <div className={styles.macDots} aria-hidden="true">
        <span /><span /><span />
      </div>
    );
  }

  return (
    <div className={`${styles.controls} ${styles[`kind-${style}`]} ${
      closeHoverBehavior === "neutral" ? styles.closeNeutral : ""
    }`}>
      <button type="button" className={styles.btn} aria-label={l.minimize} onClick={() => fire(() => win?.minimize())}>
        <MinimizeIcon />
      </button>
      <button type="button" className={styles.btn} aria-label={l.maximize} onClick={() => fire(() => win?.toggleMaximize())}>
        <MaximizeIcon />
      </button>
      <button type="button" className={styles.btn} aria-label={l.close} onClick={() => fire(() => win?.close())}>
        <CloseIcon />
      </button>
    </div>
  );
}