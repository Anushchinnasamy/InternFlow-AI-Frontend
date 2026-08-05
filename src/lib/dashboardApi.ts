import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  StageCountsResponse,
  SlaBreachesResponse,
  CycleTimeResponse,
  DashboardNarrativeResponse,
  DuplicateAlertsResponse,
  SlaRiskPredictionsResponse,
  RecentActivityResponse,
  UpcomingClosuresResponse,
} from "@/types/dashboard";

// A 403 here means the caller's role isn't in that endpoint's allow-list
// (some of these widgets are visible to a narrower role set than the page
// itself, e.g. Insights is PROGRAM_OWNER-only in the nav but its data
// endpoints also allow HR) — treated as "nothing to show", not an error
// toast, since it's an expected, RBAC-driven outcome rather than a bug.
function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

// A failed fetch (e.g. a transient 500 from the AI call, or a network
// blip) must never render as "nothing to show here" — that's a silent
// false negative. This gives every AI/data card one message for "you
// can't see this" (403) and a different one for "this actually broke."
export function queryProblem(
  query: { isError: boolean; error: unknown },
  forbiddenMessage: string
): string | null {
  if (!query.isError) return null;
  return isForbidden(query.error) ? forbiddenMessage : "Couldn't load this right now — try refreshing the page.";
}

export function useStageCounts() {
  return useQuery({
    queryKey: ["dashboard", "stage-counts"],
    queryFn: () => api.get<StageCountsResponse>("/dashboard/stage-counts"),
    retry: false,
  });
}

export function useSlaBreaches() {
  return useQuery({
    queryKey: ["dashboard", "sla-breaches"],
    queryFn: () => api.get<SlaBreachesResponse>("/dashboard/sla-breaches"),
    retry: false,
  });
}

export function useCycleTime() {
  return useQuery({
    queryKey: ["dashboard", "cycle-time"],
    queryFn: () => api.get<CycleTimeResponse>("/dashboard/cycle-time"),
    retry: false,
  });
}

export function useDashboardNarrative() {
  return useQuery({
    queryKey: ["dashboard", "ai-narrative"],
    queryFn: () => api.get<DashboardNarrativeResponse>("/dashboard/ai-narrative"),
    retry: false,
  });
}

export function useDuplicateAlerts() {
  return useQuery({
    queryKey: ["dashboard", "duplicate-alerts"],
    queryFn: () => api.get<DuplicateAlertsResponse>("/dashboard/duplicate-alerts"),
    retry: false,
  });
}

export function useSlaRiskPredictions() {
  return useQuery({
    queryKey: ["dashboard", "sla-risk-predictions"],
    queryFn: () => api.get<SlaRiskPredictionsResponse>("/dashboard/sla-risk-predictions"),
    retry: false,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: () => api.get<RecentActivityResponse>("/dashboard/recent-activity"),
    retry: false,
  });
}

export function useUpcomingClosures() {
  return useQuery({
    queryKey: ["dashboard", "upcoming-closures"],
    queryFn: () => api.get<UpcomingClosuresResponse>("/dashboard/upcoming-closures"),
    retry: false,
  });
}

export { isForbidden };
