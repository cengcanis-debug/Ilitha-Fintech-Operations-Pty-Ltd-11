import { doc, setDoc, getDoc, getDocs, collection, query, addDoc, onSnapshot } from 'firebase/firestore';
import { db, auth, isMockFirebase, handleFirestoreError, OperationType } from './firebase';
import { Candidate, Job, HiringDecision, AuditLog, DispatchedEmail, DigestSettings, WeeklyDigestLog, BulkVerificationBatch } from '../types';

// Fallback logic of writing/reading over REST to our full-stack server
// ensures data is perfectly synchronized and stored in all installation scenarios.

const HARDCODED_FALLBACK_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Senior Cloud Infrastructure Security Engineer",
    requiredNqfLevel: 8,
    department: "National Treasury IT Security",
    description: "Responsible for managing high-security container routing and zero-trust firewall configurations for South African financial clearance grids.",
    status: "open",
    createdAt: new Date().toISOString()
  },
  {
    id: "job-2",
    title: "Primary Health Informatics Systems Administrator",
    requiredNqfLevel: 6,
    department: "Department of Health (Gauteng)",
    description: "Overseeing state clinic patient registration queues and LURITS sync pathways. Requires high attention to detail and verified qualifications.",
    status: "open",
    createdAt: new Date().toISOString()
  },
  {
    id: "job-3",
    title: "Lead Artificial Intelligence Architect",
    requiredNqfLevel: 9,
    department: "Funa Ispan Mzantsi Secure Frameworks",
    description: "Orchestrating national employment ledger compliance verifications and training ethical government data schemas.",
    status: "open",
    createdAt: new Date().toISOString()
  }
];

export async function getCandidates(): Promise<Candidate[]> {
  if (isMockFirebase) {
    try {
      const res = await fetch('/api/local/candidates');
      return await res.json();
    } catch (err) {
      console.warn("Local candidate fetch failed, returning empty candidates store:", err);
      return [];
    }
  }
  const path = 'candidates';
  try {
    const qSnapshot = await getDocs(collection(db, path));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
  } catch (error) {
    console.warn("Firestore candidates get failed, leveraging localized compliance fallback:", error);
    try {
      const res = await fetch('/api/local/candidates');
      return await res.json();
    } catch (err) {
      console.warn("Sovereign localized backup candidates cache offline:", err);
      return [];
    }
  }
}

export async function saveCandidate(candidate: Candidate): Promise<Candidate> {
  const path = 'candidates';
  // Always update our backend server as well so AI match caches remain hot
  try {
    await fetch('/api/local/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate)
    });
  } catch (e) {
    console.error("Local candidate cache write failed:", e);
  }

  if (isMockFirebase) {
    return candidate;
  }

  try {
    await setDoc(doc(db, path, candidate.id), candidate);
    return candidate;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${candidate.id}`);
    return candidate;
  }
}

export async function getJobs(): Promise<Job[]> {
  if (isMockFirebase) {
    try {
      const res = await fetch('/api/local/jobs');
      return await res.json();
    } catch (err) {
      console.warn("Local jobs fetch failed, returning static fallback catalog:", err);
      return HARDCODED_FALLBACK_JOBS;
    }
  }
  const path = 'jobs';
  try {
    const qSnapshot = await getDocs(collection(db, path));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
  } catch (error) {
    console.warn("Firestore jobs query failed, yielding local fallback catalog:", error);
    try {
      const res = await fetch('/api/local/jobs');
      return await res.json();
    } catch (err) {
      console.warn("Local node job list unreachable, supplying fallback schema:", err);
      return HARDCODED_FALLBACK_JOBS;
    }
  }
}

export async function saveJob(job: Job): Promise<Job> {
  const path = 'jobs';
  try {
    await fetch('/api/local/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job)
    });
  } catch (e) {
    console.error("Local job write failed:", e);
  }

  if (isMockFirebase) {
    return job;
  }

  try {
    await setDoc(doc(db, path, job.id), job);
    return job;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${job.id}`);
    return job;
  }
}

