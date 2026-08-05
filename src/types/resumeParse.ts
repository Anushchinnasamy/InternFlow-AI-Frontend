export interface ResumeParseOutput {
  name: string | null;
  email: string | null;
  phone: string | null;
  education: string[];
  skills: string[];
}

export interface ConfidenceScoreOutput {
  name: number;
  email: number;
  phone: number;
  education: number;
  skills: number;
}

export interface FormPrefillOutput {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  qualification: string | null;
  institution: string | null;
  skills: string[];
  aiActionId: string;
}

export interface MissingInfoOutput {
  missingFields: string[];
}

export interface SmartValidationOutput {
  hints: string[];
}

export interface ResumeParseResponse {
  parsed: ResumeParseOutput;
  confidence: ConfidenceScoreOutput;
  prefilledForm: FormPrefillOutput;
  missingInfo: MissingInfoOutput;
  validation: SmartValidationOutput;
}
