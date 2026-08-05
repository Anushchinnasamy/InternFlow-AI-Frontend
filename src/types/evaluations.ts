export type Recommendation = "HIRE" | "MAYBE" | "REJECT";
export type Decision = "REJECT" | "SHORTLIST" | "SELECT";

export interface Evaluation {
  id: string;
  candidateId: string;
  jobDescription: string;
  matchScore: number;
  recommendation: Recommendation;
  strengths: string[];
  weaknesses: string[];
  aiSummary: string;
  rubricCommunication: number | null;
  rubricTechnical: number | null;
  rubricExperience: number | null;
  rubricCulturalFit: number | null;
  decision: Decision | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface EvaluationsListResponse {
  evaluations: Evaluation[];
}

export interface RubricInput {
  communication: number;
  technical: number;
  experience: number;
  culturalFit: number;
}

export interface AdhocEvaluationResult {
  matchScore: number;
  recommendation: Recommendation;
  strengths: string[];
  weaknesses: string[];
  aiSummary: string;
}
