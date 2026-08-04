import { getStoredToken } from "./authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

if (!API_BASE_URL) {
  // Fails loudly at startup rather than silently hitting a relative URL
  // that happens to 404 everything.
  throw new Error("VITE_API_BASE_URL is not set — copy .env.example to .env");
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Set once by AuthProvider on mount. lib/api.ts can't use React Router's
// navigate() itself (it's outside the component tree), so a 401 just calls
// back into whatever AuthProvider registered — clearing the token and
// redirecting to /login — instead of every call site handling it by hand.
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Skip the Authorization header — only /auth/login and /auth/register need this. */
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, skipAuth = false } = options;

  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuth) {
    onUnauthorized?.();
    throw new ApiError(401, "Session expired — please log in again.");
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // No JSON body (e.g. 204) — leave payload null.
  }

  if (!res.ok) {
    const errorBody = payload as { error?: string; details?: unknown } | null;
    throw new ApiError(res.status, errorBody?.error ?? `Request failed (${res.status})`, errorBody?.details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Pick<RequestOptions, "skipAuth">) =>
    request<T>(path, { method: "POST", body, ...options }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
