import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CircleAlert, CircleCheck, Sparkles, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { AiBadge } from "@/components/AiBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfidenceField } from "@/components/ConfidenceField";
import { FileDropzone } from "@/components/FileDropzone";
import { useAuth } from "@/context/AuthContext";
import { useUsersByRole } from "@/lib/usersApi";
import { useResumeUpload } from "@/lib/resumeParseApi";
import { useCreateCandidate, usePrecheck } from "@/lib/candidatesApi";
import { useCreateReferral, useOverrideReferralField } from "@/lib/referralsApi";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { ApiError } from "@/lib/api";
import type { FormPrefillOutput, ConfidenceScoreOutput } from "@/types/resumeParse";

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  qualification: string;
  institution: string;
  skillsText: string;
  projectTitle: string;
  projectOverview: string;
  proposedStart: string;
  proposedEnd: string;
  site: string;
  department: string;
  mentorId: string;
  unpaidConsent: boolean;
  inPersonReady: boolean;
  locationAligned: boolean;
  noFamilyRelationship: boolean;
  notes: string;
}

const DEFAULT_VALUES: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  dob: "",
  qualification: "",
  institution: "",
  skillsText: "",
  projectTitle: "",
  projectOverview: "",
  proposedStart: "",
  proposedEnd: "",
  site: "",
  department: "",
  mentorId: "",
  unpaidConsent: false,
  inPersonReady: false,
  locationAligned: false,
  noFamilyRelationship: false,
  notes: "",
};

