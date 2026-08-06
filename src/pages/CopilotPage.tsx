import { useState } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useCopilotAnalyze, useChatbotAsk, pickCopilotChannel } from "@/lib/copilotApi";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Which candidates are at SLA risk this week?",
  "Summarise onboarding bottlenecks.",
  "Draft an email to remind pending NDA signers.",
  "Compare top 5 candidates for Atlas Platform.",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isAdvisory?: boolean;
}

export default function CopilotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const copilotAnalyze = useCopilotAnalyze();
  const chatbotAsk = useChatbotAsk();

  const isSending = copilotAnalyze.isPending || chatbotAsk.isPending;

  async function sendQuestion(question: string) {
    if (!question.trim() || isSending || !user) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Role-aware routing: a role that can only reach one of the two backend
    // endpoints always goes there (see pickCopilotChannel) — the FAQ keyword
    // heuristic only decides between them for a role that can reach both.
    // Getting this wrong previously meant e.g. a REFERRER's "Hi" (matching
    // no FAQ keyword) silently routed to /copilot/analyze, which REFERRER
    // has no access to at all — a guaranteed 403 no matter what they typed.
    const channel = pickCopilotChannel(user.role, question);

    if (channel === "none") {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: "AI Copilot isn't available for your role." },
      ]);
      return;
    }

    try {
      if (channel === "chatbot") {
        const result = await chatbotAsk.mutateAsync(question);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", text: result.answer, isAdvisory: true },
        ]);
      } else {
        const result = await copilotAnalyze.mutateAsync(question);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", text: result.answer, isAdvisory: true },
        ]);
      }
    } catch (error) {
      // A 500 here is almost always the upstream AI provider (rate limit,
      // transient outage) — its raw error body is not something to show a
      // user, so only a 400 (our own validation message) is ever surfaced
      // verbatim; everything else gets a generic, honest fallback.
      let message: string;
      if (error instanceof ApiError && error.status === 403) {
        message = "Your role doesn't have access to this type of question. Contact HR or your Program Owner.";
      } else if (error instanceof ApiError && error.status === 400) {
        message = error.message;
      } else if (error instanceof ApiError && error.status >= 500) {
        message = "The AI service is temporarily unavailable (busy or rate-limited). Please try again shortly.";
      } else {
        message = "Something went wrong answering that question.";
      }
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: message }]);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Copilot"
        description="Ask questions about the internship process — grounded only in the official knowledge base."
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendQuestion(prompt)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="flex min-h-64 flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ai-from to-ai-to text-white">
                    <Sparkles className="size-3.5" />
                  </div>
                )}
                <div className={cn("flex max-w-md flex-col gap-1", message.role === "user" && "items-end")}>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-ai-from/20 bg-gradient-to-br from-ai-from/10 to-ai-to/10"
                    )}
                  >
                    {message.text}
                  </div>
                  {message.isAdvisory && (
                    <Badge variant="outline" className="border-ai-from/30 text-[10px] text-muted-foreground">
                      AI-generated, advisory only
                    </Badge>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="size-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isSending && <Skeleton className="h-9 w-48" />}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuestion(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about candidates, SLA risk, or the internship process…"
              disabled={isSending}
            />
            <Button type="submit" disabled={isSending || !input.trim()}>
              <Send />
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
