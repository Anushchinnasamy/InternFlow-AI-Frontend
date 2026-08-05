import { HeartPulse, AlertTriangle, TriangleAlert, Timer } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { AiCard } from "@/components/AiCard";
import { EmptyState } from "@/components/EmptyState";
import { RiskBadge } from "@/components/RiskBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSlaBreaches, useCycleTime, useSlaRiskPredictions, queryProblem } from "@/lib/dashboardApi";
import { categoricalColor } from "@/lib/chartColors";
import { statusLabel } from "@/lib/statusMapping";

export default function SlaMonitoringPage() {
  const slaBreaches = useSlaBreaches();
  const cycleTime = useCycleTime();
  const slaRiskPredictions = useSlaRiskPredictions();

  const breachedTaskIds = new Set((slaBreaches.data?.tasks ?? []).map((t) => t.id));
  const breachedCount = slaBreaches.data?.tasks.length ?? 0;
  const atRiskCount = (slaRiskPredictions.data?.predictions ?? []).filter(
    (p) => p.taskId && !breachedTaskIds.has(p.taskId)
  ).length;
  const totalConsidered = breachedCount + atRiskCount;
  const breachRate = totalConsidered > 0 ? breachedCount / totalConsidered : 0;
  const slaHealthPercent = Math.round((1 - breachRate) * 100);

  const grouped = slaBreaches.data?.groupedByStageAndOwner ?? {};
  const roles = [...new Set(Object.values(grouped).flatMap((byRole) => Object.keys(byRole)))];
  const breachDistribution = Object.entries(grouped).map(([stage, byRole]) => {
    const row: Record<string, string | number> = { stage };
    for (const role of roles) row[role] = byRole[role] ?? 0;
    return row;
  });

  const slaBreachesProblem = queryProblem(slaBreaches, "Your role doesn't have access to SLA breach data.");
  const slaRiskPredictionsProblem = queryProblem(slaRiskPredictions, "Your role doesn't have access to AI risk predictions.");

  return (
    <>
      <PageHeader title="SLA Monitoring" description="Live view of SLA breaches by stage and escalation tier." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="SLA Health"
          value={`${slaHealthPercent}%`}
          icon={HeartPulse}
          tone={slaHealthPercent >= 80 ? "good" : slaHealthPercent >= 50 ? "warning" : "critical"}
          isLoading={slaBreaches.isPending || slaRiskPredictions.isPending}
        />
        <KpiCard
          label="Breaches"
          value={breachedCount}
          icon={AlertTriangle}
          tone={breachedCount > 0 ? "critical" : "default"}
          isLoading={slaBreaches.isPending}
        />
        <KpiCard
          label="At-Risk Cases"
          value={atRiskCount}
          icon={TriangleAlert}
          tone={atRiskCount > 0 ? "warning" : "default"}
          isLoading={slaRiskPredictions.isPending}
        />
        <KpiCard
          label="Avg Processing"
          value={
            cycleTime.data?.averageBusinessDays !== null && cycleTime.data?.averageBusinessDays !== undefined
              ? `${cycleTime.data.averageBusinessDays.toFixed(1)}d`
              : "—"
          }
          icon={Timer}
          isLoading={cycleTime.isPending}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA Health Trend</CardTitle>
            <CardDescription>Share of at-risk/breached cases currently within SLA.</CardDescription>
          </CardHeader>
          <CardContent>
            {slaBreaches.isPending || slaRiskPredictions.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-semibold tabular-nums">{slaHealthPercent}%</span>
                  <span className="text-xs text-muted-foreground">of {totalConsidered} tracked cases</span>
                </div>
                <Progress value={slaHealthPercent} className="mt-3" />
                <p className="mt-3 text-xs text-muted-foreground">
                  A trend over time requires historical snapshots the backend doesn't retain yet — this shows the
                  current snapshot only, not fabricated history.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breach Distribution by Stage</CardTitle>
            <CardDescription>Currently-breached tasks, by stage and assignee role.</CardDescription>
          </CardHeader>
          <CardContent>
            {slaBreachesProblem ? (
              <EmptyState message={slaBreachesProblem} />
            ) : slaBreaches.isPending ? (
              <Skeleton className="h-56 w-full" />
            ) : breachDistribution.length === 0 ? (
              <EmptyState message="No currently-breached tasks." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={breachDistribution}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                    }}
                  />
                  {roles.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {roles.map((role, i) => (
                    <Bar key={role} dataKey={role} stackId="stage" fill={categoricalColor(i)} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <AiCard title="AI Risk Predictions" description="Tasks flagged by AI as likely to breach their SLA.">
          {slaRiskPredictionsProblem ? (
            <EmptyState message={slaRiskPredictionsProblem} />
          ) : slaRiskPredictions.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : !slaRiskPredictions.data || slaRiskPredictions.data.predictions.length === 0 ? (
            <EmptyState message="No AI risk predictions yet — the SLA sweep flags tasks once they cross 75% elapsed." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Elapsed</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Recommended Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaRiskPredictions.data.predictions.map((p) => (
                  <TableRow key={p.aiActionId}>
                    <TableCell className="font-medium">{p.candidateName ?? "—"}</TableCell>
                    <TableCell>{p.stage ? statusLabel(p.stage) : "—"}</TableCell>
                    <TableCell>{p.elapsedPercent !== null ? `${Math.round(p.elapsedPercent)}%` : "—"}</TableCell>
                    <TableCell>
                      <RiskBadge level={p.riskLevel} />
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                      {p.recommendedAction ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </AiCard>
      </div>
    </>
  );
}
