import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InternshipsListResponse } from "@/types/internshipsList";
import type { DocumentRow } from "@/types/joiningRecord";

export function useInternshipsList(statuses?: string[]) {
  const query = statuses ? `?status=${statuses.join(",")}` : "";
  return useQuery({
    queryKey: ["internships", "list", statuses ?? "all"],
    queryFn: () => api.get<InternshipsListResponse>(`/internships${query}`),
  });
}

export function useInternshipDocuments(internshipId: string | undefined) {
  return useQuery({
    queryKey: ["internships", internshipId, "documents"],
    queryFn: () => api.get<{ documents: DocumentRow[] }>(`/internships/${internshipId}/documents`),
    enabled: !!internshipId,
  });
}

function useInvalidateInternshipsList() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["internships", "list"] });
}

export function useExpireNda() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/nda/expire`),
    onSuccess: () => invalidate(),
  });
}

export function useIssueNonWorkerId() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: ({ internshipId, nonWorkerId }: { internshipId: string; nonWorkerId: string }) =>
      api.post(`/internships/${internshipId}/non-worker-id`, { nonWorkerId }),
    onSuccess: () => invalidate(),
  });
}

export function useRevokeNonWorkerId() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/non-worker-id-deactivate`),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateChecklist() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: ({ taskId, item, status }: { taskId: string; item: string; status: string }) =>
      api.patch(`/tasks/${taskId}/checklist`, { item, status }),
    onSuccess: () => invalidate(),
  });
}

export function useAdProvision() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/ad-provision`),
    onSuccess: () => invalidate(),
  });
}

export function useSiteAccess() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: ({ internshipId, badgeNumber, accessZones }: { internshipId: string; badgeNumber: string; accessZones: string[] }) =>
      api.post(`/internships/${internshipId}/site-access`, { badgeNumber, accessZones }),
    onSuccess: () => invalidate(),
  });
}

export function useReadyCheck() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/ready-check`),
    onSuccess: () => invalidate(),
  });
}

// Frontend Day F5 Intern Lifecycle page — the mentor's "the work is done"
// declaration. Deliberately distinct from useCloseInternship below: this
// never moves Internship.status by itself (see internships.ts) — it just
// stamps mentorCompletionConfirmedAt/Satisfactory/Remark, which the Closure
// page's exit checklist and the certificate-request gate both read.
export function useMentorConfirmCompletion() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: ({ internshipId, satisfactory, remark }: { internshipId: string; satisfactory: boolean; remark: string }) =>
      api.post(`/internships/${internshipId}/mentor-confirm-completion`, { satisfactory, remark }),
    onSuccess: () => invalidate(),
  });
}

// Mentor's "the internship needs more time" request — creates an
// EXTENSION_REQUEST task that stays pending until both HR and Program
// Owner separately approve it (see useDecideExtension below).
export function useRequestExtension() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: ({ internshipId, requestedEndDate, justification }: { internshipId: string; requestedEndDate: string; justification: string }) =>
      api.post(`/internships/${internshipId}/extend`, { requestedEndDate, justification }),
    onSuccess: () => invalidate(),
  });
}

// HR and Program Owner each call this with their own token — one approval
// alone just records that side's decision; the internship only flips to
// EXTENDED once both have approved (or ends immediately on a REJECT from
// either side).
export function useDecideExtension() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: ({ taskId, decision }: { taskId: string; decision: "APPROVE" | "REJECT" }) =>
      api.post<{ message?: string }>(`/extensions/${taskId}/decide`, { decision }),
    onSuccess: () => invalidate(),
  });
}

// Frontend Day F5 Closure page — ACTIVE/EXTENDED -> COMPLETED. 409s if
// today is before the internship's end date; the Closure page's countdown
// badge is what keeps the button disabled until then rather than relying on
// this error alone.
export function useCloseInternship() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/close`),
    onSuccess: () => invalidate(),
  });
}

export function useAdDeactivate() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/ad-deactivate`),
    onSuccess: () => invalidate(),
  });
}

export function useBadgeReturn() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/badge-return`),
    onSuccess: () => invalidate(),
  });
}

// COMPLETED -> CLOSED, once the deactivation trio is done. 409s with
// `details: { missing }` if not — surfaced as-is (see ApiError.details)
// rather than re-derived client-side, since the backend is the source of
// truth for what's still outstanding.
export function useCloseCheck() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post<{ internship: unknown }>(`/internships/${internshipId}/close-check`),
    onSuccess: () => invalidate(),
  });
}

// Workflow Kanban's READY_TO_START -> ACTIVE (MENTOR-only) and -> DELAYED
// (MENTOR/HR) drags, and its any-non-terminal -> WITHDRAWN off-ramp drag.
export function useStartConfirm() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/start-confirm`),
    onSuccess: () => invalidate(),
  });
}

export function useMarkDelayed() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/mark-delayed`),
    onSuccess: () => invalidate(),
  });
}

export function useWithdrawInternship() {
  const invalidate = useInvalidateInternshipsList();
  return useMutation({
    mutationFn: ({ internshipId, reason }: { internshipId: string; reason: string }) =>
      api.post(`/internships/${internshipId}/withdraw`, { reason }),
    onSuccess: () => invalidate(),
  });
}

// Certificates page's "Generate" action chains whichever of these two steps
// hasn't happened yet — see resolveNextCertificateStep in CertificatesPage.
export function useApproveCertificateRequest() {
  const invalidate = useInvalidateInternshipsList();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/certificate-request/approve`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}

// Also invalidates ["certificates"] (Frontend Day F5 Certificates page's
// Issued/Pending tabs), not just the internships list — this is the one
// mutation that actually creates a new Certificate row.
export function useGenerateCertificate() {
  const invalidate = useInvalidateInternshipsList();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/certificate/generate`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}
