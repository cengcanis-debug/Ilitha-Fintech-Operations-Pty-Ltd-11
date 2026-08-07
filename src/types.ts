/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CandidateDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // Base64 encoding for storage
  uploadedAt: string;
}

export interface Candidate {
  id: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  email: string;
  studentNumber: string;
  nqfLevel: number;
  qualificationName: string;
  institution: string;
  dhaVerified: boolean;
  saqaVerified: boolean;
  isInternational?: boolean;
  originCountry?: string;
  foreignEvaluationNo?: string;
  foreignEvaluationAuthority?: string;
  internationalVerified?: boolean;
  uploadedDocuments?: CandidateDocument[];
  verifiedAt?: string;
  rankScore?: number;
  matchFeedback?: string;
  alignmentRating?: string;
  status: 'pending' | 'verified' | 'rejected' | 'flagged';
  createdAt?: string;
  drivingLicense?: string;
  drivingCodes?: string;
  extraSkills?: string;
  linkedinImported?: boolean;
  linkedinVerified?: boolean;
  linkedinImportedAt?: string;
  linkedinVerifiedAt?: string;
  linkedinReferenceId?: string;
  linkedinVettedSummary?: string;
  linkedinConfidenceScore?: number;
  workHistory?: string;
  employmentStatus?: 'Employed' | 'Unemployed';
  isCrossTransferSeeker?: boolean;
  currentProvince?: string;
  preferredProvince?: string;
  transferPosition?: string;
}

export interface Job {
  id: string;
  title: string;
  requiredNqfLevel: number;
  department: string;
  description: string;
  status: 'open' | 'filled' | 'cancelled';
  createdAt?: string;
}

export interface HiringDecision {
  id: string;
  jobId: string;
  candidateId: string;
  decision: 'shortlisted' | 'hired' | 'rejected';
  rankScoreAtDecision: number;
  justification: string;
  recordedBy: string;
  recordedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  candidateId: string;
  performedBy: string;
  timestamp: string;
  ipAddress: string;
  systemHash: string;
}

export interface VerificationState {
  dhaStatus: 'unverified' | 'verifying' | 'success' | 'failed';
  saqaStatus: 'unverified' | 'verifying' | 'success' | 'failed';
  dhaError?: string;
  saqaError?: string;
}

export interface DispatchedEmail {
  id: string;
  candidateId: string;
  candidateName: string;
  toEmail: string;
  subject: string;
  body: string;
  decision: 'hired' | 'shortlisted' | 'rejected';
  timestamp: string;
  status: 'sent' | 'simulated' | 'failed';
  error?: string;
}

export interface DigestSettings {
  auditorEmail: string;
  enabled: boolean;
  lastSentTime: string;
  nextScheduledTime: string;
}

export interface WeeklyDigestLog {
  id: string;
  toEmail: string;
  sentAt: string;
  status: 'sent' | 'simulated' | 'failed';
  error?: string;
  decisionsCount: number;
  auditLogsCount: number;
  coveredPeriodStart: string;
  coveredPeriodEnd: string;
  emailId: string;
}

export interface BulkVerificationBatchResult {
  candidateId: string;
  candidateName: string;
  nationalId: string;
  dhaStatus: 'success' | 'failed' | 'skipped';
  saqaStatus: 'success' | 'failed' | 'skipped';
  dhaError?: string | null;
  saqaError?: string | null;
}

export interface BulkVerificationBatch {
  id: string;
  timestamp: string;
  totalCandidates: number;
  successfulDha: number;
  successfulSaqa: number;
  failedCount: number;
  skippedCount: number;
  performedBy: string;
  results: BulkVerificationBatchResult[];
}


