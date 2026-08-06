import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2, Lock, CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProgressTracker } from "@/components/ProgressTracker";
import { FileDropzone } from "@/components/FileDropzone";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useCandidate360 } from "@/lib/candidatesApi";
import {
  useCandidateMe,
  useCreateOrGetOwnJoiningRecord,
  useJoiningRecord,
  usePatchJoiningRecord,
  useSubmitJoiningRecord,
  useVerifyJoiningRecord,
  useUploadAttachment,
} from "@/lib/joiningFormsApi";
import { useInternshipDocuments } from "@/lib/internshipsApi";
import { isAtOrPastStage } from "@/lib/statusMapping";
import { ApiError } from "@/lib/api";
import type { EducationEntry, EmploymentEntry } from "@/types/joiningRecord";

interface FormValues {
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  govtIdType: string;
  govtIdNumber: string;
  educationHistory: EducationEntry[];
  employmentHistory: EmploymentEntry[];
}

const CORRECTION_FIELD_OPTIONS = [
  { value: "address", label: "Address" },
  { value: "emergencyContactName", label: "Emergency Contact Name" },
  { value: "emergencyContactPhone", label: "Emergency Contact Phone" },
  { value: "govtIdType", label: "Government ID Type" },
  { value: "govtIdNumber", label: "Government ID Number" },
  { value: "educationHistory", label: "Education History" },
  { value: "employmentHistory", label: "Employment History" },
];

