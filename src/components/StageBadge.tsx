import { Badge } from "@/components/ui/badge";
import { statusLabel, statusTone } from "@/lib/statusMapping";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, string> = {
  default: "",
  good: "text-status-good border-status-good/30 bg-status-good/10",
  warning: "text-status-warning border-status-warning/40 bg-status-warning/10",
  critical: "text-status-critical border-status-critical/30 bg-status-critical/10",
};

// Colors the badge by the backend's real InternshipStatus value/order —
// not the reference design's swapped NDA/Non-Worker-ID sequence.
export function StageBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[statusTone(status)])}>
      {statusLabel(status)}
    </Badge>
  );
}
