import type { Role } from "@/lib/roles";

// Shape of the backend's `toPublicUser()` (src/routes/auth.ts / me.ts) —
// what GET /me and POST /auth/login|register all return under `user`.
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string | null;
  site: string | null;
  active: boolean;
  createdAt: string;
  // Not returned by /auth/login or /auth/register (those predate Frontend
  // Day F5's Settings page) — only /me and /auth/me include it. Optional
  // rather than `| null` so call sites that don't care can ignore it.
  preferences?: { timezone?: string } | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
