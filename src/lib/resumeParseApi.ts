import { useMutation } from "@tanstack/react-query";
import { getStoredToken } from "@/lib/authStorage";
import { ApiError } from "@/lib/api";
import type { ResumeParseResponse } from "@/types/resumeParse";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// Multipart upload — the shared api.ts helper only does JSON bodies, so
// this calls fetch directly rather than stretching that helper to cover
// FormData too.
async function uploadResume(file: File): Promise<ResumeParseResponse> {
  const formData = new FormData();
  formData.append("resume", file);

  const token = getStoredToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}/ai/resume-parse`, { method: "POST", headers, body: formData });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `Request failed (${res.status})`, payload?.details);
  }
  return payload as ResumeParseResponse;
}

export function useResumeUpload() {
  return useMutation({ mutationFn: uploadResume });
}

// Text-extraction only (zero AI calls) — used by the Resume Analyzer's
// "Upload File" tab, which just needs raw text to hand to
// POST /candidates/evaluate-adhoc rather than the full resume-parse
// pipeline's structured/confidence output.
async function extractResumeText(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("resume", file);

  const token = getStoredToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}/ai/extract-text`, { method: "POST", headers, body: formData });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `Request failed (${res.status})`, payload?.details);
  }
  return (payload as { resumeText: string }).resumeText;
}

export function useExtractResumeText() {
  return useMutation({ mutationFn: extractResumeText });
}
