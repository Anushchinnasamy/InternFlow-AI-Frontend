import { useState } from "react";
import { toast } from "sonner";
import { FileSignature, CircleCheck, CircleX, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
import { useInternshipsList, useExpireNda } from "@/lib/internshipsApi";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import type { InternshipListItem } from "@/types/internshipsList";

const NDA_TEMPLATE_TEXT = `NON-DISCLOSURE AGREEMENT (Template)

This Agreement is entered into between the Company and the Intern named on the
generated document. The Intern agrees to keep confidential all proprietary
information encountered during the internship, including but not limited to
source code, business plans, and unreleased product details.

This is placeholder template text for the read-only preview — the actual
generated NDA (per candidate) is produced by generateNdaPdf() on the backend
with real candidate/project/date details filled in.`;

function statusBadge(status: "pending" | "signed" | "expired") {
  if (status === "signed") return <Badge variant="outline" className="gap-1 border-status-good/30 bg-status-good/10 text-status-good"><CircleCheck className="size-3" />Signed</Badge>;
  if (status === "expired") return <Badge variant="outline" className="gap-1 border-status-critical/30 bg-status-critical/10 text-status-critical"><CircleX className="size-3" />Expired</Badge>;
  return <Badge variant="outline" className="gap-1 border-status-warning/40 bg-status-warning/10 text-status-warning"><FileSignature className="size-3" />Pending Signature</Badge>;
}

export default function NdaManagementPage() {
  const { user } = useAuth();
  const { data, isPending, error } = useInternshipsList();
  const expireNda = useExpireNda();
  const [viewing, setViewing] = useState<InternshipListItem | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  // This page is also reachable by LEGAL (nav allows HR/LEGAL), but
  // internship.ndaExpire is HR-only server-side — showing an enabled
  // button that always 403s for LEGAL isn't real access control, it's
  // just a dead end. Same principle as CandidatesPage's canViewEvaluation.
  const canExpireNda = user?.role === "HR";

  const rows = (data?.internships ?? []).filter((i) => i.nda !== null);
  const pendingCount = rows.filter((i) => i.nda!.status === "pending").length;
  const signedCount = rows.filter((i) => i.nda!.status === "signed").length;
  const expiredCount = rows.filter((i) => i.nda!.status === "expired").length;

  async function handleExpire(internshipId: string) {
    try {
      await expireNda.mutateAsync(internshipId);
      toast.success("NDA expired — a fresh signing window has been issued.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not expire this NDA.");
    }
  }

  return (
    <>
      <PageHeader
        title="NDA Management"
        description="Monitor NDA signature status and the hard gate that blocks a late signature."
      />

      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
          <FileText />
          Templates
        </Button>
      </div>

      {/* The backend auto-generates and auto-issues the NDA in one step
          (Day 4) — there's no separate manual "Send" action, so the
          reference design's Pending/Sent split collapses into one
          "Pending Signature" card rather than a fake Sent state. */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <KpiCard label="Pending Signature" value={pendingCount} icon={FileSignature} isLoading={isPending} tone={pendingCount > 0 ? "warning" : "default"} />
        <KpiCard label="Signed" value={signedCount} icon={CircleCheck} isLoading={isPending} tone="good" />
        <KpiCard label="Expired" value={expiredCount} icon={CircleX} isLoading={isPending} tone={expiredCount > 0 ? "critical" : "default"} />
      </div>

      <Card>
        <CardContent>
          {error ? (
            <EmptyState message="Couldn't load NDA data — try refreshing the page." />
          ) : isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <EmptyState message="No NDAs generated yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.candidateName}</TableCell>
                    <TableCell>{row.projectTitle}</TableCell>
                    <TableCell>{statusBadge(row.nda!.status)}</TableCell>
                    <TableCell>v{row.nda!.version}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewing(row)}>
                        View Signing Status
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!canExpireNda || row.nda!.status !== "pending" || expireNda.isPending}
                        title={!canExpireNda ? "HR only" : undefined}
                        onClick={() => void handleExpire(row.id)}
                      >
                        Expire
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Informational only — signing itself happens through the actual
          sign endpoint, initiated by the candidate, never clicked by HR. */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signing status — {viewing?.candidateName}</DialogTitle>
            <DialogDescription>
              {viewing && (
                <>
                  Current NDA document is version {viewing.nda?.version}, status{" "}
                  <strong>{viewing.nda?.status}</strong>.
                  {viewing.nda?.signedAt && <> Signed at {new Date(viewing.nda.signedAt).toLocaleString()}.</>}
                  {viewing.nda?.expiredAt && <> Expired at {new Date(viewing.nda.expiredAt).toLocaleString()}.</>}
                  {" "}Signing is completed by the candidate through their own portal — HR cannot sign on their behalf.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>NDA Template</DialogTitle>
            <DialogDescription>Read-only preview of the current template text.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-y-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">{NDA_TEMPLATE_TEXT}</pre>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
