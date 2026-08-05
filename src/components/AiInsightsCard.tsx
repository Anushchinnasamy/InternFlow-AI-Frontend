import { ThumbsUp, ThumbsDown } from "lucide-react";
import { AiCard } from "@/components/AiCard";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { Progress } from "@/components/ui/progress";

interface AiInsightsCardProps {
  matchScore: number;
  recommendation: "HIRE" | "MAYBE" | "REJECT";
  strengths: string[];
  weaknesses: string[];
  aiSummary: string;
}

// Shared between the Resume Analyzer's results and the Candidate
// Evaluation page — same AI output shape (MATCH_SCORE), same visual
// treatment, built once.
export function AiInsightsCard({ matchScore, recommendation, strengths, weaknesses, aiSummary }: AiInsightsCardProps) {
  return (
    <AiCard title="AI Insights" description="Model-generated match analysis — advisory only.">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Match Score</span>
              <span className="text-2xl font-semibold tabular-nums">{matchScore}%</span>
            </div>
            <Progress value={matchScore} />
          </div>
          <RecommendationBadge recommendation={recommendation} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <ThumbsUp className="size-3.5 text-status-good" />
              Strengths
            </h4>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <ThumbsDown className="size-3.5 text-status-critical" />
              Weaknesses
            </h4>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="mb-1 text-sm font-medium">AI Summary</h4>
          <p className="text-sm text-muted-foreground">{aiSummary}</p>
        </div>
      </div>
    </AiCard>
  );
}
