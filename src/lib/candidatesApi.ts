import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CandidateSearchResponse,
  Candidate360Response,
  CreateCandidateInput,
  CreateCandidateResponse,
  PrecheckInput,
  PrecheckResponse,
} from "@/types/candidates";
import type { AdhocEvaluationResult } from "@/types/evaluations";

export function useCandidateSearch(query: string) {
  return useQuery({
    queryKey: ["candidates", "search", query],
    queryFn: () => api.get<CandidateSearchResponse>(`/candidates/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
  });
}

export function useCandidate360(id: string | undefined) {
  return useQuery({
    queryKey: ["candidates", "360", id],
    queryFn: () => api.get<Candidate360Response>(`/candidates/${id}/360`),
    enabled: !!id,
  });
}

export function useCreateCandidate() {
  return useMutation({
    mutationFn: (input: CreateCandidateInput) => api.post<CreateCandidateResponse>("/candidates", input),
  });
}

export function usePrecheck() {
  return useMutation({
    mutationFn: (input: PrecheckInput) => api.post<PrecheckResponse>("/candidates/precheck", input),
  });
}

export function useEvaluateAdhoc() {
  return useMutation({
    mutationFn: (input: { resumeText: string; jobDescription: string }) =>
      api.post<{ evaluation: AdhocEvaluationResult }>("/candidates/evaluate-adhoc", input),
  });
}
