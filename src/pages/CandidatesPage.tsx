import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, X, UserPlus, Check, Ban } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SkillPills } from "@/components/SkillPills";
import { StageBadge } from "@/components/StageBadge";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCandidateSearch } from "@/lib/candidatesApi";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useAuth } from "@/context/AuthContext";
import { usePendingMentorConfirmations, useMentorConfirmReferral } from "@/lib/referralsApi";
import { ApiError } from "@/lib/api";
import type { PendingMentorConfirmation } from "@/types/referrals";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function PendingMentorConfirmations() {
  const { data, isPending, error } = usePendingMentorConfirmations();
  const mentorConfirm = useMentorConfirmReferral();
  const [declining, setDeclining] = useState<PendingMentorConfirmation | null>(null);
  const [reason, setReason] = useState("");

  async function confirm(referralId: string) {
    try {
      await mentorConfirm.mutateAsync({ referralId, decision: "CONFIRM" });
      toast.success("Referral confirmed — it's moved on to HR review.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not confirm this referral.");
    }
  }

  async function decline() {
    if (!declining) return;
    if (!reason.trim()) {
      toast.error("A reason is required to decline.");
      return;
    }
    try {
      await mentorConfirm.mutateAsync({ referralId: declining.id, decision: "DECLINE", reason });
      toast.success("Referral declined.");
      setDeclining(null);
      setReason("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not decline this referral.");
    }
  }

  if (error || isPending || !data || data.referrals.length === 0) return null;

  return (
    <>
      <Card className="mb-4">
        <CardContent>
          <h3 className="mb-3 text-sm font-medium">Pending Your Confirmation ({data.referrals.length})</h3>
          <div className="flex flex-col gap-2">
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{r.candidateName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.projectTitle} · referred by {r.referrerName} · {r.site}/{r.department}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDeclining(r)}>
                    <Ban /> Decline
                  </Button>
                  <Button size="sm" disabled={mentorConfirm.isPending} onClick={() => void confirm(r.id)}>
                    <Check /> Confirm
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!declining} onOpenChange={(open) => !open && setDeclining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline referral — {declining?.candidateName}</DialogTitle>
            <DialogDescription>A reason is required and is shared with the referrer.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for declining..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={mentorConfirm.isPending} onClick={() => void decline()}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CandidatesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);
  const search = useCandidateSearch(debouncedQuery);
  // The Candidates page itself is open to HR/PROGRAM_OWNER/MENTOR/REFERRER,
  // but /evaluation/:id (per navigation.ts) is HR-only — showing a "View"
  // link that always 403s for the other three roles is a dead end, not
  // real access control (the server-side gate is what actually matters;
  // this is just not offering a button that can't be used).
  const canViewEvaluation = user?.role === "HR";

  return (
    <>
      <PageHeader
        title="Candidates"
        description="Search and browse every candidate, with match score and recommendation at a glance."
      />

      {user?.role === "MENTOR" && <PendingMentorConfirmations />}

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, or non-worker ID…"
            className="pl-8"
          />
        </div>
        <Button variant="outline" disabled={!query} onClick={() => setQuery("")}>
          <X />
          Clear
        </Button>
        <Button asChild>
          <Link to="/referral-intake">
            <UserPlus />
            Add Candidate
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          {!debouncedQuery.trim() ? (
            <EmptyState message="Search for a candidate to get started." />
          ) : search.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : !search.data || search.data.results.length === 0 ? (
            <EmptyState message="No candidates match your search." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Match %</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {search.data.results.map((candidate) => {
                  const referral = candidate.referrals[0];
                  const stage = referral?.internship?.status ?? referral?.status;
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{initials(candidate.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{candidate.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{candidate.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SkillPills skills={candidate.skills} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {candidate.latestEvaluation ? `${candidate.latestEvaluation.matchScore}%` : "—"}
                      </TableCell>
                      <TableCell>{stage ? <StageBadge status={stage} /> : "—"}</TableCell>
                      <TableCell>
                        {candidate.latestEvaluation ? (
                          <RecommendationBadge recommendation={candidate.latestEvaluation.recommendation} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {canViewEvaluation ? (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/evaluation/${candidate.id}`}>View</Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
