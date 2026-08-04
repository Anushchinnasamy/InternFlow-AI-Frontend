// Single place that knows the localStorage key for the JWT — lib/api.ts
// reads it on every request, AuthContext writes it on login/logout. Keeping
// both behind this module means the key string only exists once.
const TOKEN_KEY = "internflow_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
