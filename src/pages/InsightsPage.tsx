import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { AiCard } from "@/components/AiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStageCounts, useDashboardNarrative, queryProblem } from "@/lib/dashboardApi";
import { PIPELINE_ORDER, statusLabel, cumulativeFunnelCounts } from "@/lib/statusMapping";
import { exportRowsAsCsv } from "@/lib/exportView";

export default function InsightsPage() {
  const stageCounts = useStageCounts();
  const narrative = useDashboardNarrative();

  const counts = stageCounts.data?.counts ?? {};
  const funnelData = cumulativeFunnelCounts(counts, PIPELINE_ORDER).map(({ stage, count }) => ({
    name: statusLabel(stage),
    value: count,
  }));
  const distributionData = PIPELINE_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((status) => ({
    name: statusLabel(status),
    value: counts[status] ?? 0,
  }));

  function handleExport() {
    exportRowsAsCsv(
      "workflow-insights.csv",
      distributionData.map((d) => ({ stage: d.name, count: d.value }))
    );
  }

  function handlePrint() {
    window.print();
  }

  const narrativeProblem = queryProblem(narrative, "Your role doesn't have access to the AI dashboard narrative.");

  return (
    <>
      <PageHeader
        title="Insights"
        description="Workflow funnel, bottleneck analysis, and AI recommendations across the pipeline."
      />

      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Download />
          Export PDF
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Funnel</CardTitle>
            <CardDescription>Internships that have reached at least each stage, referred through certified.</CardDescription>
          </CardHeader>
          <CardContent>
            {stageCounts.isPending ? (
              <Skeleton className="h-72 w-full" />
            ) : funnelData.length === 0 ? (
              <EmptyState message="No internships in the pipeline yet." />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <FunnelChart>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                    }}
                  />
                  <Funnel dataKey="value" nameKey="name" data={funnelData} fill="var(--chart-1)" isAnimationActive={false}>
                    <LabelList position="center" dataKey="value" fill="var(--primary-foreground)" stroke="none" fontSize={11} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
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
              <Skeleton className="h-72 w-full" />
            ) : distributionData.length === 0 ? (
              <EmptyState message="No internships in the pipeline yet." />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={distributionData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <AiCard title="Bottleneck Analysis" description="Stages with the most currently-breached tasks, with AI explanations.">
          {narrativeProblem ? (
            <EmptyState message={narrativeProblem} />
          ) : narrative.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : !narrative.data || narrative.data.bottlenecks.length === 0 ? (
            <EmptyState message="No bottleneck stages right now." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {narrative.data.bottlenecks.map((b) => (
                <div key={b.stage} className="rounded-lg border p-4">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-medium">{b.stage}</h4>
                    <span className="text-xs text-muted-foreground">
                      {b.candidateCount} candidate{b.candidateCount === 1 ? "" : "s"}
                      {b.avgDwellDays !== null ? ` · avg ${b.avgDwellDays.toFixed(1)}d` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{b.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </AiCard>
      </div>

      <div className="mt-4">
        <AiCard title="AI Recommendations" description="Suggested next actions based on current pipeline state.">
          {narrativeProblem ? (
            <EmptyState message={narrativeProblem} />
          ) : narrative.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : !narrative.data || narrative.data.recommendations.length === 0 ? (
            <EmptyState message="No recommendations available yet." />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {narrative.data.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-chart-1" />
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </AiCard>
      </div>
    </>
  );
}
