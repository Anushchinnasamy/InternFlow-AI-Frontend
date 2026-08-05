// Groups InternshipStatus buckets (from /dashboard/stage-counts) into the
// KPI/funnel groupings Day F2's pages need. The backend only exposes raw
// per-status counts — this mapping is UI-only and documents the specific
// stage->grouping choices, per the status model in CLAUDE.md:
//   DRAFT -> SUBMITTED -> MENTOR_REVIEW -> HR_REVIEW -> APPROVED ->
//   JOINING_PENDING -> JOINING_SUBMITTED -> VERIFIED -> ID_ISSUED ->
//   NDA_PENDING -> NDA_SIGNED -> ACCESS_PROVISIONED -> READY_TO_START ->
//   ACTIVE -> EXTENDED -> COMPLETED -> CLOSED
// (terminal off-ramps: REJECTED, WITHDRAWN, EXPIRED, CANCELLED)

export function sumCounts(counts: Record<string, number>, statuses: readonly string[]): number {
  return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
}

export function totalCount(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

// "Currently at stage N" counts aren't funnel-shaped on their own (a
// snapshot of where things sit right now isn't monotonically decreasing —
// e.g. more internships can be sitting at a later stage than an earlier
// one). A funnel needs "reached at least stage N", which — since the
// status model is a strict linear progression — is the running total from
// stage N through the end of the pipeline. This is monotonically
// non-increasing by construction, which is what keeps the funnel chart's
// shape from crossing itself.
export function cumulativeFunnelCounts(
  counts: Record<string, number>,
  order: readonly string[]
): Array<{ stage: string; count: number }> {
  const result: Array<{ stage: string; count: number }> = [];
  let runningTotal = 0;
  for (let i = order.length - 1; i >= 0; i--) {
    runningTotal += counts[order[i]] ?? 0;
    result.unshift({ stage: order[i], count: runningTotal });
  }
  return result.filter((r) => r.count > 0);
}

// Ordered pipeline for the Workflow Funnel / Stage Distribution charts —
// terminal off-ramps (REJECTED/WITHDRAWN/EXPIRED/CANCELLED) are excluded
// since a funnel reads left-to-right through the happy path.
export const PIPELINE_ORDER = [
  "DRAFT",
  "SUBMITTED",
  "MENTOR_REVIEW",
  "HR_REVIEW",
  "APPROVED",
  "JOINING_PENDING",
  "JOINING_SUBMITTED",
  "VERIFIED",
  "ID_ISSUED",
  "NDA_PENDING",
  "NDA_SIGNED",
  "ACCESS_PROVISIONED",
  "READY_TO_START",
  "ACTIVE",
  "EXTENDED",
  "COMPLETED",
  "CLOSED",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  MENTOR_REVIEW: "Mentor Review",
  HR_REVIEW: "HR Review",
  APPROVED: "Approved",
  JOINING_PENDING: "Joining Pending",
  JOINING_SUBMITTED: "Joining Submitted",
  VERIFIED: "Verified",
  ID_ISSUED: "ID Issued",
  NDA_PENDING: "NDA Pending",
  NDA_SIGNED: "NDA Signed",
  ACCESS_PROVISIONED: "Access Provisioned",
  READY_TO_START: "Ready to Start",
  ACTIVE: "Active",
  EXTENDED: "Extended",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  DELAYED: "Delayed",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// For the Onboarding progress tracker: is `status` at or past `threshold`
// in the real pipeline order? Terminal off-ramps (REJECTED etc., not in
// PIPELINE_ORDER) are never "past" anything.
export function isAtOrPastStage(status: string, threshold: string): boolean {
  const statusIndex = PIPELINE_ORDER.indexOf(status as (typeof PIPELINE_ORDER)[number]);
  const thresholdIndex = PIPELINE_ORDER.indexOf(threshold as (typeof PIPELINE_ORDER)[number]);
  if (statusIndex === -1 || thresholdIndex === -1) return false;
  return statusIndex >= thresholdIndex;
}

export const KPI_GROUPS = {
  pendingEvaluation: ["MENTOR_REVIEW", "HR_REVIEW"],
  pendingNda: ["NDA_PENDING"],
  pendingAccess: ["NDA_SIGNED"],
  activeInterns: ["ACTIVE", "EXTENDED"],
  completed: ["COMPLETED", "CLOSED"],
} as const;

// Stage-badge tone, for the Candidates table — grouped by what the stage
// means, not the raw enum value. Uses the same status palette as
// RiskBadge/KpiCard (good/warning/critical) plus a neutral default for
// early/in-progress stages.
export type StatusTone = "default" | "good" | "warning" | "critical";

const TERMINAL_NEGATIVE = new Set(["REJECTED", "WITHDRAWN", "EXPIRED", "CANCELLED"]);
const WAITING = new Set([
  "MENTOR_REVIEW",
  "HR_REVIEW",
  "JOINING_PENDING",
  "JOINING_SUBMITTED",
  "NDA_PENDING",
  "DELAYED",
]);
const HEALTHY = new Set(["ACTIVE", "EXTENDED", "READY_TO_START", "COMPLETED", "CLOSED", "APPROVED"]);

export function statusTone(status: string): StatusTone {
  if (TERMINAL_NEGATIVE.has(status)) return "critical";
  if (WAITING.has(status)) return "warning";
  if (HEALTHY.has(status)) return "good";
  return "default";
}
