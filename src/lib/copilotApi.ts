import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CopilotAnalyzeResponse {
  answer: string;
  variant: "risk" | "operational";
}

export interface ChatbotAskResponse {
  answer: string;
  grounded: boolean;
  escalationTask: unknown;
}

// Keyword check deciding which backend path a question goes to — mirrors
// the server's own risk-keyword classifier (src/lib/copilotAnalyze.ts) for
// consistency, but its actual job here is FAQ vs operational routing, not
// risk vs non-risk. Doesn't need to be perfect for Day F2 per the brief.
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

export function isFaqQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return FAQ_KEYWORDS.some((keyword) => lower.includes(keyword));
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
