import { useState } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useInternshipsList, useIssueNonWorkerId, useRevokeNonWorkerId } from "@/lib/internshipsApi";
import { ApiError } from "@/lib/api";
import type { InternshipListItem } from "@/types/internshipsList";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function NonWorkerIdPage() {
  const { data, isPending, error } = useInternshipsList();
  const issueNonWorkerId = useIssueNonWorkerId();
  const revokeNonWorkerId = useRevokeNonWorkerId();

  const [previewCandidate, setPreviewCandidate] = useState<InternshipListItem | null>(null);
  const [issuing, setIssuing] = useState<InternshipListItem | null>(null);
  const [issueValue, setIssueValue] = useState("");
  const [revoking, setRevoking] = useState<InternshipListItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const rows = data?.internships ?? [];

  async function handleIssue() {
    if (!issuing || !issueValue.trim()) return;
    try {
      await issueNonWorkerId.mutateAsync({ internshipId: issuing.id, nonWorkerId: issueValue.trim() });
      toast.success("Non-Worker ID issued.");
      setIssuing(null);
      setIssueValue("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not issue Non-Worker ID.");
    }
  }

  async function handleRevoke() {
    if (!revoking) return;
    const isPostClosure = ["COMPLETED", "CLOSED"].includes(revoking.status);
    if (!isPostClosure && !revokeReason.trim()) {
      toast.error("A reason is required for early revocation.");
      return;
    }
    try {
      await revokeNonWorkerId.mutateAsync(revoking.id);
      toast.success("Non-Worker ID revoked.");
      setRevoking(null);
      setRevokeReason("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not revoke Non-Worker ID.");
    }
  }

  return (
    <>
      <PageHeader title="Non-Worker ID" description="Issue and track Non-Worker IDs ahead of the NDA and access-provisioning stages." />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent>
            {error ? (
              <EmptyState message="Couldn't load candidate data — try refreshing the page." />
            ) : isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : rows.length === 0 ? (
              <EmptyState message="No candidates in the pipeline yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>NW ID</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isRevoked = !!row.nonWorkerIdDeactivatedAt;
                    return (
                      <TableRow key={row.id} className="cursor-pointer" onClick={() => setPreviewCandidate(row)}>
                        <TableCell className="font-medium">{row.candidateName}</TableCell>
                        <TableCell>{row.projectTitle}</TableCell>
                        <TableCell>{row.nonWorkerId ?? "—"}</TableCell>
                        <TableCell>{row.actualEnd ? new Date(row.actualEnd).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={row.status !== "VERIFIED" || !!row.nonWorkerId}
                            onClick={() => setIssuing(row)}
                          >
                            Issue
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!row.nonWorkerId || isRevoked}
                            onClick={() => setRevoking(row)}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badge Preview</CardTitle>
            <CardDescription>Click a row to preview.</CardDescription>
          </CardHeader>
          <CardContent>
            {!previewCandidate ? (
              <EmptyState message="Select a candidate to preview their badge." />
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
                <Avatar size="lg">
                  <AvatarFallback>{initials(previewCandidate.candidateName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{previewCandidate.candidateName}</p>
                  <p className="text-sm text-muted-foreground">{previewCandidate.projectTitle}</p>
                </div>
                <Badge variant="outline">{previewCandidate.nonWorkerId ?? "Not issued"}</Badge>
                <p className="text-xs text-muted-foreground">
                  Valid until{" "}
                  {previewCandidate.actualEnd ? new Date(previewCandidate.actualEnd).toLocaleDateString() : "—"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!issuing} onOpenChange={(open) => !open && setIssuing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Non-Worker ID</DialogTitle>
            <DialogDescription>For {issuing?.candidateName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nonWorkerIdValue">Non-Worker ID</Label>
            <Input id="nonWorkerIdValue" value={issueValue} onChange={(e) => setIssueValue(e.target.value)} placeholder="e.g. NWID-2026-0001" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssuing(null)}>
              Cancel
            </Button>
            <Button disabled={!issueValue.trim() || issueNonWorkerId.isPending} onClick={() => void handleIssue()}>
              Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Non-Worker ID</DialogTitle>
            <DialogDescription>For {revoking?.candidateName}.</DialogDescription>
          </DialogHeader>
          {revoking && !["COMPLETED", "CLOSED"].includes(revoking.status) && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm text-status-warning">
                <TriangleAlert className="size-4 shrink-0" />
                This internship hasn't closed yet — early revocation is unusual. Provide a reason.
              </p>
              <Label htmlFor="revokeReason">Reason</Label>
              <Textarea id="revokeReason" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={revokeNonWorkerId.isPending} onClick={() => void handleRevoke()}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
