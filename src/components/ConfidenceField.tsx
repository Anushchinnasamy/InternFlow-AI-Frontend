import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// Confidence-tiered treatment for an AI-prefilled field (Referral Intake):
// >=0.85 fills normally, 0.60-0.84 fills but is flagged amber for review,
// <0.60 is left blank by the caller entirely (this wrapper just doesn't
// render its flag in that case since there's nothing prefilled to flag).
export function ConfidenceField({ confidence, children }: { confidence?: number; children: ReactNode }) {
  const needsReview = confidence !== undefined && confidence >= 0.6 && confidence < 0.85;
  return (
    <div className={cn(needsReview && "rounded-lg ring-1 ring-status-warning/50 p-1 -m-1")}>
      {children}
      {needsReview && (
        <p className="mt-1 flex items-center gap-1 text-xs text-status-warning">
          <TriangleAlert className="size-3" />
          AI-filled, please review
        </p>
      )}
    </div>
  );
}