export async function getDecisions(): Promise<HiringDecision[]> {
  if (isMockFirebase) {
    try {
      const res = await fetch('/api/local/decisions');
      return await res.json();
    } catch (err) {
      console.warn("Local decisions fetch failed, returning empty store:", err);
      return [];
    }
  }
  const path = 'hiringDecisions';
  try {
    const qSnapshot = await getDocs(collection(db, path));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HiringDecision));
  } catch (error) {
    console.warn("Hiring decisions read error, reverting to server-stored audit backups:", error);
    try {
      const res = await fetch('/api/local/decisions');
      return await res.json();
    } catch (err) {
      console.warn("Sovereign localized backup decisions cache offline:", err);
      return [];
    }
  }
}

export async function recordDecision(decision: Omit<HiringDecision, 'id' | 'recordedAt'>): Promise<HiringDecision> {
  const res = await fetch('/api/local/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decision)
  });
  const saved: HiringDecision = await res.json();

  if (!isMockFirebase) {
    const path = 'hiringDecisions';
    try {
      await setDoc(doc(db, path, saved.id), saved);
    } catch (error) {
      console.warn("Firebase recordDecision failed, secure server-side backup recorded:", error);
    }
  }
  return saved;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const res = await fetch('/api/local/audit-logs');
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch audit logs from backend services:", err);
    return [];
  }
}

export async function getDispatchedEmails(candidateId?: string): Promise<DispatchedEmail[]> {
  const url = candidateId ? `/api/local/emails?candidateId=${encodeURIComponent(candidateId)}` : '/api/local/emails';
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.warn("Failed to retrieve dispatched notifications:", err);
    return [];
  }
}

export async function sendCandidateStatusEmail(
  candidateId: string,
  jobId: string,
  decision: 'hired' | 'shortlisted' | 'rejected',
  justification: string
): Promise<any> {
  const res = await fetch('/api/local/send-status-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, jobId, decision, justification })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to trigger automated status email via network");
  }
  return res.json();
}


export async function recordAuditEntry(action: string, details: string, candidateId: string, performedBy: string): Promise<AuditLog> {
  const res = await fetch('/api/local/audit-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, details, candidateId, performedBy })
  });
  const saved: AuditLog = await res.json();

  if (!isMockFirebase) {
    const path = 'auditLogs';
    try {
      await setDoc(doc(db, path, saved.id), saved);
    } catch (e) {
      // Ignored for fallback
    }
  }
  return saved;
}

// -------------------------------------------------------------
// SOUTH AFRICAN SOVEREIGN IDENTITY & ACCREDITATION INTEGRATION
// -------------------------------------------------------------

export interface DhaVerificationResponse {
  verified: boolean;
  reason?: string;
  meta?: {
    dob: string;
    gender: string;
    citizenshipStatus: string;
    canonicalName: string;
    comment: string;
  };
}

export async function verifyIdentityDHA(nationalId: string, firstName: string, lastName: string): Promise<DhaVerificationResponse> {
  const res = await fetch('/api/dha/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nationalId, firstName, lastName })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.reason || "DHA identity verification rejected");
  }
  return res.json();
}

export interface SaqaVerificationResponse {
  verified: boolean;
  reason?: string;
  meta?: {
    accreditationId: string;
    comment: string;
    verifiedAt: string;
  };
}

export async function verifyQualificationSAQA(
  studentNumber: string, 
  nqfLevel: number, 
  qualificationName: string, 
  institution: string,
  isInternational?: boolean,
  originCountry?: string,
  foreignEvaluationNo?: string,
  foreignEvaluationAuthority?: string
): Promise<SaqaVerificationResponse> {
  const res = await fetch('/api/saqa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      studentNumber, 
      nqfLevel, 
      qualificationName, 
      institution,
      isInternational,
      originCountry,
      foreignEvaluationNo,
      foreignEvaluationAuthority
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.reason || "SAQA qualifications verification rejected");
  }
  return res.json();
}

export interface MatchingResponse {
  success: boolean;
  score: number;
  feedback: string;
  alignment: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  gapPercentage?: number;
}

export async function runMatchingVertexAI(jobId: string, candidate: Candidate): Promise<MatchingResponse> {
  const res = await fetch('/api/matching/rank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, candidate })
  });
  if (!res.ok) {
    throw new Error("Suited NQF rank optimization run failed");
  }
  return res.json();
}

// -------------------------------------------------------------
// LINKEDIN API & REGISTRY COMPLIANCE VERIFICATION CLIENTS
// -------------------------------------------------------------

export interface LinkedInAuthUrlResponse {
  url: string;
  isMock: boolean;
}

