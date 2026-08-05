import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  isLoading?: boolean;
  tone?: "default" | "good" | "warning" | "critical";
  className?: string;
}

const TONE_TEXT: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-foreground",
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
};

// Stat tile, per the dataviz skill's form heuristic: a single current
// value is a stat tile, not a one-bar chart. No fabricated trend delta —
// the backend doesn't retain historical stage-count snapshots yet, so a
// "+12%"-style delta would have to be invented; this shows the current
// value only until that history exists.
export function KpiCard({ label, value, icon: Icon, isLoading, tone = "default", className }: KpiCardProps) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {isLoading ? (
            <Skeleton className="h-7 w-14" />
          ) : (
            <span className={cn("text-2xl font-semibold tabular-nums", TONE_TEXT[tone])}>{value}</span>
          )}
        </div>
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
