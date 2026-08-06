import { useState } from "react";
import { toast } from "sonner";
import { Users, CheckCircle2, Award, CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { StageBadge } from "@/components/StageBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { isForbidden } from "@/lib/dashboardApi";
import { useInternshipsList, useMentorConfirmCompletion } from "@/lib/internshipsApi";
import { useIssuedCertificates } from "@/lib/certificatesApi";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { progressPercent, milestoneTags } from "@/lib/internshipProgress";
import type { InternshipListItem } from "@/types/internshipsList";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function InternLifecyclePage() {
  const { user } = useAuth();
  const { data, isPending, error } = useInternshipsList(["ACTIVE", "EXTENDED"]);
  // Same internships endpoint as the cards below, not /dashboard/stage-counts
  // (HR/PROGRAM_OWNER-only) — this page's own nav grant includes MENTOR, and
  // GET /internships scopes MENTOR to their own internships automatically,
  // so deriving both KPIs from data this page already fetches keeps the
  // count honest for every role that can actually open this page.
  const completedQuery = useInternshipsList(["COMPLETED", "CLOSED"]);
  const certQuery = useIssuedCertificates();
  const mentorConfirm = useMentorConfirmCompletion();

  const [confirming, setConfirming] = useState<InternshipListItem | null>(null);
  const [satisfactory, setSatisfactory] = useState(true);
  const [remark, setRemark] = useState("");

  const rows = data?.internships ?? [];
  const activeCount = rows.length;
  const completedCount = completedQuery.data?.internships.length ?? 0;
  // MENTOR can see this page but isn't in certificate.list's role set — a
  // 403 here means "not visible to you," not "zero exist," so it's shown as
  // "—" rather than a misleading 0 (same isForbidden distinction dashboard
  // widgets already make).
  const certifiedCount = certQuery.error && isForbidden(certQuery.error) ? "—" : certQuery.data?.issued.length ?? 0;

  async function submitConfirmation() {
    if (!confirming) return;
    if (!remark.trim()) {
      toast.error("A closing remark is required.");
      return;
    }
    try {
      await mentorConfirm.mutateAsync({ internshipId: confirming.id, satisfactory, remark });
      toast.success("Completion confirmed. The Closure page can now proceed once the end date arrives.");
      setConfirming(null);
      setRemark("");
      setSatisfactory(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not confirm completion.");
    }
  }

  return (
    <>
      <PageHeader title="Intern Lifecycle" description="Track active internships through delay, extension, and completion." />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <KpiCard label="Active" value={activeCount} icon={Users} isLoading={isPending} />
        <KpiCard label="Completed" value={completedCount} icon={CheckCircle2} isLoading={completedQuery.isPending} tone="good" />
        <KpiCard label="Certified" value={certifiedCount} icon={Award} isLoading={certQuery.isPending} tone="good" />
      </div>

      {error ? (
        <EmptyState message="Couldn't load active internships — try refreshing the page." />
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="No active internships right now." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((row) => {
            const percent = progressPercent(row.startDate, row.endDate);
            const tags = milestoneTags(row.startDate, row.endDate);
            const isOwnMentor = user?.role === "MENTOR" && user.id === row.mentorId;
            return (
              <Card key={row.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(row.candidateName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{row.candidateName}</p>
                        <p className="text-xs text-muted-foreground">{row.projectTitle}</p>
                      </div>
                    </div>
                    <StageBadge status={row.status} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{percent}%</span>
                    </div>
                    <Progress value={percent} />
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {row.mentorCompletionConfirmedAt ? (
                      <span className="flex items-center gap-1 text-xs text-status-good">
                        <CircleCheck className="size-3.5" /> Completion confirmed
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Mentor: {row.mentorName}</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isOwnMentor || !!row.mentorCompletionConfirmedAt}
                      title={!isOwnMentor ? "Only the assigned mentor can mark this complete" : undefined}
                      onClick={() => setConfirming(row)}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm completion — {confirming?.candidateName}</DialogTitle>
            <DialogDescription>
              This records that the work is done. Actual closure and deactivation happen separately on the Closure
              page once the end date is reached.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Button size="sm" variant={satisfactory ? "default" : "outline"} onClick={() => setSatisfactory(true)}>
                Satisfactory
              </Button>
              <Button size="sm" variant={!satisfactory ? "default" : "outline"} onClick={() => setSatisfactory(false)}>
                Unsatisfactory
              </Button>
            </div>
            <Textarea
              placeholder="Closing remark..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button disabled={mentorConfirm.isPending} onClick={() => void submitConfirmation()}>
              {mentorConfirm.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
