import type { Role } from "@/lib/roles";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string | null;
  site: string | null;
  active: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
}

export interface AuditLogEvent {
  id: string;
  actorId: string | null;
  role: Role | null;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  events: AuditLogEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogFilters {
  entity?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
}
