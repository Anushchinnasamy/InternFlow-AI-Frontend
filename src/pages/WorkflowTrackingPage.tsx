import { useMemo, useState } from "react";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useInternshipsList,
  useIssueNonWorkerId,
  useReadyCheck,
  useStartConfirm,
  useMarkDelayed,
  useCloseInternship,
  useCloseCheck,
  useWithdrawInternship,
} from "@/lib/internshipsApi";
import { useHrReview } from "@/lib/referralsApi";
import { useVerifyJoiningRecordById } from "@/lib/joiningFormsApi";
import { statusLabel } from "@/lib/statusMapping";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InternshipListItem } from "@/types/internshipsList";

// The full InternshipStatus enum, in the backend's real order (schema.prisma),
// not the funnel-only PIPELINE_ORDER in statusMapping.ts (which drops DELAYED
// and the off-ramps since those don't fit a left-to-right funnel).
const KANBAN_STATUS_ORDER = [
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
  "DELAYED",
  "ACTIVE",
  "EXTENDED",
  "COMPLETED",
  "CLOSED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
  "CANCELLED",
] as const;

// DRAFT/SUBMITTED/MENTOR_REVIEW only ever exist as Referral rows (the
// Internship row this board reads from isn't created until mentor-confirm),
// and APPROVED/ID_ISSUED/ACCESS_PROVISIONED are intermediate stops inside a
// single-endpoint two-hop transition (hr-review, non-worker-id, ready-check
// respectively) — an Internship is never externally observed sitting in any
// of these six. Their columns are honestly, structurally always empty.
const STRUCTURALLY_EMPTY = new Set(["DRAFT", "SUBMITTED", "MENTOR_REVIEW", "APPROVED", "ID_ISSUED", "ACCESS_PROVISIONED"]);

const TERMINAL_STATUSES = new Set(["CLOSED", "REJECTED", "WITHDRAWN", "EXPIRED", "CANCELLED"]);

interface TransitionSpec {
  needsInput?: "reason" | "nonWorkerId";
  execute: (value?: string) => Promise<void>;
}

interface PendingInput {
  row: InternshipListItem;
  to: string;
  kind: "reason" | "nonWorkerId";
  execute: (value?: string) => Promise<void>;
}

