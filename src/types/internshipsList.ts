export type NdaDocStatus = "pending" | "signed" | "expired";

export interface NdaDocSummary {
  id: string;
  version: number;
  signedAt: string | null;
  expiredAt: string | null;
  status: NdaDocStatus;
}

export interface ChecklistItem {
  id: string;
  checklist: Record<string, "pending" | "in_progress" | "provisioned"> | null;
  completedAt: string | null;
}

export interface SiteAccessTaskSummary {
  id: string;
  completedAt: string | null;
}

export interface OpenTaskSummary {
  type: string;
  assigneeRole: string;
  slaBreached: boolean;
}

export interface ExtensionRequestPayload {
  requestedEndDate: string;
  justification: string;
  hrApproved: boolean;
  hrApprovedBy: string | null;
  hrApprovedAt: string | null;
  programOwnerApproved: boolean;
  programOwnerApprovedBy: string | null;
  programOwnerApprovedAt: string | null;
}

export interface ExtensionRequestTaskSummary {
  id: string;
  payload: ExtensionRequestPayload;
}

export interface InternshipListItem {
  id: string;
  status: string;
  nonWorkerId: string | null;
  nonWorkerIdDeactivatedAt: string | null;
  adAccountActive: boolean;
  badgeNumber: string | null;
  badgeReturnedAt: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  mentorCompletionConfirmedAt: string | null;
  certificateRequestedAt: string | null;
  certificateApprovedAt: string | null;
  hasCertificate: boolean;
  candidateId: string;
  candidateName: string;
  projectTitle: string;
  mentorName: string;
  mentorId: string;
  referralId: string;
  joiningRecordId: string | null;
  stageEnteredAt: string;
  startDate: string;
  endDate: string;
  openTask: OpenTaskSummary | null;
  nda: NdaDocSummary | null;
  adProvisionTask: ChecklistItem | null;
  siteAccessTask: SiteAccessTaskSummary | null;
  exitChecklistTask: ChecklistItem | null;
  extensionRequestTask: ExtensionRequestTaskSummary | null;
}

export interface InternshipsListResponse {
  internships: InternshipListItem[];
}
