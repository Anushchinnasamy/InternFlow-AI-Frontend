import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateReferralInput, CreateReferralResponse, OverrideInput, PendingMentorConfirmation } from "@/types/referrals";

export function useCreateReferral() {
  return useMutation({
    mutationFn: (input: CreateReferralInput) => api.post<CreateReferralResponse>("/referrals", input),
  });
}

// Gap fix — nothing surfaced "referrals awaiting my confirmation" for a
// mentor anywhere in the app; /candidates/search's MENTOR scope needs an
// Internship to already exist, which mentor-confirm itself is what creates.
export function usePendingMentorConfirmations() {
  return useQuery({
    queryKey: ["referrals", "pending-confirmation"],
    queryFn: () => api.get<{ referrals: PendingMentorConfirmation[] }>("/referrals/pending-confirmation"),
  });
}

export function useMentorConfirmReferral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      referralId,
      decision,
      reason,
    }: {
      referralId: string;
      decision: "CONFIRM" | "DECLINE";
      reason?: string;
    }) => api.post(`/referrals/${referralId}/mentor-confirm`, { decision, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals", "pending-confirmation"] });
      queryClient.invalidateQueries({ queryKey: ["internships", "list"] });
    },
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
