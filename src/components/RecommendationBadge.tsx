import { ThumbsUp, HelpCircle, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Recommendation = "HIRE" | "MAYBE" | "REJECT";

const CONFIG: Record<Recommendation, { icon: typeof ThumbsUp; label: string; className: string }> = {
  HIRE: { icon: ThumbsUp, label: "Hire", className: "text-status-good border-status-good/30 bg-status-good/10" },
  MAYBE: { icon: HelpCircle, label: "Maybe", className: "text-status-warning border-status-warning/40 bg-status-warning/10" },
  REJECT: { icon: ThumbsDown, label: "Reject", className: "text-status-critical border-status-critical/30 bg-status-critical/10" },
};

export function RecommendationBadge({ recommendation }: { recommendation: Recommendation }) {
  const config = CONFIG[recommendation];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", config.className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
