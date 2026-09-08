export interface IconProps {
  size?: number | string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export function MinimizeIcon(props: IconProps) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 14} height={props.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden={props["aria-hidden"] ?? true}><path d="M5 12h14" /></svg>;
}

export function MaximizeIcon(props: IconProps) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 14} height={props.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden={props["aria-hidden"] ?? true}><rect x="6" y="6" width="12" height="12" rx="1" /></svg>;
}

export function CloseIcon(props: IconProps) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 14} height={props.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden={props["aria-hidden"] ?? true}><path d="M6 6l12 12M18 6L6 18" /></svg>;
}