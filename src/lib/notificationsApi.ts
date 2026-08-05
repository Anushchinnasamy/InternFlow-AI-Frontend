import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NotificationsMineResponse, NotificationLog } from "@/types/notifications";

const QUERY_KEY = ["notifications", "mine"];

export function useNotificationsMine() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<NotificationsMineResponse>("/notifications/mine"),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ notificationLog: NotificationLog }>(`/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<{ updatedCount: number }>("/notifications/read-all"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
