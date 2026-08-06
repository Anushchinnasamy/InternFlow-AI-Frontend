import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Role } from "@/lib/roles";
import type { AdminUser, AdminUsersResponse, AuditLogsResponse, AuditLogFilters } from "@/types/admin";

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<AdminUsersResponse>("/admin/users"),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; name: string; role: Role; department?: string; site?: string }) =>
      api.post<{ user: AdminUser }>("/admin/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; role?: Role; active?: boolean }) =>
      api.patch<{ user: AdminUser }>(`/admin/users/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAuditLogs(filters: AuditLogFilters) {
  const params = new URLSearchParams();
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(filters.page ?? 1));

  return useQuery({
    queryKey: ["admin", "audit-logs", filters],
    queryFn: () => api.get<AuditLogsResponse>(`/admin/audit-logs?${params.toString()}`),
  });
}
