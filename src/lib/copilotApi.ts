import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Role } from "@/lib/roles";

export interface CopilotAnalyzeResponse {
  answer: string;
  variant: "risk" | "operational";
}

export interface ChatbotAskResponse {
  answer: string;
  grounded: boolean;
  escalationTask: unknown;
}

// Mirrors the backend's PERMISSION_MATRIX exactly (chatbot.ask / copilot.analyze
// in src/middleware/rbac.ts) — MENTOR is the only role in both. Needed here,
// not just in navigation.ts, because within one page ("AI Copilot") the two
// underlying endpoints have different, non-overlapping-for-most-roles RBAC.
const CHATBOT_ROLES: Role[] = ["REFERRER", "CANDIDATE", "MENTOR"];
const COPILOT_ANALYZE_ROLES: Role[] = ["HR", "PROGRAM_OWNER", "MENTOR", "IT_ADMIN", "ADMIN_SECURITY"];

// Keyword check deciding which backend path a question goes to when a role
// can reach *both* endpoints — mirrors the server's own risk-keyword
// classifier (src/lib/copilotAnalyze.ts) for consistency, but its actual job
// here is FAQ vs operational routing, not risk vs non-risk. Doesn't need to
// be perfect for Day F2 per the brief.
const FAQ_KEYWORDS = [
  "how do i",
  "how to",
  "what is",
  "what are",
  "where do i",
  "where can i",
  "policy",
  "process for",
  "steps to",
];

function isFaqQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return FAQ_KEYWORDS.some((keyword) => lower.includes(keyword));
}

// A role that can only reach one of the two endpoints must always go there —
// relying on the FAQ keyword heuristic alone would misroute a legitimately
// FAQ-shaped-but-unmatched question (or literally anything, e.g. "Hi") to
// the endpoint that role can't call, turning a 200 into a guaranteed 403.
// Only a role in *both* lists (MENTOR) actually needs the heuristic.
export function pickCopilotChannel(role: Role, question: string): "chatbot" | "analyze" | "none" {
  const canChat = CHATBOT_ROLES.includes(role);
  const canAnalyze = COPILOT_ANALYZE_ROLES.includes(role);
  if (canChat && canAnalyze) return isFaqQuestion(question) ? "chatbot" : "analyze";
  if (canChat) return "chatbot";
  if (canAnalyze) return "analyze";
  return "none";
}

export function useCopilotAnalyze() {
  return useMutation({
    mutationFn: (question: string) => api.post<CopilotAnalyzeResponse>("/copilot/analyze", { question }),
  });
}

export function useChatbotAsk() {
  return useMutation({
    mutationFn: (question: string) => api.post<ChatbotAskResponse>("/chatbot/ask", { question }),
  });
}
