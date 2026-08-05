export interface EducationEntry {
  qualification?: string;
  institution?: string;
  endYear?: string;
  cgpa?: string;
}

export interface EmploymentEntry {
  company?: string;
  role?: string;
  duration?: string;
  reference?: string;
}

export interface JoiningRecord {
  id: string;
  candidateId: string;
  internshipId: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  govtIdType: string | null;
  govtIdNumber: string | null;
  educationHistory: EducationEntry[] | null;
  employmentHistory: EmploymentEntry[] | null;
  dob: string | null;
  consentVersion: string | null;
  consentedAt: string | null;
  submittedAt: string | null;
  correctionFields: string[];
  locked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  createdAt: string;
}

export interface CandidateMeResponse {
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
  } | null;
  internship: { id: string; status: string; nonWorkerId: string | null; actualStart: string | null; actualEnd: string | null } | null;
}

export interface DocumentRow {
  id: string;
  internshipId: string;
  type: string;
  storageUri: string;
  sha256: string;
  signedAt: string | null;
  version: number;
  createdAt: string;
}
