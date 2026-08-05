import { useState } from "react";
import { differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  ClipboardCheck,
  FileSignature,
  KeyRound,
  Users,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { AiCard } from "@/components/AiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStageCounts,
  useSlaBreaches,
  useCycleTime,
  useDashboardNarrative,
  useDuplicateAlerts,
  useSlaRiskPredictions,
  useRecentActivity,
  useUpcomingClosures,
  queryProblem,
} from "@/lib/dashboardApi";
import { sumCounts, totalCount, statusLabel, KPI_GROUPS, PIPELINE_ORDER } from "@/lib/statusMapping";
import { formatActivity } from "@/lib/activityFormatter";
import type { DuplicateAlert } from "@/types/dashboard";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function DashboardPage() {
  const stageCounts = useStageCounts();
  const slaBreaches = useSlaBreaches();
  const cycleTime = useCycleTime();
  const narrative = useDashboardNarrative();
  const duplicateAlerts = useDuplicateAlerts();
  const slaRiskPredictions = useSlaRiskPredictions();
  const recentActivity = useRecentActivity();
  const upcomingClosures = useUpcomingClosures();

  // No backend merge/dismiss action exists yet for DUPLICATE_DETECTION
  // rows — dismissing here is a local-only stub (confirm dialog + hide),
  // not a persisted "reviewed" state. Flagged as a known gap.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [pendingMerge, setPendingMerge] = useState<DuplicateAlert | null>(null);

  const counts = stageCounts.data?.counts ?? {};
  const totalReferrals = totalCount(counts);
  const pendingEvaluation = sumCounts(counts, KPI_GROUPS.pendingEvaluation);
  const pendingNda = sumCounts(counts, KPI_GROUPS.pendingNda);
  const pendingAccess = sumCounts(counts, KPI_GROUPS.pendingAccess);
  const activeInterns = sumCounts(counts, KPI_GROUPS.activeInterns);
  const completed = sumCounts(counts, KPI_GROUPS.completed);
  const slaBreachCount = slaBreaches.data?.tasks.length ?? 0;
  const aiRiskAlertCount = slaRiskPredictions.data?.predictions.length ?? 0;

  const stageChartData = PIPELINE_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((status) => ({
    stage: statusLabel(status),
    count: counts[status] ?? 0,
  }));

  const visibleAlerts = (duplicateAlerts.data?.alerts ?? []).filter((a) => !dismissedIds.has(a.aiActionId));

  const narrativeProblem = queryProblem(narrative, "Your role doesn't have access to the AI dashboard narrative.");
  const duplicateAlertsProblem = queryProblem(duplicateAlerts, "Your role doesn't have access to duplicate-candidate alerts.");
  const upcomingClosuresProblem = queryProblem(upcomingClosures, "Your role doesn't have access to upcoming closures.");
  const recentActivityProblem = queryProblem(recentActivity, "Your role doesn't have access to the activity feed.");

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live internship stage counts, SLA breach summary, and completion metrics across the pipeline."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Total Referrals" value={totalReferrals} icon={UserPlus} isLoading={stageCounts.isPending} />
        <KpiCard
          label="Pending Evaluation"
          value={pendingEvaluation}
          icon={ClipboardCheck}
          isLoading={stageCounts.isPending}
        />
        <KpiCard label="Pending NDA" value={pendingNda} icon={FileSignature} isLoading={stageCounts.isPending} />
        <KpiCard label="Pending Access" value={pendingAccess} icon={KeyRound} isLoading={stageCounts.isPending} />
        <KpiCard label="Active Interns" value={activeInterns} icon={Users} isLoading={stageCounts.isPending} />
        <KpiCard label="Completed" value={completed} icon={CheckCircle2} isLoading={stageCounts.isPending} />
        <KpiCard
          label="SLA Breaches"
          value={slaBreachCount}
          icon={AlertTriangle}
          tone={slaBreachCount > 0 ? "critical" : "default"}
          isLoading={slaBreaches.isPending}
        />
        <KpiCard
          label="AI Risk Alerts"
          value={aiRiskAlertCount}
          icon={Sparkles}
          tone={aiRiskAlertCount > 0 ? "warning" : "default"}
          isLoading={slaRiskPredictions.isPending}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AiCard title="Workflow Bottlenecks" description="Stages with the most currently-breached tasks.">
          {narrativeProblem ? (
            <EmptyState message={narrativeProblem} />
          ) : narrative.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : !narrative.data || narrative.data.bottlenecks.length === 0 ? (
            <EmptyState message="No bottleneck stages right now — no currently-breached tasks." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead>Candidates</TableHead>
                  <TableHead>Avg Time</TableHead>
                  <TableHead>AI Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {narrative.data.bottlenecks.map((b) => (
                  <TableRow key={b.stage}>
                    <TableCell className="font-medium">{b.stage}</TableCell>
                    <TableCell>{b.candidateCount}</TableCell>
                    <TableCell>{b.avgDwellDays !== null ? `${b.avgDwellDays.toFixed(1)}d` : "—"}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                      {b.explanation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AiCard>

        <AiCard title="AI Insights" description="Model-generated read of the current pipeline state.">
          {narrativeProblem ? (
            <EmptyState message={narrativeProblem} />
          ) : narrative.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : !narrative.data || narrative.data.insights.length === 0 ? (
            <EmptyState message="No insights available yet." />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {narrative.data.insights.map((insight, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-chart-1" />
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </AiCard>
      </div>

      <div className="mt-4">
        <AiCard title="Duplicate Candidate Alerts" description="Possible duplicate candidates flagged by AI, not yet resolved.">
          {duplicateAlertsProblem ? (
            <EmptyState message={duplicateAlertsProblem} />
          ) : duplicateAlerts.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : visibleAlerts.length === 0 ? (
            <EmptyState message="No unresolved duplicate alerts." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Matched Against</TableHead>
                  <TableHead>Similarity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAlerts.map((alert) => (
                  <TableRow key={alert.aiActionId}>
                    <TableCell className="font-medium">{alert.candidateName ?? "Unknown"}</TableCell>
                    <TableCell>{alert.matchedName ?? "Unknown"}</TableCell>
                    <TableCell>
                      {alert.similarity !== null ? `${Math.round(alert.similarity * 100)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setPendingMerge(alert)}>
                        Merge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AiCard>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Internship Closures</CardTitle>
            <CardDescription>Active internships ending within the next 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingClosuresProblem ? (
              <EmptyState message={upcomingClosuresProblem} />
            ) : upcomingClosures.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : !upcomingClosures.data || upcomingClosures.data.closures.length === 0 ? (
              <EmptyState message="No internships closing in the next 30 days." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingClosures.data.closures.map((c) => {
                  const daysLeft = differenceInCalendarDays(new Date(c.actualEnd), new Date());
                  return (
                    <div key={c.internshipId} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar>
                        <AvatarFallback>{initials(c.candidateName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.candidateName}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.projectTitle}</p>
                      </div>
                      <Badge variant={daysLeft <= 7 ? "destructive" : "outline"}>{daysLeft}d left</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>
              Average cycle time from referral to READY_TO_START, over the last {cycleTime.data?.windowDays ?? 90} days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cycleTime.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <p className="text-3xl font-semibold tabular-nums">
                  {cycleTime.data?.averageBusinessDays !== null && cycleTime.data?.averageBusinessDays !== undefined
                    ? `${cycleTime.data.averageBusinessDays.toFixed(1)}d`
                    : "—"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Based on {cycleTime.data?.sampleSize ?? 0} completed internships. A trend line over time requires
                  historical stage-count snapshots, which the backend doesn't retain yet — showing the current
                  average only, not fabricated history.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stage Distribution</CardTitle>
            <CardDescription>Current internship count by pipeline stage.</CardDescription>
          </CardHeader>
          <CardContent>
            {stageCounts.isPending ? (
              <Skeleton className="h-56 w-full" />
            ) : stageChartData.length === 0 ? (
              <EmptyState message="No internships in the pipeline yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stageChartData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={110}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest audit trail events across the program.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivityProblem ? (
              <EmptyState message={recentActivityProblem} />
            ) : recentActivity.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : !recentActivity.data || recentActivity.data.events.length === 0 ? (
              <EmptyState message="No recent activity." />
            ) : (
              <ul className="flex flex-col gap-3 text-sm">
                {recentActivity.data.events.slice(0, 15).map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-3 border-b pb-2 last:border-0">
                    <span>{formatActivity(event)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={pendingMerge !== null} onOpenChange={(open) => !open && setPendingMerge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge duplicate candidates?</DialogTitle>
            <DialogDescription>
              {pendingMerge && (
                <>
                  This will mark <strong>{pendingMerge.candidateName}</strong> and{" "}
                  <strong>{pendingMerge.matchedName}</strong> as reviewed. There is no backend merge action yet — this
                  only dismisses the alert locally.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMerge(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingMerge) setDismissedIds((prev) => new Set(prev).add(pendingMerge.aiActionId));
                setPendingMerge(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
