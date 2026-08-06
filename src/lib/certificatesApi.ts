import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { getStoredToken } from "@/lib/authStorage";
import type { IssuedCertificatesResponse, PendingCertificatesResponse } from "@/types/certificates";

export function useIssuedCertificates() {
  return useQuery({
    queryKey: ["certificates", "issued"],
    queryFn: () => api.get<IssuedCertificatesResponse>("/certificates?status=issued"),
  });
}

export function usePendingCertificates() {
  return useQuery({
    queryKey: ["certificates", "pending"],
    queryFn: () => api.get<PendingCertificatesResponse>("/certificates?status=pending"),
  });
}

export function useRevokeCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/certificates/${id}/revoke`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["certificates"] }),
  });
}

// GET /certificates/:id/download returns a raw PDF stream, not JSON, so it
// bypasses api.ts's JSON-typed request() helper — same reasoning as
// useUploadAttachment's raw fetch in joiningFormsApi.ts. A plain <a href>
// can't carry the Authorization header a bare navigation would need, so
// this fetches the blob in JS and triggers the download from an object URL.
export async function downloadCertificate(id: string, referenceNumber: string): Promise<void> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const apiBase = import.meta.env.VITE_API_BASE_URL as string;

  const res = await fetch(`${apiBase}/certificates/${id}/download`, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, "Could not download this certificate.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${referenceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
