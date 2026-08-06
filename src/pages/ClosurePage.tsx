import { useState } from "react";
import { toast } from "sonner";
import { differenceInCalendarDays } from "date-fns";
import { KeyRound, ShieldOff, IdCard, Wallet, Archive } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import {
  useInternshipsList,
  useCloseInternship,
  useCloseCheck,
  useUpdateChecklist,
  useAdDeactivate,
  useRevokeNonWorkerId,
  useBadgeReturn,
} from "@/lib/internshipsApi";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InternshipListItem } from "@/types/internshipsList";

const EXIT_CHECKLIST_LABELS: Record<string, string> = {
  assetReturn: "Asset Return",
  emailVpnDeprovision: "Email/VPN Deprovision",
  repositoryRevoke: "Repository Revoke",
  exitInterviewScheduled: "Exit Interview Scheduled",
  finalFeedbackSubmitted: "Final Feedback Submitted",
  certificateRequestRaised: "Certificate Request Raised",
};
const EXIT_CHECKLIST_MANUAL_ITEMS = ["assetReturn", "emailVpnDeprovision", "repositoryRevoke", "exitInterviewScheduled"];
const EXIT_CHECKLIST_ALL_ITEMS = Object.keys(EXIT_CHECKLIST_LABELS);

function countdownLabel(endDate: string): { label: string; overdue: boolean } {
  const days = differenceInCalendarDays(new Date(endDate), new Date());
  if (days > 0) return { label: `${days} day${days === 1 ? "" : "s"} left`, overdue: false };
  if (days === 0) return { label: "Due today", overdue: true };
  return { label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, overdue: true };
}

