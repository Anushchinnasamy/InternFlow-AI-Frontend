import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; timezone?: string }) => api.patch<{ user: AuthUser }>("/auth/me", input),
    onSuccess: (data) => queryClient.setQueryData(["me"], { user: data.user }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post<{ success: boolean }>("/auth/change-password", input),
  });
}
