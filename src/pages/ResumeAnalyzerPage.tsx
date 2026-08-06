import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { FileDropzone } from "@/components/FileDropzone";
import { AiInsightsCard } from "@/components/AiInsightsCard";
import { useEvaluateAdhoc } from "@/lib/candidatesApi";
import { useExtractResumeText } from "@/lib/resumeParseApi";
import { useMyAiActions } from "@/lib/aiActionsApi";
import { humanizeTemplateId } from "@/lib/notificationFormat";
import { ApiError } from "@/lib/api";
import type { AdhocEvaluationResult } from "@/types/evaluations";
import type { AiAction } from "@/types/aiActions";

const HISTORY_TYPES = ["RESUME_PARSE", "MATCH_SCORE"];

export default function ResumeAnalyzerPage() {
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [pastedText, setPastedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<AdhocEvaluationResult | null>(null);
  const [selectedHistoryAction, setSelectedHistoryAction] = useState<AiAction | null>(null);

  const extractText = useExtractResumeText();
  const evaluateAdhoc = useEvaluateAdhoc();
  const history = useMyAiActions(HISTORY_TYPES);

  const isAnalyzing = extractText.isPending || evaluateAdhoc.isPending;
  const canAnalyze = jobDescription.trim().length > 0 && (inputMode === "paste" ? pastedText.trim().length > 0 : !!file);

  async function handleAnalyze() {
    setResult(null);
    setSelectedHistoryAction(null);
    try {
      const resumeText = inputMode === "paste" ? pastedText : await extractText.mutateAsync(file!);
      const response = await evaluateAdhoc.mutateAsync({ resumeText, jobDescription });
      setResult(response.evaluation);
    } catch {
      // Errors surface via extractText.error / evaluateAdhoc.error below.
    }
  }

  const matchScoreActions = (history.data?.actions ?? []).filter((a) => a.type === "MATCH_SCORE");

  return (
    <>
      <PageHeader
        title="AI Resume Analyzer"
        description="Upload a resume to auto-extract candidate details and score the match against a job description."
      />

      <Tabs defaultValue="analyze">
        <TabsList>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Resume Input</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "paste" | "upload")}>
                <TabsList>
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                <TabsContent value="paste" className="mt-3">
                  <Textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste resume text here…"
                    className="min-h-40"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{pastedText.length} characters</p>
                </TabsContent>
                <TabsContent value="upload" className="mt-3">
                  <FileDropzone file={file} onFileSelected={setFile} />
                </TabsContent>
              </Tabs>

              <div className="mt-4 space-y-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description to match against…"
                  className="min-h-24"
                />
              </div>

              <Button className="mt-4" disabled={!canAnalyze || isAnalyzing} onClick={() => void handleAnalyze()}>
                {isAnalyzing ? <Spinner /> : <Sparkles />}
                {isAnalyzing ? "Analyzing…" : "Analyze with AI"}
              </Button>

              {(extractText.isError || evaluateAdhoc.isError) && (
                <p className="mt-2 text-sm text-destructive">
                  {extractText.error instanceof ApiError
                    ? extractText.error.message
                    : evaluateAdhoc.error instanceof ApiError
                      ? evaluateAdhoc.error.message
                      : "Something went wrong analyzing this resume."}
                </p>
              )}
            </CardContent>
          </Card>

          {isAnalyzing && <Skeleton className="h-56 w-full" />}
          {result && !isAnalyzing && (
            <AiInsightsCard
              matchScore={result.matchScore}
              recommendation={result.recommendation}
              strengths={result.strengths}
              weaknesses={result.weaknesses}
              aiSummary={result.aiSummary}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Past Analyses</CardTitle>
              <CardDescription>Resume parses and match-score analyses you've run, most recent first.</CardDescription>
            </CardHeader>
            <CardContent>
              {history.isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : matchScoreActions.length === 0 ? (
                <EmptyState message="No analyses yet — run one from the Analyze tab." />
              ) : (
                <ul className="flex flex-col gap-1">
                  {matchScoreActions.map((action) => {
                    const output = action.output as AdhocEvaluationResult;
                    return (
                      <li key={action.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryAction(action)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border-b p-3 text-left last:border-0 hover:bg-muted/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {action.candidateName ?? humanizeTemplateId(action.entity)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">{output.matchScore}%</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {selectedHistoryAction && (
                <div className="mt-4">
                  <AiInsightsCard {...(selectedHistoryAction.output as AdhocEvaluationResult)} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