export default function ReferralIntakePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mentors = useUsersByRole("MENTOR");
  const resumeUpload = useResumeUpload();
  const precheck = usePrecheck();
  const createCandidate = useCreateCandidate();
  const createReferral = useCreateReferral();
  const overrideField = useOverrideReferralField();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceScoreOutput | null>(null);
  const [originalPrefill, setOriginalPrefill] = useState<(FormPrefillOutput & { aiActionId: string }) | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const values = watch();
  const debouncedIdentity = useDebouncedValue(
    { fullName: values.fullName, email: values.email, phone: values.phone, dob: values.dob },
    600
  );
  const debouncedEducation = useDebouncedValue(
    { qualification: values.qualification, institution: values.institution, skillsText: values.skillsText },
    600
  );

  // AI Duplicate Check + Eligibility Validation side panels — a live,
  // side-effect-free preview (POST /candidates/precheck) as the user
  // types, separate from the authoritative check POST /candidates itself
  // runs at submit time.
  const identityKey = JSON.stringify(debouncedIdentity) + JSON.stringify(debouncedEducation);
  useEffect(() => {
    if (debouncedIdentity.fullName && debouncedIdentity.email && debouncedIdentity.phone && debouncedIdentity.dob) {
      precheck.mutate({
        fullName: debouncedIdentity.fullName,
        email: debouncedIdentity.email,
        phone: debouncedIdentity.phone,
        dob: debouncedIdentity.dob,
        qualification: debouncedEducation.qualification,
        institution: debouncedEducation.institution,
        skills: debouncedEducation.skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey]);

  const serverWarnings = useMemo(() => {
    if (!precheck.data) return [];
    return [
      ...precheck.data.missingInfo.missingFields.map((f) => `Missing or low-confidence field: ${f}`),
      ...precheck.data.validation.hints,
    ];
  }, [precheck.data]);

  async function handleResumeSelected(file: File | null) {
    setResumeFile(file);
    if (!file) return;

    try {
      const result = await resumeUpload.mutateAsync(file);
      setConfidence(result.confidence);
      setOriginalPrefill(result.prefilledForm);

      if (result.prefilledForm.fullName && result.confidence.name >= 0.6) setValue("fullName", result.prefilledForm.fullName);
      if (result.prefilledForm.email && result.confidence.email >= 0.6) setValue("email", result.prefilledForm.email);
      if (result.prefilledForm.phone && result.confidence.phone >= 0.6) setValue("phone", result.prefilledForm.phone);
      if (result.prefilledForm.qualification && result.confidence.education >= 0.6) setValue("qualification", result.prefilledForm.qualification);
      if (result.prefilledForm.institution && result.confidence.education >= 0.6) setValue("institution", result.prefilledForm.institution);
      if (result.prefilledForm.skills.length > 0 && result.confidence.skills >= 0.6) {
        setValue("skillsText", result.prefilledForm.skills.join(", "));
      }

      toast.success("Resume parsed — fields prefilled where confidence allows.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not parse resume.");
    }
  }

  // Client-side checklist — instant feedback only. The authoritative check
  // is the server's missingInfo/validation from precheck, surfaced below.
  const clientChecklist = [
    { label: "Full name provided", ok: !!values.fullName },
    { label: "Email provided", ok: !!values.email },
    { label: "Education provided", ok: !!values.qualification && !!values.institution },
    { label: "Resume uploaded", ok: !!resumeFile },
    { label: "Joining location provided", ok: !!values.site },
    { label: "Mentor selected", ok: !!values.mentorId },
  ];

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    try {
      const skills = data.skillsText.split(",").map((s) => s.trim()).filter(Boolean);

      const candidateResult = await createCandidate.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        nationality: "Not specified",
        city: data.site,
        qualification: data.qualification,
        institution: data.institution,
        skills,
        confirmDuplicate: duplicateConfirmed,
      });

      if (candidateResult.status === "needs_confirmation") {
        toast.warning("Possible duplicate candidate found — review the Duplicate Check panel and check the confirmation box to resubmit.");
        setSubmitting(false);
        return;
      }
      if (!candidateResult.candidate) {
        toast.error(candidateResult.error ?? "Could not create candidate.");
        setSubmitting(false);
        return;
      }

      const priorRelationship = data.noFamilyRelationship
        ? "None declared"
        : "Relationship declared — see referrer for details";

      const referralResult = await createReferral.mutateAsync({
        candidateId: candidateResult.candidate.id,
        mentorId: data.mentorId,
        unpaidConsent: data.unpaidConsent,
        inPersonReady: data.inPersonReady,
        locationAligned: data.locationAligned,
        priorRelationship,
        projectTitle: data.projectTitle,
        projectOverview: data.notes ? `${data.projectOverview}\n\nAdditional notes: ${data.notes}` : data.projectOverview,
        proposedStart: data.proposedStart,
        proposedEnd: data.proposedEnd,
        site: data.site,
        department: data.department,
      });

      // Any AI-prefilled field the user changed after prefill gets tracked
      // via the Day 2 override endpoint, now that the referral exists to
      // override against — not just a silent form update.
      if (originalPrefill) {
        const overrides: Array<{ field: string; value: string }> = [];
        if (originalPrefill.fullName && originalPrefill.fullName !== data.fullName) overrides.push({ field: "fullName", value: data.fullName });
        if (originalPrefill.email && originalPrefill.email !== data.email) overrides.push({ field: "email", value: data.email });
        if (originalPrefill.phone && originalPrefill.phone !== data.phone) overrides.push({ field: "phone", value: data.phone });
        if (originalPrefill.qualification && originalPrefill.qualification !== data.qualification) overrides.push({ field: "qualification", value: data.qualification });
        if (originalPrefill.institution && originalPrefill.institution !== data.institution) overrides.push({ field: "institution", value: data.institution });

        for (const { field, value } of overrides) {
          await overrideField.mutateAsync({
            referralId: referralResult.referral.id,
            entity: "CANDIDATE",
            field,
            value,
            aiActionId: originalPrefill.aiActionId,
          });
        }
      }

      toast.success("Referral submitted.");
      navigate("/candidates");
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && error.details) {
        const details = error.details as { fieldErrors?: Array<{ field: string; error: string }> };
        if (details.fieldErrors) {
          for (const { field, error: message } of details.fieldErrors) {
            setError(field as keyof FormValues, { message });
          }
        }
        toast.error(error.message);
      } else {
        toast.error(error instanceof ApiError ? error.message : "Could not submit referral.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Referral Intake"
        description="Refer a candidate for an internship — resume parsing prefills the form where AI is confident."
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
              <CardDescription>Upload a resume to prefill these fields automatically.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FileDropzone file={resumeFile} onFileSelected={(f) => void handleResumeSelected(f)} />
              {resumeUpload.isPending && <Skeleton className="h-4 w-40" />}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <ConfidenceField confidence={confidence?.name}>
                    <Input id="fullName" {...register("fullName", { required: true })} />
                  </ConfidenceField>
                  {errors.fullName && <p className="text-sm text-destructive">Full name is required</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <ConfidenceField confidence={confidence?.email}>
                    <Input id="email" type="email" {...register("email", { required: true })} />
                  </ConfidenceField>
                  {errors.email && <p className="text-sm text-destructive">Email is required</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <ConfidenceField confidence={confidence?.phone}>
                    <Input id="phone" {...register("phone")} />
                  </ConfidenceField>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input id="dob" type="date" {...register("dob", { required: true })} />
                  {errors.dob && <p className="text-sm text-destructive">Date of birth is required</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Education — Qualification</Label>
                  <ConfidenceField confidence={confidence?.education}>
                    <Input id="qualification" {...register("qualification")} />
                  </ConfidenceField>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Education — Institution</Label>
                  <ConfidenceField confidence={confidence?.education}>
                    <Input id="institution" {...register("institution")} />
                  </ConfidenceField>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="skillsText">Skills (comma-separated)</Label>
                  <ConfidenceField confidence={confidence?.skills}>
                    <Input id="skillsText" {...register("skillsText")} />
                  </ConfidenceField>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Internship Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="projectTitle">Project Name *</Label>
                <Input id="projectTitle" {...register("projectTitle", { required: true })} />
                {errors.projectTitle && <p className="text-sm text-destructive">Project name is required</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="projectOverview">Project Overview *</Label>
                <Textarea id="projectOverview" {...register("projectOverview", { required: true })} />
                {errors.projectOverview && <p className="text-sm text-destructive">Project overview is required</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedStart">Duration — Start *</Label>
                <Input id="proposedStart" type="date" {...register("proposedStart", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedEnd">Duration — End *</Label>
                <Input id="proposedEnd" type="date" {...register("proposedEnd", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site">Joining Location *</Label>
                <Input id="site" {...register("site", { required: true })} />
                {errors.site && <p className="text-sm text-destructive">Joining location is required</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input id="department" {...register("department", { required: true })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referrer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Referrer Name</Label>
                <Input value={user?.name ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mentorId">Mentor Name *</Label>
                <Controller
                  name="mentorId"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="mentorId" className="w-full">
                        <SelectValue placeholder={mentors.isPending ? "Loading mentors…" : "Select a mentor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {mentors.data?.users.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.mentorId && <p className="text-sm text-destructive">Mentor is required</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eligibility & Declarations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Controller
                name="unpaidConsent"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Candidate consents to an unpaid internship.
                  </label>
                )}
              />
              <Controller
                name="inPersonReady"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Candidate is ready to join in person.
                  </label>
                )}
              />
              <Controller
                name="locationAligned"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    Candidate's preferred joining location matches the assigned site.
                  </label>
                )}
              />
              <Controller
                name="noFamilyRelationship"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    I declare no direct family or close personal relationship with the candidate.
                  </label>
                )}
              />

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea id="notes" {...register("notes")} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled>
              Save Draft
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner />}
              {submitting ? "Submitting…" : "Submit Referral"}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                AI Duplicate Check
                <AiBadge />
              </CardTitle>
              <CardDescription>Checks as you type the candidate's name, email, phone, and DOB.</CardDescription>
            </CardHeader>
            <CardContent>
              {precheck.isPending ? (
                <Skeleton className="h-10 w-full" />
              ) : !precheck.data?.duplicate ? (
                <EmptyState message="Enter name, email, phone, and DOB to check for duplicates." />
              ) : precheck.data.duplicate.isDuplicate ? (
                <div className="flex items-center gap-2 text-sm text-status-critical">
                  <CircleAlert className="size-4 shrink-0" />
                  Exact match found — this candidate may already exist.
                </div>
              ) : precheck.data.duplicate.possibleDuplicate ? (
                <div className="flex flex-col gap-2 text-sm text-status-warning">
                  {precheck.data.duplicate.matches.map((m) => (
                    <div key={m.candidateId} className="flex items-center gap-2">
                      <TriangleAlert className="size-4 shrink-0" />
                      Possible match: {m.fullName}, {Math.round(m.similarity * 100)}%
                    </div>
                  ))}
                  <label className="mt-1 flex items-center gap-2 text-xs text-foreground">
                    <Checkbox checked={duplicateConfirmed} onCheckedChange={(c) => setDuplicateConfirmed(c === true)} />
                    This is not a duplicate — proceed anyway.
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-status-good">
                  <CircleCheck className="size-4 shrink-0" />
                  No duplicates found.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                AI Eligibility Validation
                <Sparkles className="size-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Live checklist, plus server-side checks run as you type and at submit.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="flex flex-col gap-1.5 text-sm">
                {clientChecklist.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    {item.ok ? (
                      <CircleCheck className="size-4 shrink-0 text-status-good" />
                    ) : (
                      <CircleAlert className="size-4 shrink-0 text-status-warning" />
                    )}
                    <span className={item.ok ? "text-muted-foreground" : ""}>{item.label}</span>
                  </li>
                ))}
              </ul>
              {serverWarnings.length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">From server-side AI checks:</p>
                  <ul className="flex flex-col gap-1.5 text-sm text-status-warning">
                    {serverWarnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
