import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateReferralInput, CreateReferralResponse, OverrideInput } from "@/types/referrals";

export function useCreateReferral() {
  return useMutation({
    mutationFn: (input: CreateReferralInput) => api.post<CreateReferralResponse>("/referrals", input),
  });
}

// Frontend Day F5 Workflow Kanban's HR_REVIEW -> JOINING_PENDING/REJECTED
// drags. Takes the *referral* id, not the internship id — hr-review's
// APPROVE path is a two-hop transition (HR_REVIEW -> APPROVED ->
// JOINING_PENDING in one call), so JOINING_PENDING is the only landing
// status a caller ever actually observes.
export function useHrReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      referralId,
      decision,
      reason,
    }: {
      referralId: string;
      decision: "APPROVE" | "REJECT";
      reason?: string;
    }) => api.post(`/referrals/${referralId}/hr-review`, { decision, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internships", "list"] }),
  });
}

export function useOverrideReferralField() {
  return useMutation({
    mutationFn: ({ referralId, ...input }: OverrideInput & { referralId: string }) =>
      api.patch(`/referrals/${referralId}/override`, input),
  });
}
