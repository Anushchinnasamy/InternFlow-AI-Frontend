import type { JoiningRecord } from "@/types/joiningRecord";

export interface CandidateSearchReferral {
  id: string;
  projectTitle: string;
  status: string;
  internship: { id: string; nonWorkerId: string | null; status: string; mentorId: string } | null;
}

export interface LatestEvaluation {
  matchScore: number;
  recommendation: "HIRE" | "MAYBE" | "REJECT";
  decision: "REJECT" | "SHORTLIST" | "SELECT" | null;
}

export interface CandidateSearchResult {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  referrals: CandidateSearchReferral[];
  latestEvaluation: LatestEvaluation | null;
}

export interface CandidateSearchResponse {
  results: CandidateSearchResult[];
}

export interface Candidate360Referral {
  id: string;
  projectTitle: string;
  status: string;
  referrerName: string;
  mentorName: string;
  internship: {
    id: string;
    status: string;
    nonWorkerId: string | null;
    actualStart: string | null;
    actualEnd: string | null;
  } | null;
}

export interface Candidate360Response {
  candidate: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    city: string;
    nationality: string;
    qualification: string;
    institution: string;
    skills: string[];
  };
  referrals: Candidate360Referral[];
  joiningRecord: JoiningRecord | null;
  statusHistory: unknown[];
  documents: unknown[];
  tasks: unknown[];
  aiActions: unknown[];
}

export interface CreateCandidateInput {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  nationality: string;
  city: string;
  qualification: string;
  institution: string;
  skills: string[];
  linkedinUrl?: string;
  confirmDuplicate?: boolean;
}

export interface DuplicateMatch {
  candidateId: string;
  fullName: string;
  similarity: number;
}

export interface CreateCandidateResponse {
  candidate?: { id: string };
  status?: "needs_confirmation";
  message?: string;
  matches?: DuplicateMatch[];
  existingCandidateId?: string;
  error?: string;
}

export interface PrecheckInput {
  fullName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  qualification?: string;
  institution?: string;
  skills?: string[];
}

export interface PrecheckResponse {
  duplicate: { isDuplicate: boolean; duplicateCandidateId: string | null; possibleDuplicate: boolean; matches: DuplicateMatch[] } | null;
  missingInfo: { missingFields: string[] };
  validation: { hints: string[] };
}
