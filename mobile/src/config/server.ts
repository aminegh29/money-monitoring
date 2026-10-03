import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SERVER_KEY = 'mm_server';
const BACKEND_PORT = 8080;

let override: string | null = null;

/**
 * The backend address the app would use with no saved override.
 * In Expo Go, hostUri is "<PC LAN IP>:8081" (where Metro serves the bundle), and the backend
 * runs on that same PC, so the phone reaches it at the same IP on port 8080.
 */
export function defaultServerUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && !host.endsWith('.exp.direct')) return `http://${host}:${BACKEND_PORT}`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${BACKEND_PORT}`;
  return `http://localhost:${BACKEND_PORT}`;
}

export function serverUrl(): string {
  return override ?? defaultServerUrl();
}

export function apiUrl(): string {
  return `${serverUrl()}/api`;
}

export function wsUrl(): string {
  return `${serverUrl().replace(/^http/, 'ws')}/ws`;
}

export function isCustomServer(): boolean {
  return override !== null;
}

/** Loads the saved override. Called once at startup, before the first request. */
export async function loadServerUrl(): Promise<void> {
  try {
    override = await AsyncStorage.getItem(SERVER_KEY);
  } catch {
    override = null;
  }
}

/** Saves an override, or clears it when url is empty. Returns the normalised URL. */
export async function setServerUrl(url: string): Promise<string> {
  let value = url.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  if (value && !/^https?:\/\//.test(value)) value = `http://${value}`;
  if (value && !/:\d+$/.test(value) && value.startsWith('http://')) value = `${value}:${BACKEND_PORT}`;
  override = value || null;
  try {
    if (override) await AsyncStorage.setItem(SERVER_KEY, override);
    else await AsyncStorage.removeItem(SERVER_KEY);
  } catch {}
  return serverUrl();
}