export default function ClosurePage() {
  const { user } = useAuth();
  const { data, isPending, error } = useInternshipsList(["ACTIVE", "EXTENDED", "COMPLETED"]);
  const closeInternship = useCloseInternship();
  const closeCheck = useCloseCheck();
  const updateChecklist = useUpdateChecklist();
  const adDeactivate = useAdDeactivate();
  const nonWorkerIdDeactivate = useRevokeNonWorkerId();
  const badgeReturn = useBadgeReturn();

  // Holds just the id, not the row object — the row is re-derived from
  // `rows` below on every render, so each step in the dialog reflects the
  // freshly-invalidated query result instead of a stale snapshot from when
  // the dialog was opened (which would still show "Deactivate" after a
  // successful call, until the dialog was closed and reopened).
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const rows = data?.internships ?? [];
  const deactivating = rows.find((r) => r.id === deactivatingId) ?? null;
  const upcoming = rows
    .filter((r) => r.status === "ACTIVE" || r.status === "EXTENDED")
    .filter((r) => differenceInCalendarDays(new Date(r.endDate), new Date()) <= 30);
  const awaitingExit = rows.filter((r) => r.status === "COMPLETED");

  async function handleClose(internshipId: string) {
    try {
      await closeInternship.mutateAsync(internshipId);
      toast.success("Internship closed out — exit checklist is now available below.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not close this internship.");
    }
  }

  async function toggleChecklistItem(row: InternshipListItem, item: string) {
    if (!row.exitChecklistTask) return;
    const current = row.exitChecklistTask.checklist?.[item] ?? "pending";
    const next = current === "provisioned" ? "pending" : "provisioned";
    try {
      await updateChecklist.mutateAsync({ taskId: row.exitChecklistTask.id, item, status: next });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update this checklist item.");
    }
  }

  async function runDeactivationStep(internshipId: string, step: "ad" | "nonWorkerId" | "badge") {
    try {
      if (step === "ad") await adDeactivate.mutateAsync(internshipId);
      if (step === "nonWorkerId") await nonWorkerIdDeactivate.mutateAsync(internshipId);
      if (step === "badge") await badgeReturn.mutateAsync(internshipId);
      toast.success("Done.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "That step could not be completed.");
    }
  }

  async function runCloseCheck(internshipId: string) {
    try {
      await closeCheck.mutateAsync(internshipId);
      toast.success("Internship closed.");
      setDeactivatingId(null);
    } catch (err) {
      if (err instanceof ApiError) {
        const missing = (err.details as { missing?: string[] } | undefined)?.missing;
        toast.error(missing && missing.length > 0 ? `Still missing: ${missing.join(", ")}` : err.message);
      } else {
        toast.error("Could not finalize closure.");
      }
    }
  }

  const isBusy = adDeactivate.isPending || nonWorkerIdDeactivate.isPending || badgeReturn.isPending || closeCheck.isPending;

  return (
    <>
      <PageHeader title="Closure" description="Close out completed internships: access deactivation, ID deactivation, and badge return." />

      <h3 className="mb-2 text-sm font-medium text-muted-foreground">Upcoming Closures</h3>
      <Card className="mb-6">
        <CardContent>
          {error ? (
            <EmptyState message="Couldn't load closure data — try refreshing the page." />
          ) : isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : upcoming.length === 0 ? (
            <EmptyState message="No internships ending in the next 30 days." />
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((row) => {
                const { label, overdue } = countdownLabel(row.endDate);
                const canClose = new Date() >= new Date(row.endDate);
                return (
                  <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="font-medium">{row.candidateName}</p>
                      <p className="text-xs text-muted-foreground">{row.projectTitle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(overdue ? "border-status-critical/30 bg-status-critical/10 text-status-critical" : "")}
                      >
                        {label}
                      </Badge>
                      <Button size="sm" disabled={!canClose || closeInternship.isPending} onClick={() => void handleClose(row.id)}>
                        Close
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <h3 className="mb-2 text-sm font-medium text-muted-foreground">Exit Checklist</h3>
      <Card>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : awaitingExit.length === 0 ? (
            <EmptyState message="No internships awaiting exit processing." />
          ) : (
            <div className="flex flex-col gap-3">
              {awaitingExit.map((row) => {
                const checklist = row.exitChecklistTask?.checklist ?? {};
                const remaining = EXIT_CHECKLIST_ALL_ITEMS.filter((item) => checklist[item] !== "provisioned").length;
                const allDone = remaining === 0;
                return (
                  <div key={row.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{row.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{row.projectTitle}</p>
                      </div>
                      <Badge variant="outline" className={allDone ? "border-status-good/30 bg-status-good/10 text-status-good" : ""}>
                        {allDone ? "All done" : `Complete ${remaining} more`}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {EXIT_CHECKLIST_ALL_ITEMS.map((item) => {
                        const status = checklist[item] ?? "pending";
                        const isAuto = !EXIT_CHECKLIST_MANUAL_ITEMS.includes(item);
                        const done = status === "provisioned";
                        return (
                          <button
                            key={item}
                            type="button"
                            disabled={isAuto || updateChecklist.isPending}
                            title={isAuto ? "Computed automatically from mentor confirmation / certificate request" : undefined}
                            onClick={() => void toggleChecklistItem(row, item)}
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-xs disabled:cursor-not-allowed",
                              done
                                ? "border-status-good/30 bg-status-good/10 text-status-good"
                                : "border-muted-foreground/30 text-muted-foreground",
                              isAuto && "opacity-70"
                            )}
                          >
                            {EXIT_CHECKLIST_LABELS[item]}
                          </button>
                        );
                      })}
                    </div>
                    {allDone && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => setDeactivatingId(row.id)}>
                          <Archive /> Deactivate &amp; Close
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deactivating} onOpenChange={(open) => !open && setDeactivatingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate access — {deactivating?.candidateName}</DialogTitle>
            <DialogDescription>
              This runs the AD account deactivation, Non-Worker ID deactivation, and badge return — each is a real,
              irreversible action, shown here individually so nothing fires without you seeing it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <ShieldOff className="size-4" /> AD Account {deactivating?.adAccountActive === false && "— deactivated"}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!deactivating?.adAccountActive || isBusy || user?.role !== "IT_ADMIN"}
                title={user?.role !== "IT_ADMIN" ? "IT Admin only" : undefined}
                onClick={() => deactivating && void runDeactivationStep(deactivating.id, "ad")}
              >
                {deactivating?.adAccountActive === false ? "Done" : "Deactivate"}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <IdCard className="size-4" /> Non-Worker ID {deactivating?.nonWorkerIdDeactivatedAt && "— deactivated"}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!!deactivating?.nonWorkerIdDeactivatedAt || isBusy || user?.role !== "HR"}
                title={user?.role !== "HR" ? "HR only" : undefined}
                onClick={() => deactivating && void runDeactivationStep(deactivating.id, "nonWorkerId")}
              >
                {deactivating?.nonWorkerIdDeactivatedAt ? "Done" : "Deactivate"}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2 text-sm">
                <Wallet className="size-4" /> Badge Return {deactivating?.badgeReturnedAt && "— returned"}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!!deactivating?.badgeReturnedAt || isBusy || user?.role !== "ADMIN_SECURITY"}
                title={user?.role !== "ADMIN_SECURITY" ? "Admin Security only" : undefined}
                onClick={() => deactivating && void runDeactivationStep(deactivating.id, "badge")}
              >
                {deactivating?.badgeReturnedAt ? "Done" : "Return"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivatingId(null)}>
              Close dialog
            </Button>
            <Button disabled={isBusy} onClick={() => deactivating && void runCloseCheck(deactivating.id)}>
              <KeyRound /> {closeCheck.isPending ? "Checking…" : "Finalize Closure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