export default function WorkflowTrackingPage() {
  const { data, isPending, error } = useInternshipsList();
  const hrReview = useHrReview();
  const verifyJoiningRecord = useVerifyJoiningRecordById();
  const issueNonWorkerId = useIssueNonWorkerId();
  const readyCheck = useReadyCheck();
  const startConfirm = useStartConfirm();
  const markDelayed = useMarkDelayed();
  const closeInternship = useCloseInternship();
  const closeCheck = useCloseCheck();
  const withdrawInternship = useWithdrawInternship();

  const [pendingInput, setPendingInput] = useState<PendingInput | null>(null);
  const [inputValue, setInputValue] = useState("");

  const rows = useMemo(() => data?.internships ?? [], [data]);

  const byStatus = useMemo(() => {
    const map = new Map<string, InternshipListItem[]>();
    for (const status of KANBAN_STATUS_ORDER) map.set(status, []);
    for (const row of rows) {
      if (!map.has(row.status)) map.set(row.status, []);
      map.get(row.status)!.push(row);
    }
    return map;
  }, [rows]);

  // The one (fromStatus, toStatus) -> real-endpoint lookup table. Returns
  // null for any edge with no single-call endpoint reachable from this
  // board — those drags are rejected outright rather than silently allowed.
  function resolveTransition(row: InternshipListItem, to: string): TransitionSpec | null {
    const from = row.status;

    if (to === "WITHDRAWN" && !TERMINAL_STATUSES.has(from)) {
      return {
        needsInput: "reason",
        execute: async (reason) => {
          await withdrawInternship.mutateAsync({ internshipId: row.id, reason: reason! });
        },
      };
    }
    if (from === "HR_REVIEW" && to === "JOINING_PENDING") {
      return { execute: async () => { await hrReview.mutateAsync({ referralId: row.referralId, decision: "APPROVE" }); } };
    }
    if (from === "HR_REVIEW" && to === "REJECTED") {
      return {
        needsInput: "reason",
        execute: async (reason) => { await hrReview.mutateAsync({ referralId: row.referralId, decision: "REJECT", reason }); },
      };
    }
    if (from === "JOINING_SUBMITTED" && to === "VERIFIED") {
      if (!row.joiningRecordId) return null;
      return { execute: async () => { await verifyJoiningRecord.mutateAsync({ id: row.joiningRecordId!, decision: "LOCK" }); } };
    }
    if (from === "VERIFIED" && (to === "ID_ISSUED" || to === "NDA_PENDING")) {
      return {
        needsInput: "nonWorkerId",
        execute: async (value) => { await issueNonWorkerId.mutateAsync({ internshipId: row.id, nonWorkerId: value! }); },
      };
    }
    if (from === "NDA_SIGNED" && (to === "ACCESS_PROVISIONED" || to === "READY_TO_START")) {
      return { execute: async () => { await readyCheck.mutateAsync(row.id); } };
    }
    if (from === "READY_TO_START" && to === "ACTIVE") {
      return { execute: async () => { await startConfirm.mutateAsync(row.id); } };
    }
    if (from === "READY_TO_START" && to === "DELAYED") {
      return { execute: async () => { await markDelayed.mutateAsync(row.id); } };
    }
    if ((from === "ACTIVE" || from === "EXTENDED") && to === "COMPLETED") {
      return { execute: async () => { await closeInternship.mutateAsync(row.id); } };
    }
    if (from === "COMPLETED" && to === "CLOSED") {
      return {
        execute: async () => {
          try {
            await closeCheck.mutateAsync(row.id);
          } catch (err) {
            if (err instanceof ApiError) {
              const missing = (err.details as { missing?: string[] } | undefined)?.missing;
              throw new ApiError(err.status, missing?.length ? `Still missing: ${missing.join(", ")}` : err.message);
            }
            throw err;
          }
        },
      };
    }
    return null;
  }

  async function runTransition(execute: (value?: string) => Promise<void>, value?: string) {
    try {
      await execute(value);
      toast.success("Moved.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "That transition could not be completed.");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const row = rows.find((r) => r.id === active.id);
    const toStatus = String(over.id);
    if (!row || row.status === toStatus) return;

    const spec = resolveTransition(row, toStatus);
    if (!spec) {
      toast.error(
        `Direct transition from ${statusLabel(row.status)} to ${statusLabel(toStatus)} isn't supported from this board — use the relevant page for this step.`
      );
      return;
    }
    if (spec.needsInput) {
      setPendingInput({ row, to: toStatus, kind: spec.needsInput, execute: spec.execute });
      setInputValue("");
      return;
    }
    void runTransition(spec.execute);
  }

  async function submitPendingInput() {
    if (!pendingInput) return;
    if (!inputValue.trim()) {
      toast.error(pendingInput.kind === "reason" ? "A reason is required." : "A Non-Worker ID is required.");
      return;
    }
    await runTransition(pendingInput.execute, inputValue);
    setPendingInput(null);
  }

  return (
    <>
      <PageHeader title="Workflow Tracking" description="Kanban view of every internship, by pipeline stage. Drag a card to advance it." />

      {error ? (
        <EmptyState message="Couldn't load the workflow board — try refreshing the page." />
      ) : isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {KANBAN_STATUS_ORDER.map((status) => (
              <KanbanColumn key={status} status={status} items={byStatus.get(status) ?? []} structurallyEmpty={STRUCTURALLY_EMPTY.has(status)} />
            ))}
          </div>
        </DndContext>
      )}

      <Dialog open={!!pendingInput} onOpenChange={(open) => !open && setPendingInput(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingInput?.kind === "reason" ? "Reason required" : "Non-Worker ID required"} — {pendingInput?.row.candidateName}
            </DialogTitle>
            <DialogDescription>
              Moving to {pendingInput && statusLabel(pendingInput.to)} needs one more piece of information.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={pendingInput?.kind === "reason" ? "Reason..." : "e.g. NWID-2026-0001"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingInput(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submitPendingInput()}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KanbanColumn({
  status,
  items,
  structurallyEmpty,
}: {
  status: string;
  items: InternshipListItem[];
  structurallyEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2",
        isOver && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium">{statusLabel(status)}</span>
        <Badge variant="outline" className="text-xs">
          {items.length}
        </Badge>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {items.length === 0 && structurallyEmpty ? (
          <p className="px-1 text-[11px] text-muted-foreground italic">Always empty — this stage advances automatically.</p>
        ) : (
          items.map((item) => <KanbanCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function KanbanCard({ item }: { item: InternshipListItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const daysInStage = differenceInCalendarDays(new Date(), new Date(item.stageEnteredAt));

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab touch-none py-0", isDragging && "z-10 opacity-60 shadow-lg")}
    >
      <CardContent className="flex flex-col gap-1.5 p-3">
        <p className="text-sm leading-tight font-medium">{item.candidateName}</p>
        <p className="text-xs text-muted-foreground">{daysInStage}d in stage</p>
        <div className="flex flex-wrap gap-1">
          {item.openTask && (
            <Badge variant="outline" className="text-[10px]">
              Owner: {item.openTask.assigneeRole}
            </Badge>
          )}
          {item.openTask?.slaBreached && (
            <Badge variant="outline" className="gap-1 border-status-critical/30 bg-status-critical/10 text-[10px] text-status-critical">
              <AlertTriangle className="size-2.5" /> At Risk
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
