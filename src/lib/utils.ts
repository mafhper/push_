import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simple obfuscation for tokens stored in localStorage.
 * This is not strong encryption, but prevents casual inspection.
 */
export function obfuscateToken(token: string): string {
  if (!token) return '';
  return btoa(token.split('').reverse().join('')).split('').reverse().join('');
}

export function deobfuscateToken(obfuscated: string): string {
  if (!obfuscated) return '';
  try {
    const reversed = obfuscated.split('').reverse().join('');
    return atob(reversed).split('').reverse().join('');
  } catch {
    return '';
  }
}
