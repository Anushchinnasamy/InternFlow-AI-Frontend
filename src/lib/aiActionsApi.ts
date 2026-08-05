import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AiActionsResponse } from "@/types/aiActions";

export function useMyAiActions(types: string[]) {
  return useQuery({
    queryKey: ["ai-actions", "mine", types],
    queryFn: () => api.get<AiActionsResponse>(`/ai-actions?type=${types.join(",")}&mine=true`),
  });
}