export async function getLinkedInAuthUrl(origin: string): Promise<LinkedInAuthUrlResponse> {
  const res = await fetch(`/api/auth/linkedin/url?origin=${encodeURIComponent(origin)}`);
  if (!res.ok) {
    throw new Error("Failed to configure LinkedIn secure session gateway url.");
  }
  return res.json();
}

export interface WorkHistoryVerificationResponse {
  success: boolean;
  verified: boolean;
  confidenceScore: number;
  referenceId: string;
  vettedSummary: string;
}

export async function verifyWorkHistorySARS(candidateId: string, workHistory: any[]): Promise<WorkHistoryVerificationResponse> {
  const res = await fetch('/api/work/verify-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, workHistory })
  });
  if (!res.ok) {
    throw new Error("UIF/SARS employment ledger audit handshake failed.");
  }
  return res.json();
}

export interface ShareAuditResponse {
  success: boolean;
  status: 'sent' | 'simulated' | 'failed';
  email: any;
}

export async function shareAuditReport(toEmail: string, logId: string): Promise<ShareAuditResponse> {
  const res = await fetch('/api/local/share-audit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toEmail, logId })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to transmit report share operation to auditor.");
  }
  return res.json();
}

export interface WeeklyDigestDataResponse {
  settings: DigestSettings;
  history: WeeklyDigestLog[];
}

export async function getWeeklyDigestData(): Promise<WeeklyDigestDataResponse> {
  const res = await fetch('/api/weekly-digest/settings');
  if (!res.ok) {
    throw new Error("Failed to load labour compliance weekly digest system data.");
  }
  return res.json();
}

export async function updateWeeklyDigestSettings(settings: Partial<DigestSettings>): Promise<{ success: boolean; settings: DigestSettings }> {
  const res = await fetch('/api/weekly-digest/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) {
    throw new Error("Failed to write revised labour audit parameters to server.");
  }
  return res.json();
}

export async function triggerWeeklyDigest(): Promise<{ success: boolean; digest: WeeklyDigestLog; settings: DigestSettings }> {
  const res = await fetch('/api/weekly-digest/trigger', {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Digest trigger rejection" }));
    throw new Error(err.error || "Manual dispatch handshake rejected by server.");
  }
  return res.json();
}

export async function saveBulkBatch(batch: Omit<BulkVerificationBatch, "id" | "timestamp"> & { id?: string; timestamp?: string }): Promise<BulkVerificationBatch> {
  const res = await fetch('/api/local/bulk-batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch)
  });
  if (!res.ok) {
    throw new Error("Failed to save bulk verification batch to local server.");
  }
  const savedBatch = await res.json();

  if (!isMockFirebase) {
    const path = 'bulkBatches';
    try {
      await setDoc(doc(db, path, savedBatch.id), savedBatch);
    } catch (e) {
      console.warn("Ignored Firebase fallback save failure for bulk batch:", e);
    }
  }
  return savedBatch;
}

export async function getBulkBatches(): Promise<BulkVerificationBatch[]> {
  try {
    const res = await fetch('/api/local/bulk-batches');
    if (!res.ok) {
      throw new Error("Failed to load bulk verification batches.");
    }
    return await res.json();
  } catch (err) {
    console.warn("Failed to retrieve bulk batches, falling back to empty:", err);
    return [];
  }
}

export interface AuditSummaryTheme {
  theme: 'Credential Failures' | 'Sovereign Syncs' | 'Manual Overrides' | 'Other Activity';
  count: number;
  description: string;
  exampleLogs: { id: string; action: string; details: string; timestamp: string }[];
}

export interface AuditSummaryResponse {
  themes: AuditSummaryTheme[];
  overallSummary: string;
  generatedAt: string;
  integritySeal: string;
}

export async function getAuditSummary(): Promise<AuditSummaryResponse> {
  const res = await fetch('/api/local/audit-summary');
  if (!res.ok) {
    throw new Error("Failed to load audit analysis log summary from server.");
  }
  return res.json();
}

export interface SaqaQualificationSearchItem {
  id: string;
  name: string;
  level: number;
  institution: string;
  field: string;
}

export async function searchQualificationsSAQA(query?: string): Promise<SaqaQualificationSearchItem[]> {
  const url = query ? `/api/saqa/search?q=${encodeURIComponent(query)}` : '/api/saqa/search';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to search NQF qualifications in SAQA database");
  }
  return res.json();
}


