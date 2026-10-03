import { apiUrl, serverUrl } from '@/config/server';
import { t } from '@/i18n';

/** An HTTP error from the API. status 0 means the server could not be reached. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called by AuthProvider: the token sent with every request, and what to do when it is rejected. */
export function configureClient(t: string | null, unauthorized: (() => void) | null) {
  token = t;
  onUnauthorized = unauthorized;
}

export function authHeader(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Params = Record<string, string | number | boolean | null | undefined>;

export function buildUrl(path: string, params?: Params): string {
  const query = Object.entries(params ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${apiUrl()}${path}${query ? `?${query}` : ''}`;
}

export async function request<T>(method: string, path: string, opts: { params?: Params; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.params), {
      method,
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeader(),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, t('errors.cannotReach', { url: serverUrl() }));
  }

  if (!res.ok) {
    // Expired/invalid session (not a failed login attempt): send the user back to sign in.
    if (res.status === 401 && token && !path.startsWith('/auth/login')) onUnauthorized?.();
    let message = '';
    try {
      message = (await res.json())?.message ?? '';
    } catch {}
    throw new ApiError(res.status, message || defaultMessage(res.status));
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function defaultMessage(status: number): string {
  if (status === 401) return t('errors.invalidLogin');
  if (status === 403) return t('errors.notAllowed');
  return t('common.somethingWrong');
}

/** Extracts a readable message from any thrown value. */
export function errorMessage(err: unknown, fallback?: string): string {
  if (err instanceof ApiError && err.message) return err.message;
  return fallback ?? t('common.somethingWrong');
}

export const http = {
  get: <T>(path: string, params?: Params) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown, params?: Params) => request<T>('POST', path, { body, params }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};
