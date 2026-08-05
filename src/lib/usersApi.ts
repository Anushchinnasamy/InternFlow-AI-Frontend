import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Role } from "@/lib/roles";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export function useUsersByRole(role: Role) {
  return useQuery({
    queryKey: ["users", "by-role", role],
    queryFn: () => api.get<{ users: UserSummary[] }>(`/users?role=${role}`),
  });
}
