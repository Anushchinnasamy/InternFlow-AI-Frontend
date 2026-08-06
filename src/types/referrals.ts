export interface CreateReferralInput {
  candidateId: string;
  mentorId: string;
  unpaidConsent: boolean;
  inPersonReady: boolean;
  locationAligned: boolean;
  priorRelationship: string;
  projectTitle: string;
  projectOverview: string;
  proposedStart: string;
  proposedEnd: string;
  site: string;
  department: string;
}

export interface CreateReferralResponse {
  referral: { id: string; status: string };
  task: { id: string };
}

export interface ReferralFieldError {
  field: string;
  error: string;
}

export interface OverrideInput {
  entity: "REFERRAL" | "CANDIDATE";
  field: string;
  value: unknown;
  aiActionId: string;
}

export interface PendingMentorConfirmation {
  id: string;
  candidateName: string;
  candidateEmail: string;
  referrerName: string;
  projectTitle: string;
  projectOverview: string;
  proposedStart: string;
  proposedEnd: string;
  site: string;
  department: string;
  priorRelationship: string;
  conflictDeclared: boolean;
  createdAt: string;
}
