import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { SkillPills } from "@/components/SkillPills";
import { StageBadge } from "@/components/StageBadge";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { useCandidateSearch } from "@/lib/candidatesApi";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useAuth } from "@/context/AuthContext";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
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
