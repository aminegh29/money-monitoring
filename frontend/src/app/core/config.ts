import { Capacitor } from '@capacitor/core';
import { NATIVE_SERVER_URL } from './build-config';

const SERVER_KEY = 'mm_server';

/** True inside the iOS / Android app, false in a browser. */
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'

/**
 * Where the Spring Boot backend lives.
 * - Web: same host as the page, port 8080 (so http://192.168.1.20:4200 on a phone talks to http://192.168.1.20:8080).
 * - Android emulator: 10.0.2.2 is the host computer. iOS simulator: localhost.
 * - Real phones: set your computer's LAN IP from the sign-in screen ("Server" link).
 */
export function defaultServerUrl(): string {
  if (isNative && NATIVE_SERVER_URL) return NATIVE_SERVER_URL;
  if (platform === 'android') return 'http://10.0.2.2:8080';
  if (platform === 'ios') return 'http://localhost:8080';
  return `${location.protocol}//${location.hostname}:8080`;
}

export function serverUrl(): string {
  try {
    return localStorage.getItem(SERVER_KEY) || defaultServerUrl();
  } catch {
    return defaultServerUrl();
  }
}

export function setServerUrl(url: string | null) {
  try {
    if (url) localStorage.setItem(SERVER_KEY, url.replace(/\/+$/, ''));
    else localStorage.removeItem(SERVER_KEY);
  } catch {}
}

export function apiUrl(): string {
  return `${serverUrl()}/api`;
}

export function wsUrl(): string {
  return `${serverUrl().replace(/^http/, 'ws')}/ws`;
}
