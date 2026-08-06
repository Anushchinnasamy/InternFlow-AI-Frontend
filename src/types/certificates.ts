export interface IssuedCertificate {
  id: string;
  internshipId: string;
  referenceNumber: string;
  storageUri: string;
  issuedAt: string;
  candidateName: string;
  projectTitle: string;
}

export interface PendingCertificate {
  internshipId: string;
  candidateName: string;
  projectTitle: string;
  certificateRequestedAt: string;
  certificateApprovedAt: string | null;
}

export interface IssuedCertificatesResponse {
  issued: IssuedCertificate[];
}

export interface PendingCertificatesResponse {
  pending: PendingCertificate[];
}
