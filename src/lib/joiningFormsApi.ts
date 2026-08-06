import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getStoredToken } from "@/lib/authStorage";
import type { JoiningRecord, CandidateMeResponse } from "@/types/joiningRecord";

export function useCandidateMe(enabled: boolean) {
  return useQuery({
    queryKey: ["candidates", "me"],
    queryFn: () => api.get<CandidateMeResponse>("/candidates/me"),
    enabled,
  });
}

export function useJoiningRecord(id: string | undefined) {
  return useQuery({
    queryKey: ["joining-forms", id],
    queryFn: () => api.get<{ joiningRecord: JoiningRecord }>(`/joining-forms/${id}?reveal=true`),
    enabled: !!id,
  });
}

// Bootstraps a CANDIDATE's own joining record: create-or-fetch, since
// POST / 409s with the existing id once one already exists (no separate
// "get my own record" endpoint — see backend's loadOwnedJoiningRecord).
// Uses a raw fetch rather than api.post because the 409 body's
// `joiningFormId` field sits at the top level, not under the `details` key
// the shared ApiError wrapper preserves.
export function useCreateOrGetOwnJoiningRecord() {
  return useMutation({
    mutationFn: async () => {
      const token = getStoredToken();
      const headers = new Headers({ "Content-Type": "application/json" });
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const apiBase = import.meta.env.VITE_API_BASE_URL as string;

      const createRes = await fetch(`${apiBase}/joining-forms`, { method: "POST", headers });
      const createPayload = await createRes.json();

      if (createRes.status === 201) {
        return createPayload.joiningRecord as JoiningRecord;
      }
      if (createRes.status === 409 && createPayload.joiningFormId) {
        const result = await api.get<{ joiningRecord: JoiningRecord }>(
          `/joining-forms/${createPayload.joiningFormId}?reveal=true`
        );
        return result.joiningRecord;
      }
      throw new Error(createPayload?.error ?? "Could not load joining form");
    },
  });
}

export function usePatchJoiningRecord(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch<{ joiningRecord: JoiningRecord }>(`/joining-forms/${id}`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["joining-forms", id] });
    },
  });
}

export function useSubmitJoiningRecord(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/joining-forms/${id}/submit`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["joining-forms", id] });
    },
  });
}

export function useVerifyJoiningRecord(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { decision: "LOCK" | "RETURN_FOR_CORRECTION"; reason?: string; fieldsToCorrect?: string[] }) =>
      api.post(`/joining-forms/${id}/verify`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["joining-forms", id] });
    },
  });
}

// Frontend Day F5 Workflow Kanban's JOINING_SUBMITTED -> VERIFIED drag.
// useVerifyJoiningRecord above bakes the id in at hook-creation time (fine
// for a single detail page); the Kanban has one card per row with its own
// joiningRecordId, so the id needs to travel with each mutate() call instead.
export function useVerifyJoiningRecordById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "LOCK" | "RETURN_FOR_CORRECTION" }) =>
      api.post(`/joining-forms/${id}/verify`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internships", "list"] }),
  });
}

export function useUploadAttachment(id: string | undefined) {
  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: "GOVT_ID" | "EDUCATION_CERT" }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      const token = getStoredToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const apiBase = import.meta.env.VITE_API_BASE_URL as string;
      const res = await fetch(`${apiBase}/joining-forms/${id}/attachments`, { method: "POST", headers, body: formData });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? "Upload failed");
      return payload;
    },
  });
}
