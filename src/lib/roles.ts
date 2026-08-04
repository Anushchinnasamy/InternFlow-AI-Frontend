// Mirrors the backend's Prisma `Role` enum exactly (src/middleware/rbac.ts
// on the backend is the actual source of truth — this is a UX-only copy,
// per CLAUDE.md rule 2: the frontend's role checks never substitute for the
// server's).
export const ALL_ROLES = [
  "REFERRER",
  "CANDIDATE",
  "MENTOR",
  "HR",
  "PROGRAM_OWNER",
  "ADMIN_SECURITY",
  "IT_ADMIN",
  "LEGAL",
  "SYSADMIN",
] as const;

export type Role = (typeof ALL_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  REFERRER: "Referrer",
  CANDIDATE: "Candidate",
  MENTOR: "Mentor",
  HR: "HR",
  PROGRAM_OWNER: "Program Owner",
  ADMIN_SECURITY: "Admin Security",
  IT_ADMIN: "IT Admin",
  LEGAL: "Legal",
  SYSADMIN: "SysAdmin",
};

export const ROLE_ABBREVIATIONS: Record<Role, string> = {
  REFERRER: "REF",
  CANDIDATE: "CAN",
  MENTOR: "MEN",
  HR: "HR",
  PROGRAM_OWNER: "PO",
  ADMIN_SECURITY: "AS",
  IT_ADMIN: "IT",
  LEGAL: "LEG",
  SYSADMIN: "SYS",
};
