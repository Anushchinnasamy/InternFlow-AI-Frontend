import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { EvaluationsListResponse, Evaluation, RubricInput, Decision } from "@/types/evaluations";

export function useCandidateEvaluations(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["candidates", candidateId, "evaluations"],
    queryFn: () => api.get<EvaluationsListResponse>(`/candidates/${candidateId}/evaluations`),
    enabled: !!candidateId,
  });
}

export function useEvaluateCandidate() {
  return useMutation({
    mutationFn: ({ candidateId, jobDescription }: { candidateId: string; jobDescription: string }) =>
      api.post<{ evaluation: Evaluation }>(`/candidates/${candidateId}/evaluate`, { jobDescription }),
  });
}

export function useUpdateRubric(candidateId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluationId, rubric }: { evaluationId: string; rubric: RubricInput }) =>
      api.patch<{ evaluation: Evaluation }>(`/evaluations/${evaluationId}/rubric`, rubric),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["candidates", candidateId, "evaluations"] });
    },
  });
}

export function useDecideEvaluation(candidateId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluationId, decision }: { evaluationId: string; decision: Decision }) =>
      api.post<{ evaluation: Evaluation }>(`/evaluations/${evaluationId}/decide`, { decision }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["candidates", candidateId, "evaluations"] });
    },
  });
}
