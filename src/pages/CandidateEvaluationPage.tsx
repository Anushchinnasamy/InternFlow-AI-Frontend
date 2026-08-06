import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Info, Sparkles, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AiInsightsCard } from "@/components/AiInsightsCard";
import { StageBadge } from "@/components/StageBadge";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCandidate360 } from "@/lib/candidatesApi";
import { useCandidateEvaluations, useEvaluateCandidate, useUpdateRubric, useDecideEvaluation } from "@/lib/evaluationsApi";
import { ApiError } from "@/lib/api";
import type { RubricInput, Decision } from "@/types/evaluations";

// Backend's persisted rubric columns are Communication/Technical/
// Experience/CulturalFit (see prisma/schema.prisma Evaluation model) —
// labeled here as-is rather than inventing a "Problem Solving" category,
// same "defer to the backend's real field" rule already applied to stage
// badges elsewhere in this app.
const RUBRIC_CATEGORIES: Array<{ key: keyof RubricInput; label: string }> = [
  { key: "technical", label: "Technical" },
  { key: "experience", label: "Experience" },
  { key: "communication", label: "Communication" },
  { key: "culturalFit", label: "Culture Fit" },
];

const DECISION_PAST_TENSE: Record<Decision, string> = {
  REJECT: "rejected",
  SHORTLIST: "shortlisted",
  SELECT: "selected",
};

function RubricSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex size-8 items-center justify-center rounded-md border text-sm font-medium transition-colors",
            value === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function CandidateEvaluationPage() {
  const { candidateId } = useParams<{ candidateId?: string }>();

  const candidate360 = useCandidate360(candidateId);
  const evaluations = useCandidateEvaluations(candidateId);
  const evaluateCandidate = useEvaluateCandidate();
  const updateRubric = useUpdateRubric(candidateId);
  const decideEvaluation = useDecideEvaluation(candidateId);

  const [jobDescription, setJobDescription] = useState("");
  const [rubric, setRubric] = useState<Partial<Record<keyof RubricInput, number>>>({});

  const latestEvaluation = evaluations.data?.evaluations[0] ?? null;

  useEffect(() => {
    if (latestEvaluation) {
      setRubric({
        communication: latestEvaluation.rubricCommunication ?? undefined,
        technical: latestEvaluation.rubricTechnical ?? undefined,
        experience: latestEvaluation.rubricExperience ?? undefined,
        culturalFit: latestEvaluation.rubricCulturalFit ?? undefined,
      });
    }
  }, [latestEvaluation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!candidateId) {
    return (
      <>
        <PageHeader
          title="Candidate Evaluation"
          description="Run AI-assisted evaluations, score the human rubric, and record the hire decision."
        />
        <EmptyState message="Select a candidate from the Candidates page to view their evaluation." />
      </>
    );
  }

  function handleRubricChange(key: keyof RubricInput, value: number) {
    const next = { ...rubric, [key]: value };
    setRubric(next);
    if (
      next.communication !== undefined &&
      next.technical !== undefined &&
      next.experience !== undefined &&
      next.culturalFit !== undefined &&
      latestEvaluation
    ) {
      updateRubric.mutate(
        { evaluationId: latestEvaluation.id, rubric: next as RubricInput },
        { onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not save rubric.") }
      );
    }
  }

  async function handleDecide(decision: Decision) {
    if (!latestEvaluation) return;
    try {
      await decideEvaluation.mutateAsync({ evaluationId: latestEvaluation.id, decision });
      toast.success(`Candidate ${DECISION_PAST_TENSE[decision]}.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not record decision.");
    }
  }

  async function handleEvaluate() {
    if (!jobDescription.trim() || !candidateId) return;
    try {
      await evaluateCandidate.mutateAsync({ candidateId, jobDescription });
      await evaluations.refetch();
      toast.success("AI evaluation complete.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not run evaluation.");
    }
  }

  const candidate = candidate360.data?.candidate;
  const referral = candidate360.data?.referrals[0];
  const stage = referral?.internship?.status ?? referral?.status;

  return (
    <>
      <PageHeader
        title="Candidate Evaluation"
        description="Run AI-assisted evaluations, score the human rubric, and record the hire decision."
      />

      {candidate360.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : !candidate ? (
        <EmptyState message="Candidate not found." />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-wrap items-center gap-4">
              <Avatar size="lg">
                <AvatarFallback>{initials(candidate.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{candidate.fullName}</h3>
                <p className="text-sm text-muted-foreground">
                  {referral?.projectTitle ?? "No active referral"} · {candidate.email}
                </p>
              </div>
              {stage && <StageBadge status={stage} />}
              {latestEvaluation && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Match {latestEvaluation.matchScore}%</span>
                  <RecommendationBadge recommendation={latestEvaluation.recommendation} />
                </div>
              )}
            </CardContent>
          </Card>

          {evaluations.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : !latestEvaluation ? (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Run AI Evaluation</CardTitle>
                <CardDescription>No evaluation yet for this candidate — provide a job description to analyze against.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea id="jobDescription" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
                <Button
                  className="self-start"
                  disabled={!jobDescription.trim() || evaluateCandidate.isPending}
                  onClick={() => void handleEvaluate()}
                >
                  {evaluateCandidate.isPending ? <Spinner /> : <Sparkles />}
                  {evaluateCandidate.isPending ? "Evaluating…" : "Run AI Evaluation"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4">
                <AiInsightsCard
                  matchScore={latestEvaluation.matchScore}
                  recommendation={latestEvaluation.recommendation}
                  strengths={latestEvaluation.strengths}
                  weaknesses={latestEvaluation.weaknesses}
                  aiSummary={latestEvaluation.aiSummary}
                />
              </div>

              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Evaluation Rubric</CardTitle>
                  <CardDescription>Human-entered, independent of the AI match score. Saves once all four are set.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {RUBRIC_CATEGORIES.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <Label>{label}</Label>
                      <RubricSelector value={rubric[key] ?? null} onChange={(v) => handleRubricChange(key, v)} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Decision</CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Info className="size-3.5" />
                    This human decision — not the AI recommendation above — is what actually moves the candidate forward.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">AI Recommendation:</span>
                    <RecommendationBadge recommendation={latestEvaluation.recommendation} />
                    <span className="ml-4 text-muted-foreground">Human Decision:</span>
                    {latestEvaluation.decision ? (
                      <span className="font-medium">{latestEvaluation.decision}</span>
                    ) : (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      disabled={!!latestEvaluation.decision || decideEvaluation.isPending}
                      onClick={() => void handleDecide("REJECT")}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!!latestEvaluation.decision || decideEvaluation.isPending}
                      onClick={() => void handleDecide("SHORTLIST")}
                    >
                      Shortlist
                    </Button>
                    <Button
                      disabled={!!latestEvaluation.decision || decideEvaluation.isPending}
                      onClick={() => void handleDecide("SELECT")}
                    >
                      Select Candidate
                    </Button>
                  </div>

                  {latestEvaluation.decision === "SELECT" && (
                    <p className="flex items-start gap-1.5 rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-sm text-status-warning">
                      <UserCheck className="mt-0.5 size-4 shrink-0" />
                      Selecting a candidate doesn't finish the pipeline by itself — mentor confirmation is still
                      required before the internship record is created.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