export default function OnboardingPage() {
  const { candidateId: paramCandidateId } = useParams<{ candidateId?: string }>();
  const { user } = useAuth();
  const isCandidateRole = user?.role === "CANDIDATE";

  // CANDIDATE role: resolve their own candidate/internship via /candidates/me.
  // HR role: fetch the specific candidate via /candidates/:id/360 (candidate.view360
  // deliberately excludes CANDIDATE, so this path is HR-only anyway).
  const selfMeQuery = useCandidateMe(isCandidateRole);
  const view360Query = useCandidate360(!isCandidateRole ? paramCandidateId : undefined);

  const candidate = isCandidateRole ? selfMeQuery.data?.candidate : view360Query.data?.candidate;
  const referral = !isCandidateRole ? view360Query.data?.referrals[0] : undefined;
  const internshipId = isCandidateRole ? selfMeQuery.data?.internship?.id : referral?.internship?.id;
  const internshipStatus = isCandidateRole ? selfMeQuery.data?.internship?.status : referral?.internship?.status;

  // CANDIDATE: create-or-fetch their own joining record once their internship exists.
  const createOrGet = useCreateOrGetOwnJoiningRecord();
  const [ownRecordId, setOwnRecordId] = useState<string | undefined>();
  useEffect(() => {
    if (isCandidateRole && internshipId && !ownRecordId && !createOrGet.isPending) {
      createOrGet.mutateAsync().then((record) => setOwnRecordId(record.id)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCandidateRole, internshipId]);

  // HR mode never needs to know a joining-record id ahead of time — it
  // rides along on the 360 response, already masked/unmasked per role.
  const joiningRecordId = isCandidateRole ? ownRecordId : undefined;
  const joiningRecordQuery = useJoiningRecord(joiningRecordId);
  const joiningRecord = isCandidateRole ? joiningRecordQuery.data?.joiningRecord : view360Query.data?.joiningRecord;
  const effectiveRecordId = isCandidateRole ? joiningRecordId : (joiningRecord as { id?: string } | undefined)?.id;

  const patchRecord = usePatchJoiningRecord(effectiveRecordId);
  const submitRecord = useSubmitJoiningRecord(effectiveRecordId);
  const verifyRecord = useVerifyJoiningRecord(effectiveRecordId);
  const uploadAttachment = useUploadAttachment(effectiveRecordId);
  const documentsQuery = useInternshipDocuments(internshipId);

  const { register, control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      govtIdType: "",
      govtIdNumber: "",
      educationHistory: [],
      employmentHistory: [],
    },
  });
  const educationArray = useFieldArray({ control, name: "educationHistory" });
  const employmentArray = useFieldArray({ control, name: "employmentHistory" });

  useEffect(() => {
    if (joiningRecord) {
      reset({
        address: joiningRecord.address ?? "",
        emergencyContactName: joiningRecord.emergencyContactName ?? "",
        emergencyContactPhone: joiningRecord.emergencyContactPhone ?? "",
        govtIdType: joiningRecord.govtIdType ?? "",
        govtIdNumber: joiningRecord.govtIdNumber ?? "",
        educationHistory: joiningRecord.educationHistory ?? [],
        employmentHistory: joiningRecord.employmentHistory ?? [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joiningRecord?.id, joiningRecord?.locked, joiningRecord?.correctionFields?.length]);

  // Bug found in manual testing: nothing anywhere on this page captured
  // consentVersion/consentedAt, which POST /:id/submit requires — Submit
  // was a guaranteed 400 no matter what else was filled in. Given consent
  // is a one-time legal affirmation, it's persisted immediately on check
  // (see giveConsent below) rather than waiting for a separate "Save Draft"
  // click. Declared here, before the early returns below, since hooks can't
  // follow a conditional return.
  const [consentGiven, setConsentGiven] = useState(!!joiningRecord?.consentVersion);
  useEffect(() => {
    setConsentGiven(!!joiningRecord?.consentVersion);
  }, [joiningRecord?.consentVersion]);

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [correctionFields, setCorrectionFields] = useState<string[]>([]);
  const [correctionReason, setCorrectionReason] = useState("");

  if (isCandidateRole && !user) return null;
  if (!isCandidateRole && !paramCandidateId) {
    return (
      <>
        <PageHeader title="Onboarding" description="Track joining-form completion, Non-Worker ID issuance, and NDA signature status." />
        <EmptyState message="Select a candidate from the Candidates page to view their onboarding form." />
      </>
    );
  }

  const isLoadingContext = isCandidateRole ? selfMeQuery.isPending : view360Query.isPending;
  if (isLoadingContext) {
    return (
      <>
        <PageHeader title="Onboarding" description="Track joining-form completion, Non-Worker ID issuance, and NDA signature status." />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  if (!candidate) {
    return (
      <>
        <PageHeader title="Onboarding" description="Track joining-form completion, Non-Worker ID issuance, and NDA signature status." />
        <EmptyState message="No candidate profile found." />
      </>
    );
  }

  const status = internshipStatus ?? "";
  // Backend's real order is Joining Form -> Non-Worker ID -> NDA -> Access —
  // deliberately different from the reference design's Joining Form -> NDA
  // -> Non-Worker ID -> Access. Showing the design's order here would claim
  // progress that hasn't actually happened yet.
  const steps = [
    { label: "Joining Form", done: isAtOrPastStage(status, "JOINING_SUBMITTED"), active: status === "JOINING_PENDING" },
    { label: "Non-Worker ID", done: isAtOrPastStage(status, "ID_ISSUED"), active: status === "VERIFIED" },
    { label: "NDA", done: isAtOrPastStage(status, "NDA_SIGNED"), active: status === "ID_ISSUED" || status === "NDA_PENDING" },
    { label: "Access Provisioning", done: isAtOrPastStage(status, "ACCESS_PROVISIONED"), active: status === "NDA_SIGNED" },
  ];

  const record = joiningRecord;
  const isLocked = !!record?.locked;
  const isAwaitingVerification = !!record?.submittedAt && (record?.correctionFields.length ?? 0) === 0;
  const hasCorrections = (record?.correctionFields.length ?? 0) > 0;
  const readOnly = !isCandidateRole || isLocked || isAwaitingVerification;
  const editableFields: readonly string[] = hasCorrections
    ? record!.correctionFields
    : ["address", "emergencyContactName", "emergencyContactPhone", "govtIdType", "govtIdNumber", "educationHistory", "employmentHistory"];

  async function handleSave(values: FormValues) {
    const payload: Record<string, unknown> = {};
    for (const field of Object.keys(values) as (keyof FormValues)[]) {
      if (editableFields.includes(field)) payload[field] = values[field];
    }
    if (Object.keys(payload).length === 0) return;
    try {
      await patchRecord.mutateAsync(payload);
      toast.success("Saved.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save.");
    }
  }

  async function handleSubmitForm() {
    try {
      await submitRecord.mutateAsync();
      toast.success("Joining form submitted for HR verification.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not submit.");
    }
  }

  async function giveConsent() {
    try {
      await patchRecord.mutateAsync({ consentVersion: "v1", consentedAt: new Date().toISOString() });
      setConsentGiven(true);
      toast.success("Consent recorded.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not record consent.");
    }
  }

  async function handleLock() {
    try {
      await verifyRecord.mutateAsync({ decision: "LOCK" });
      toast.success("Joining form verified and locked.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not verify.");
    }
  }

  async function handleReturnForCorrection() {
    if (correctionFields.length === 0 || !correctionReason.trim()) {
      toast.error("Select at least one field and provide a reason.");
      return;
    }
    try {
      await verifyRecord.mutateAsync({ decision: "RETURN_FOR_CORRECTION", reason: correctionReason, fieldsToCorrect: correctionFields });
      toast.success("Returned to candidate for correction.");
      setReturnDialogOpen(false);
      setCorrectionFields([]);
      setCorrectionReason("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not return for correction.");
    }
  }

  return (
    <>
      <PageHeader
        title="Onboarding"
        description={`${candidate.fullName} — track joining-form completion, Non-Worker ID issuance, and NDA signature status.`}
      />

      <Card className="mb-4">
        <CardContent>
          <ProgressTracker steps={steps} />
        </CardContent>
      </Card>

      {(isLocked || isAwaitingVerification) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
          {isLocked ? <Lock className="size-4 shrink-0" /> : <CircleCheck className="size-4 shrink-0" />}
          {isLocked ? "This joining form is locked." : "Submitted — awaiting HR verification."}
        </div>
      )}
      {hasCorrections && (
        <div className="mb-4 rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-sm text-status-warning">
          HR returned this form for correction on: {record!.correctionFields.join(", ")}
        </div>
      )}

      <form onSubmit={handleSubmit(handleSave)} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Full name and nationality come from the referral intake and aren't editable here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={candidate.fullName} disabled />
            </div>
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input value={candidate.nationality} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Name</Label>
              <Input id="emergencyContactName" disabled={readOnly || !editableFields.includes("emergencyContactName")} {...register("emergencyContactName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Phone</Label>
              <Input id="emergencyContactPhone" disabled={readOnly || !editableFields.includes("emergencyContactPhone")} {...register("emergencyContactPhone")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>A single address field — the backend doesn't model separate line/city/state/postal columns.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea disabled={readOnly || !editableFields.includes("address")} {...register("address")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {educationArray.fields.map((field, i) => (
              <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
                <Input placeholder="Degree" disabled={readOnly} {...register(`educationHistory.${i}.qualification`)} />
                <Input placeholder="University" disabled={readOnly} {...register(`educationHistory.${i}.institution`)} />
                <Input placeholder="Year" disabled={readOnly} {...register(`educationHistory.${i}.endYear`)} />
                <Input placeholder="CGPA" disabled={readOnly} {...register(`educationHistory.${i}.cgpa`)} />
                {!readOnly && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => educationArray.remove(i)}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => educationArray.append({})}>
                <Plus />
                Add Education
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employment History</CardTitle>
            <CardDescription>Optional.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {employmentArray.fields.map((field, i) => (
              <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
                <Input placeholder="Company" disabled={readOnly} {...register(`employmentHistory.${i}.company`)} />
                <Input placeholder="Role" disabled={readOnly} {...register(`employmentHistory.${i}.role`)} />
                <Input placeholder="Duration" disabled={readOnly} {...register(`employmentHistory.${i}.duration`)} />
                <Input placeholder="Reference" disabled={readOnly} {...register(`employmentHistory.${i}.reference`)} />
                {!readOnly && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => employmentArray.remove(i)}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => employmentArray.append({})}>
                <Plus />
                Add Employment
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Government ID</CardTitle>
            <CardDescription>
              Masked for every role except HR/Legal, per the Day 3 PII rule — one type+number pair, not four
              simultaneous fields (the backend doesn't model PAN/Aadhaar/Passport/License separately).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="govtIdType">ID Type</Label>
              <Input id="govtIdType" placeholder="PAN / Aadhaar / SSN / Passport / Driver's License" disabled={readOnly || !editableFields.includes("govtIdType")} {...register("govtIdType")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="govtIdNumber">ID Number</Label>
              <Input id="govtIdNumber" disabled={readOnly || !editableFields.includes("govtIdNumber")} {...register("govtIdNumber")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Uploads</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>ID Proof</Label>
              <FileDropzone
                file={null}
                accept=".pdf,.jpg,.jpeg,.png"
                hint="PDF or image"
                onFileSelected={(file) => {
                  if (file) uploadAttachment.mutate({ file, documentType: "GOVT_ID" }, { onSuccess: () => toast.success("ID proof uploaded.") });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Education Certificate</Label>
              <FileDropzone
                file={null}
                accept=".pdf,.jpg,.jpeg,.png"
                hint="PDF or image"
                onFileSelected={(file) => {
                  if (file) uploadAttachment.mutate({ file, documentType: "EDUCATION_CERT" }, { onSuccess: () => toast.success("Education certificate uploaded.") });
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Address Proof isn't supported yet — the backend's DocumentType enum only has GOVT_ID and
              EDUCATION_CERT for joining-form attachments.
            </p>
            {documentsQuery.data && documentsQuery.data.documents.length > 0 && (
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Uploaded:</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {documentsQuery.data.documents
                    .filter((d) => d.type === "GOVT_ID" || d.type === "EDUCATION_CERT")
                    .map((d) => (
                      <li key={d.id}>
                        <Badge variant="secondary">{d.type}</Badge> v{d.version}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {isCandidateRole && (
          <Card>
            <CardHeader>
              <CardTitle>Consent</CardTitle>
              <CardDescription>Required before this form can be submitted.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={consentGiven}
                  disabled={readOnly || consentGiven || patchRecord.isPending}
                  onCheckedChange={(checked) => {
                    if (checked) void giveConsent();
                  }}
                />
                <span>
                  I consent to Intern Flow processing my personal data (including government ID and education
                  history) for the purpose of this unpaid internship.
                  {consentGiven && joiningRecord?.consentedAt && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (recorded {new Date(joiningRecord.consentedAt).toLocaleString()})
                    </span>
                  )}
                </span>
              </label>
            </CardContent>
          </Card>
        )}

        {isCandidateRole && !readOnly && (
          <div className="flex justify-end gap-2">
            <Button type="submit" variant="outline" disabled={patchRecord.isPending}>
              {patchRecord.isPending ? "Saving…" : "Save Draft"}
            </Button>
            {!hasCorrections && (
              <Button
                type="button"
                disabled={submitRecord.isPending || !consentGiven}
                title={!consentGiven ? "Consent is required before submitting" : undefined}
                onClick={() => void handleSubmitForm()}
              >
                {submitRecord.isPending ? "Submitting…" : "Submit"}
              </Button>
            )}
          </div>
        )}
        {isCandidateRole && hasCorrections && (
          <div className="flex justify-end">
            <Button type="submit" disabled={patchRecord.isPending}>
              {patchRecord.isPending ? "Saving…" : "Save Corrections"}
            </Button>
          </div>
        )}

        {!isCandidateRole && isAwaitingVerification && (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(true)}>
              Return for Correction
            </Button>
            <Button type="button" disabled={verifyRecord.isPending} onClick={() => void handleLock()}>
              {verifyRecord.isPending ? "Verifying…" : "Verify & Lock"}
            </Button>
          </div>
        )}
      </form>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for correction</DialogTitle>
            <DialogDescription>Select which fields the candidate needs to fix, and explain why.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {CORRECTION_FIELD_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={correctionFields.includes(opt.value)}
                    onCheckedChange={(checked) =>
                      setCorrectionFields((prev) => (checked ? [...prev, opt.value] : prev.filter((f) => f !== opt.value)))
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleReturnForCorrection()}>Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
