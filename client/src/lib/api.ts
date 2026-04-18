const TOKEN_KEY = 'ai_sme_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// In dev we leave this empty and the Vite proxy forwards /api/* to localhost:4000.
// In prod the Vercel build injects VITE_API_URL (the backend origin, no trailing slash).
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {}
): Promise<T> {
  const { method = 'GET', body, query } = opts;
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
        .join('&')
    : '';
  const url = `${API_BASE}/api${path}${qs}`;

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || res.statusText, data?.details);
  }
  return data as T;
}
