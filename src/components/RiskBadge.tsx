import { CircleAlert, TriangleAlert, OctagonAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/types/dashboard";
import { cn } from "@/lib/utils";

// Status color, never alone — always icon + label (dataviz skill: status
// colors are reserved and must never carry meaning by hue alone).
const RISK_CONFIG: Record<RiskLevel, { icon: typeof CircleAlert; label: string; className: string }> = {
  LOW: { icon: CircleAlert, label: "Low", className: "text-status-good border-status-good/30 bg-status-good/10" },
  MEDIUM: {
    icon: TriangleAlert,
    label: "Medium",
    className: "text-status-warning border-status-warning/40 bg-status-warning/10",
  },
  HIGH: {
    icon: OctagonAlert,
    label: "High",
    className: "text-status-critical border-status-critical/30 bg-status-critical/10",
  },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const config = RISK_CONFIG[level];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", config.className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
