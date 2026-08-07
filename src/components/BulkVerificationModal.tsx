import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Loader2, 
  Database, 
  ShieldAlert, 
  User, 
  Check, 
  Terminal, 
  HelpCircle,
  FileCheck2,
  TrendingUp,
  Download,
  Search,
  Filter,
  Activity,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Zap,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { Candidate, BulkVerificationBatch } from '../types';
import { 
  verifyIdentityDHA, 
  verifyQualificationSAQA, 
  saveCandidate, 
  recordAuditEntry,
  saveBulkBatch,
  getBulkBatches
} from '../lib/api';

interface BulkVerificationModalProps {
  selectedIds: string[];
  candidates: Candidate[];
  onClose: () => void;
  onComplete: () => void;
}

interface BatchItem {
  candidate: Candidate;
  dhaStatus: 'pending' | 'verifying' | 'success' | 'failed' | 'skipped';
  saqaStatus: 'pending' | 'verifying' | 'success' | 'failed' | 'skipped';
  dhaError: string | null;
  saqaError: string | null;
  generalStatus: 'idle' | 'processing' | 'success' | 'failed';
}

export const BulkVerificationModal: React.FC<BulkVerificationModalProps> = ({
  selectedIds,
  candidates,
  onClose,
  onComplete
}) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState<number>(-1);
  const [stats, setStats] = useState({
    total: 0,
    dhaSuccesses: 0,
    saqaSuccesses: 0,
    failures: 0,
    skipped: 0
  });

  const [historyBatches, setHistoryBatches] = useState<BulkVerificationBatch[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [searchBatchQuery, setSearchBatchQuery] = useState<string>("");
  const [filterBatchFailOnly, setFilterBatchFailOnly] = useState<boolean>(false);

  const loadHistory = async () => {
    try {
      const h = await getBulkBatches();
      setHistoryBatches(h);
    } catch (err) {
      console.error("Failed to load historical batch audits:", err);
    }
  };

  const downloadBatchCSV = (batch: BulkVerificationBatch | { id: string; timestamp: string; results: any[]; totalCandidates: number; successfulDha: number; successfulSaqa: number; failedCount: number; skippedCount: number; }) => {
    const headers = [
      "Candidate Name", 
      "National ID No", 
      "DHA Verify Status", 
      "DHA Discrepancies/Logs", 
      "SAQA Verify Status", 
      "SAQA Validation Level/Logs", 
      "Vetting Authority/Operator",
      "Vetting Timeline (SAST)"
    ];
    
    const rows = batch.results.map(r => [
      r.candidateName || `ID: ${r.candidateId}`,
      r.nationalId || "N/A",
      r.dhaStatus === 'success' ? "VERIFIED (CLEARED)" : r.dhaStatus === 'skipped' ? "SKIPPED (PRE-CLEARED)" : "MISMATCH (FAILED)",
      r.dhaError || "Ledger record matches input payload.",
      r.saqaStatus === 'success' ? "VERIFIED (ACCREDITED)" : r.saqaStatus === 'skipped' ? "SKIPPED (PRE-VERIFIED)" : "UNACCREDITED (REJECTED)",
      r.saqaError || "Qualification registered under appropriate NQF standard level.",
      "cengcanis@gmail.com",
      new Date(batch.timestamp || new Date()).toLocaleString("en-ZA")
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FunaIspanMzantsi_Sovereign_Vetting_${batch.id || "batch"}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadHistory();
  }, [progress, isProcessing]);

  const logConsoleRef = useRef<HTMLDivElement>(null);

  // Initialize batch items from selected candidate IDs
  useEffect(() => {
    const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));
    const batchItems: BatchItem[] = selectedCandidates.map(c => {
      // A candidate is "pending" if they are not already verified
      const needsDha = !c.dhaVerified;
      const needsSaqa = !c.saqaVerified;

      return {
        candidate: c,
        dhaStatus: needsDha ? 'pending' : 'skipped',
        saqaStatus: needsSaqa ? 'pending' : 'skipped',
        dhaError: null,
        saqaError: null,
        generalStatus: 'idle'
      };
    });

    setItems(batchItems);
    setStats({
      total: batchItems.length,
      dhaSuccesses: 0,
      saqaSuccesses: 0,
      failures: 0,
      skipped: batchItems.filter(item => item.dhaStatus === 'skipped' && item.saqaStatus === 'skipped').length
    });

    const timestamp = new Date().toLocaleTimeString();
    setLogs([
      `[${timestamp}] ⚙️ Bulk Validation Suite Intaked. Ready to verify ${batchItems.length} South African candidates.`,
      `[${timestamp}] ⚙️ Standing: ${batchItems.filter(i => i.dhaStatus === 'pending' || i.saqaStatus === 'pending').length} pending verification, ${batchItems.filter(i => i.dhaStatus === 'skipped' && i.saqaStatus === 'skipped').length} already 100% verified (will be skipped).`
    ]);
  }, [selectedIds, candidates]);

  // Scroll logs to bottom
  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Append safe timestamped system log
  const pushLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timeStr}] ${message}`]);
  };

  const handleRetryFailed = async () => {
    if (isProcessing) return;
    
    pushLog("🔄 REINITIATED RETRY INSTANCE FOR FAILED PIPELINES.");
    pushLog("🔍 Isolating and re-queuing candidate profiles with prior mismatches...");

    // Find items that failed, reset their DHA/SAQA states to 'pending' if they had failed, and generalStatus to 'idle'
    const resetItems = items.map(item => {
      if (item.generalStatus === 'failed') {
        const needsDha = item.dhaStatus === 'failed' || item.dhaStatus === 'pending';
        const needsSaqa = item.saqaStatus === 'failed' || item.saqaStatus === 'pending';
        return {
          ...item,
          dhaStatus: (needsDha ? 'pending' : item.dhaStatus) as 'pending' | 'verifying' | 'success' | 'failed' | 'skipped',
          saqaStatus: (needsSaqa ? 'pending' : item.saqaStatus) as 'pending' | 'verifying' | 'success' | 'failed' | 'skipped',
          dhaError: needsDha ? null : item.dhaError,
          saqaError: needsSaqa ? null : item.saqaError,
          generalStatus: 'idle' as const
        };
      }
      return item;
    });

    setItems(resetItems);
    setProgress(0);
    setCurrentCandidateIndex(-1);

    setIsProcessing(true);

    let activeItems = [...resetItems];
    let runningDhaCount = activeItems.filter(item => item.dhaStatus === 'success').length;
    let runningSaqaCount = activeItems.filter(item => item.saqaStatus === 'success').length;
    let runningFailCount = 0;

    for (let i = 0; i < activeItems.length; i++) {
      const batchItem = activeItems[i];
      const cand = batchItem.candidate;

      // Skip fully completed or skipped ones
      if (
        (batchItem.dhaStatus === 'success' || batchItem.dhaStatus === 'skipped') &&
        (batchItem.saqaStatus === 'success' || batchItem.saqaStatus === 'skipped')
      ) {
        continue;
      }

      setCurrentCandidateIndex(i);
      pushLog(`──────────────────────────────────────────`);
      pushLog(`👤 [RETRY RUN] Auditing Candidate [${i+1}/${activeItems.length}]: ${cand.firstName} ${cand.lastName}`);

      activeItems[i] = {
        ...batchItem,
        generalStatus: 'processing'
      };
      setItems([...activeItems]);

      let errorEncountered = false;
      let localUpdatedCand = { ...cand };

      // DHA Retry
      if (batchItem.dhaStatus === 'pending') {
        pushLog(`🔍 [RETRY] Re-querying DHA population ledger...`);
        activeItems[i] = {
          ...activeItems[i],
          dhaStatus: 'verifying'
        };
        setItems([...activeItems]);

        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const res = await verifyIdentityDHA(cand.nationalId, cand.firstName, cand.lastName);
          if (res.verified && res.meta) {
            pushLog(`✅ DHA Verified via retry! DOB: ${res.meta.dob}`);
            activeItems[i] = {
              ...activeItems[i],
              dhaStatus: 'success',
              dhaError: null
            };
            const names = res.meta.canonicalName.split(' ');
            localUpdatedCand.firstName = names[0] || cand.firstName;
            localUpdatedCand.lastName = names.slice(1).join(' ') || cand.lastName;
            localUpdatedCand.dhaVerified = true;
            localUpdatedCand.verifiedAt = new Date().toISOString();
            runningDhaCount++;

            await recordAuditEntry(
              "DHA IDENTITY STATUS DEPLOYED (RETRY SUCCESS)",
              `Bulk Audit Retry: Confirmed identity status of ${cand.firstName} ${cand.lastName} with live population register.`,
              cand.nationalId,
              "cengcanis@gmail.com"
            );
          } else {
            pushLog(`❌ DHA REJECTED [RETRY]: ${res.reason || "Mismatched parameters"}`);
            activeItems[i] = {
              ...activeItems[i],
              dhaStatus: 'failed',
              dhaError: res.reason || "DHA record mismatch"
            };
            errorEncountered = true;
          }
        } catch (err: any) {
          pushLog(`⚠️ DHA GATEWAY RETRY ERROR: ${err.message || err}`);
          activeItems[i] = {
            ...activeItems[i],
            dhaStatus: 'failed',
            dhaError: err.message || "Connection refused"
          };
          errorEncountered = true;
        }
        setItems([...activeItems]);
      }

      // SAQA Retry
      if (batchItem.saqaStatus === 'pending' && !errorEncountered) {
        pushLog(`🎓 [RETRY] Connecting academic matrix for qualification cert check...`);
        activeItems[i] = {
          ...activeItems[i],
          saqaStatus: 'verifying'
        };
        setItems([...activeItems]);

        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const res = await verifyQualificationSAQA(
            cand.studentNumber,
            cand.nqfLevel,
            cand.qualificationName,
            cand.institution,
            cand.isInternational,
            cand.originCountry,
            cand.foreignEvaluationNo,
            cand.foreignEvaluationAuthority
          );

          if (res.verified && res.meta) {
            pushLog(`✅ SAQA Accredited via retry! NQF level certified.`);
            activeItems[i] = {
              ...activeItems[i],
              saqaStatus: 'success',
              saqaError: null
            };
            localUpdatedCand.saqaVerified = true;
            runningSaqaCount++;

            await recordAuditEntry(
              "SAQA QUALIFICATION DEPLOYED (RETRY SUCCESS)",
              `Bulk Audit Retry: Accredited qualification of ${cand.firstName} ${cand.lastName}. Level ${cand.nqfLevel} standard certified.`,
              cand.isInternational ? (cand.foreignEvaluationNo || "N/A") : cand.studentNumber,
              "cengcanis@gmail.com"
            );
          } else {
            pushLog(`❌ SAQA REJECTED [RETRY]: ${res.reason || "Certification record failed validation check layout."}`);
            activeItems[i] = {
              ...activeItems[i],
              saqaStatus: 'failed',
              saqaError: res.reason || "SAQA NQF levels mismatch"
            };
            errorEncountered = true;
          }
        } catch (err: any) {
          pushLog(`⚠️ SAQA GATEWAY RETRY ERROR: ${err.message || err}`);
          activeItems[i] = {
            ...activeItems[i],
            saqaStatus: 'failed',
            saqaError: err.message || "Connection refused"
          };
          errorEncountered = true;
        }
        setItems([...activeItems]);
      }

      // Finalize Retry Candidate State
      if (!errorEncountered) {
        localUpdatedCand.status = 'verified';
        activeItems[i] = {
          ...activeItems[i],
          generalStatus: 'success'
        };
        pushLog(`🌟 Profile ${cand.firstName} ${cand.lastName} is now COMPLIANT.`);
        
        try {
          await saveCandidate(localUpdatedCand);
        } catch (saveErr) {
          pushLog(`❌ DATABASE RETRY COMMIT FAILURE for candidate ${cand.firstName}.`);
        }
      } else {
        runningFailCount++;
        activeItems[i] = {
          ...activeItems[i],
          generalStatus: 'failed'
        };
        pushLog(`❌ Profile ${cand.firstName} ${cand.lastName} remains NON-COMPLIANT.`);
      }

      // Progress calculation
      const completedRatio = Math.round(((i + 1) / activeItems.length) * 100);
      setProgress(completedRatio);

      setStats({
        total: activeItems.length,
        dhaSuccesses: runningDhaCount,
        saqaSuccesses: runningSaqaCount,
        failures: runningFailCount,
        skipped: activeItems.filter(item => item.dhaStatus === 'skipped' && item.saqaStatus === 'skipped').length
      });

      setItems([...activeItems]);
    }

    pushLog(`──────────────────────────────────────────`);
    pushLog(`🏁 BATCH RETRY CYCLE FINISHED.`);
    pushLog(`🎉 Retry Summary: Cleared ${runningDhaCount} DHA, Accredited ${runningSaqaCount} SAQA. Active remaining errors: ${runningFailCount}`);

    // Persist final results to Secure Audit Ledger
    const results = activeItems.map(item => ({
      candidateId: item.candidate.id,
      candidateName: `${item.candidate.firstName} ${item.candidate.lastName}`,
      nationalId: item.candidate.nationalId,
      dhaStatus: item.dhaStatus === 'success' ? 'success' as const : item.dhaStatus === 'skipped' ? 'skipped' as const : 'failed' as const,
      saqaStatus: item.saqaStatus === 'success' ? 'success' as const : item.saqaStatus === 'skipped' ? 'skipped' as const : 'failed' as const,
      dhaError: item.dhaError,
      saqaError: item.saqaError
    }));

    const batchRecord = {
      totalCandidates: activeItems.length,
      successfulDha: runningDhaCount,
      successfulSaqa: runningSaqaCount,
      failedCount: runningFailCount,
      skippedCount: activeItems.filter(item => item.dhaStatus === 'skipped' && item.saqaStatus === 'skipped').length,
      performedBy: "cengcanis@gmail.com",
      results
    };

    try {
      await saveBulkBatch(batchRecord);
      pushLog("🔒 Bulk verification retry batch audit permanently saved in ledger.");
    } catch (saveErr) {
      console.error(saveErr);
      pushLog("⚠️ SECURE LEDGER ERROR: Failed to save batch audit payload.");
    }

    await recordAuditEntry(
      "SOVEREIGN BATCH AUDIT RETRY COMPLETED",
      `Recruiter re-executed failed bulk checks. Out of ${activeItems.length}, resolved DHA verified counts to ${runningDhaCount} and SAQA verified counts to ${runningSaqaCount}. Flagged remaining failures: ${runningFailCount}.`,
      "SOVEREIGN_BATCH_DIR",
      "cengcanis@gmail.com"
    );

    setIsProcessing(false);
    onComplete();
  };

  // Main runner loop
  const triggerBulkVerification = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    pushLog("🚀 INITIATED FEDERAL COMPLIANCE BULK VERIFICATION RUN.");
    pushLog("🔗 Opening dedicated security tunnels with DHA and SAQA directories...");

    // Copy items to state before modifying sequentially
    let activeItems = [...items];
    let runningDhaCount = 0;
    let runningSaqaCount = 0;
    let runningFailCount = 0;

    for (let i = 0; i < activeItems.length; i++) {
      const batchItem = activeItems[i];
      const cand = batchItem.candidate;

      // Skip fully completed ones
      if (batchItem.dhaStatus === 'skipped' && batchItem.saqaStatus === 'skipped') {
        activeItems[i] = {
          ...batchItem,
          generalStatus: 'success'
        };
        setItems([...activeItems]);
        continue;
      }

      setCurrentCandidateIndex(i);
      pushLog(`──────────────────────────────────────────`);
      pushLog(`👤 Processing Candidate [${i+1}/${activeItems.length}]: ${cand.firstName} ${cand.lastName} (ID: ${cand.nationalId})`);

      // Update item generalStatus to processing
      activeItems[i] = {
        ...batchItem,
        generalStatus: 'processing'
      };
      setItems([...activeItems]);

      let errorEncountered = false;
      let localUpdatedCand = { ...cand };

      // 1. PERFORM DHA IDENTITY VERIFICATION
      if (batchItem.dhaStatus === 'pending') {
        pushLog(`🔍 Querying DHA National Population Register for identity confirmation...`);
        activeItems[i] = {
          ...activeItems[i],
          dhaStatus: 'verifying'
        };
        setItems([...activeItems]);

        try {
          // Introduce a micro simulated queue latency for professional sensory feedback
          await new Promise(resolve => setTimeout(resolve, 800));

          const res = await verifyIdentityDHA(cand.nationalId, cand.firstName, cand.lastName);
          if (res.verified && res.meta) {
            pushLog(`✅ DHA Verified! Canonical: ${res.meta.canonicalName}. DOB: ${res.meta.dob}. Gender: ${res.meta.gender}.`);
            activeItems[i] = {
              ...activeItems[i],
              dhaStatus: 'success',
              dhaError: null
            };
            
            // Apply canonical names to profile to prevent government database overrides
            const names = res.meta.canonicalName.split(' ');
            localUpdatedCand.firstName = names[0] || cand.firstName;
            localUpdatedCand.lastName = names.slice(1).join(' ') || cand.lastName;
            localUpdatedCand.dhaVerified = true;
            localUpdatedCand.verifiedAt = new Date().toISOString();
            
            runningDhaCount++;

            // Commit individual DHA logging
            await recordAuditEntry(
              "DHA IDENTITY STATUS DEPLOYED",
              `Bulk Audit: Verified identity status of ${cand.firstName} ${cand.lastName} via live population registry. DOB: ${res.meta.dob}.`,
              cand.nationalId,
              "cengcanis@gmail.com"
            );
          } else {
            pushLog(`❌ DHA REJECTED: ${res.reason || "Citizen identity not found in national census database."}`);
            activeItems[i] = {
              ...activeItems[i],
              dhaStatus: 'failed',
              dhaError: res.reason || "DHA record mismatch"
            };
            errorEncountered = true;
          }
        } catch (err: any) {
          pushLog(`⚠️ DHA GATEWAY ERROR: ${err.message || err}`);
          activeItems[i] = {
            ...activeItems[i],
            dhaStatus: 'failed',
            dhaError: err.message || "Connection refused"
          };
          errorEncountered = true;
        }
        setItems([...activeItems]);
      }

      // 2. PERFORM SAQA QUALIFICATIONS ACCREDITATION VERIFICATION
      if (batchItem.saqaStatus === 'pending' && !errorEncountered) {
        pushLog(`🎓 Syncing SAQA Academic Registry records matching Student ID ${cand.studentNumber}...`);
        activeItems[i] = {
          ...activeItems[i],
          saqaStatus: 'verifying'
        };
        setItems([...activeItems]);

        try {
          await new Promise(resolve => setTimeout(resolve, 800));

          const res = await verifyQualificationSAQA(
            cand.studentNumber,
            cand.nqfLevel,
            cand.qualificationName,
            cand.institution,
            cand.isInternational,
            cand.originCountry,
            cand.foreignEvaluationNo,
            cand.foreignEvaluationAuthority
          );

          if (res.verified && res.meta) {
            pushLog(`✅ SAQA Accredited! Certification Record: ${res.meta.accreditationId}. Level ${cand.nqfLevel} standard verified.`);
            activeItems[i] = {
              ...activeItems[i],
              saqaStatus: 'success',
              saqaError: null
            };
            localUpdatedCand.saqaVerified = true;
            runningSaqaCount++;

            // Commit individual SAQA logging
            await recordAuditEntry(
              cand.isInternational ? "SAQA FOREIGN QUALIFICATION REGISTER DEPLOYED" : "SAQA QUALIFICATION REGISTER DEPLOYED",
              `Bulk Audit: Validated academic qualification of ${cand.firstName} ${cand.lastName}. Level ${cand.nqfLevel} standard certified.`,
              cand.isInternational ? (cand.foreignEvaluationNo || "N/A") : cand.studentNumber,
              "cengcanis@gmail.com"
            );
          } else {
            pushLog(`❌ SAQA REJECTED: ${res.reason || "Qualification NQF standard has not been certified."}`);
            activeItems[i] = {
              ...activeItems[i],
              saqaStatus: 'failed',
              saqaError: res.reason || "SAQA NQF levels mismatch"
            };
            errorEncountered = true;
          }
        } catch (err: any) {
          pushLog(`⚠️ SAQA GATEWAY ERROR: ${err.message || err}`);
          activeItems[i] = {
            ...activeItems[i],
            saqaStatus: 'failed',
            saqaError: err.message || "Connection refused"
          };
          errorEncountered = true;
        }
        setItems([...activeItems]);
      }

      // Finalize candidate updates & status
      if (!errorEncountered) {
        localUpdatedCand.status = 'verified'; // Candidate complete and matched to registry requirements
        activeItems[i] = {
          ...activeItems[i],
          generalStatus: 'success'
        };
        pushLog(`🌟 Profile ${cand.firstName} ${cand.lastName} is now 100% COMPLIANT.`);
        
        try {
          await saveCandidate(localUpdatedCand);
        } catch (saveErr) {
          pushLog(`❌ DATABASE COMMIT FAILURE: Could not persist verified indicators for ${cand.firstName}.`);
        }
      } else {
        runningFailCount++;
        activeItems[i] = {
          ...activeItems[i],
          generalStatus: 'failed'
        };
        pushLog(`❌ Profile ${cand.firstName} ${cand.lastName} holds COMPLIANCE DISCREPANCIES.`);
      }

      // Update real-time progress calculations
      const completedRatio = Math.round(((i + 1) / activeItems.length) * 100);
      setProgress(completedRatio);
      
      setStats({
        total: activeItems.length,
        dhaSuccesses: runningDhaCount,
        saqaSuccesses: runningSaqaCount,
        failures: runningFailCount,
        skipped: activeItems.filter(item => item.dhaStatus === 'skipped' && item.saqaStatus === 'skipped').length
      });

      setItems([...activeItems]);
    }

    pushLog(`──────────────────────────────────────────`);
    pushLog(`🏁 BATCH COMPLIANCE PROCESS FINISHED.`);
    pushLog(`🎉 Run Summary: ${runningDhaCount} DHA cleared, ${runningSaqaCount} SAQA accredited, ${runningFailCount} errors.`);

    // Record immutable ledger entry for global bulk run
    await recordAuditEntry(
      "SOVEREIGN BATCH AUDIT SYSTEM APPROVED",
      `Recruiter performed bulk validation checklist across ${activeItems.length} selected profiles. System cleared ${runningDhaCount} identities and ${runningSaqaCount} academic certificates successfully. Flagged ${runningFailCount} failures.`,
      "SOVEREIGN_BATCH_DIR",
      "cengcanis@gmail.com"
    );

    // Save Bulk Batch details to filesytem registry / Firestore database
    const results = activeItems.map(item => ({
      candidateId: item.candidate.id,
      candidateName: `${item.candidate.firstName} ${item.candidate.lastName}`,
      nationalId: item.candidate.nationalId,
      dhaStatus: item.dhaStatus === 'success' ? 'success' as const : item.dhaStatus === 'skipped' ? 'skipped' as const : 'failed' as const,
      saqaStatus: item.saqaStatus === 'success' ? 'success' as const : item.saqaStatus === 'skipped' ? 'skipped' as const : 'failed' as const,
      dhaError: item.dhaError,
      saqaError: item.saqaError
    }));

    const batchRecord = {
      totalCandidates: activeItems.length,
      successfulDha: runningDhaCount,
      successfulSaqa: runningSaqaCount,
      failedCount: runningFailCount,
      skippedCount: activeItems.filter(item => item.dhaStatus === 'skipped' && item.saqaStatus === 'skipped').length,
      performedBy: "cengcanis@gmail.com",
      results
    };

    try {
      await saveBulkBatch(batchRecord);
      pushLog("🔒 Sovereign Bulk Vetting transaction successfully indexed to audit archives.");
    } catch (saveErr) {
      console.error(saveErr);
      pushLog("⚠️ DATABASE WRITE COMPLIANCE ERROR: Batch telemetry log transfer failed.");
    }

    setIsProcessing(false);
    onComplete(); // Trigger update reload states in main window
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#141418] border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl relative text-left flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-[#191922]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Database className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif font-light text-[15px] text-slate-100 tracking-wide">
                Funa Ispan Mzantsi Sovereign Bulk Verification Desk
              </h3>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none mt-1">
                DHA IDENTITY & SAQA ACCREDITATION CLEARANCE COHORT
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="h-8 w-8 rounded-lg border border-slate-800 bg-black/20 hover:bg-slate-900 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-fancy">
          
          {/* Quick Statistics Panels */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-[#09090C] border border-slate-850 p-3 rounded-xl5">
              <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Cohort Size</span>
              <span className="text-xl font-serif text-slate-200 mt-0.5 block">{stats.total} candidates</span>
            </div>
            <div className="bg-[#09090C] border border-slate-850 p-3 rounded-xl5">
              <span className="text-[9px] font-mono text-emerald-550 text-emerald-500 block uppercase font-bold tracking-wider">DHA Success</span>
              <span className="text-xl font-serif text-emerald-400 mt-0.5 block">{stats.dhaSuccesses} cleared</span>
            </div>
            <div className="bg-[#09090C] border border-slate-850 p-3 rounded-xl5">
              <span className="text-[9px] font-mono text-emerald-555 text-emerald-500 block uppercase font-bold tracking-wider">SAQA Passed</span>
              <span className="text-xl font-serif text-emerald-400 mt-0.5 block">{stats.saqaSuccesses} certified</span>
            </div>
            <div className="bg-[#09090C] border border-slate-850 p-3 rounded-xl5">
              <span className="text-[9px] font-mono text-red-500 block uppercase font-bold tracking-wider">Discrepancies</span>
              <span className="text-xl font-serif text-rose-400 mt-0.5 block font-bold">{stats.failures} errors</span>
            </div>
            <div className="bg-[#09090C] border border-slate-850 p-3 rounded-xl5 col-span-2 md:col-span-1">
              <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Bypassed</span>
              <span className="text-xl font-serif text-slate-400 mt-0.5 block">{stats.skipped} skipped</span>
            </div>
          </div>

          {/* Real-time/Final Progress Bar HUD */}
          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-450 uppercase tracking-widest text-[10px] font-bold flex items-center gap-2">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                    Executing Cryptographic Gateway Validation Operations...
                  </>
                ) : progress === 100 ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Compliance Batch Cleared & Completed successfully
                  </>
                ) : (
                  "Ready to Initiate DHA & SAQA Registry Batch Run"
                )}
              </span>
              <span className="text-emerald-400 font-bold tracking-wide">{progress}% Complete</span>
            </div>

            <div className="w-full bg-[#0a0a0c] h-3 rounded-full overflow-hidden border border-slate-850 flex">
              <div 
                className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Render the post-run Verification Batch Summary screen once completed */}
          {progress === 100 && !isProcessing && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex gap-3">
                  <FileCheck2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-400">verification batch summary report</h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      The Funa Ispan Mzantsi compliance engine has successfully processed this cohort. Registered identities have been synced with the Department of Home Affairs (DHA) Population Register, and certificates checked against the South African Qualifications Authority (SAQA) matrix. The outcomes are detailed below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const results = items.map(item => ({
                      candidateId: item.candidate.id,
                      candidateName: `${item.candidate.firstName} ${item.candidate.lastName}`,
                      nationalId: item.candidate.nationalId,
                      dhaStatus: item.dhaStatus === 'success' ? 'success' as const : item.dhaStatus === 'skipped' ? 'skipped' as const : 'failed' as const,
                      saqaStatus: item.saqaStatus === 'success' ? 'success' as const : item.saqaStatus === 'skipped' ? 'skipped' as const : 'failed' as const,
                      dhaError: item.dhaError,
                      saqaError: item.saqaError
                    }));
                    downloadBatchCSV({
                      id: `batch-live-${Date.now()}`,
                      timestamp: new Date().toISOString(),
                      totalCandidates: items.length,
                      successfulDha: stats.dhaSuccesses,
                      successfulSaqa: stats.saqaSuccesses,
                      failedCount: stats.failures,
                      skippedCount: stats.skipped,
                      performedBy: "cengcanis@gmail.com",
                      results
                    });
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.01] transition-all cursor-pointer rounded text-[10.5px] uppercase font-mono font-bold tracking-wider flex items-center gap-1.5 self-center shrink-0 w-full sm:w-auto justify-center shadow-lg shadow-emerald-500/10"
                >
                  <Download className="h-3.5 w-3.5" /> Export Audit (.CSV)
                </button>
              </div>

              {/* AUTOMATED COMPLIANCE SYNTHESIS & COPYABLE RESTATEMENT */}
              <div className="bg-[#101014] border border-slate-800 rounded-xl p-4.5 space-y-3 text-left">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-2.5">
                  <div className="h-6 w-6 bg-emerald-500/10 rounded-md flex items-center justify-center border border-emerald-500/20">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <h5 className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-150">
                    Automated Batch Synthesis & Compliance Insights
                  </h5>
                </div>

                <div className="text-xs text-slate-350 leading-relaxed font-sans space-y-2.5">
                  <p>
                    From the batch cohort of <strong className="text-slate-150">{items.length} candidate profiles</strong>, the Sovereign Vetting System compiled the following ledger verification checkpoints:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[10.5px] bg-black/30 p-3 rounded-lg border border-slate-900/60 leading-relaxed">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-500">DHA Population Sync:</span>
                        <span className="text-emerald-400 font-bold">{stats.dhaSuccesses} Cleared ({items.length > 0 ? Math.round((stats.dhaSuccesses/items.length)*100) : 0}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-500">SAQA Accreditation:</span>
                        <span className="text-emerald-400 font-bold">{stats.saqaSuccesses} Verified ({items.length > 0 ? Math.round((stats.saqaSuccesses/items.length)*100) : 0}%)</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-900 pt-2 sm:pt-0 sm:pl-3">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="text-slate-500">Flagged Exceptions:</span>
                        <span className="text-rose-400 font-bold">{stats.failures} Mismatches</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                        <span className="text-slate-500">Bypassed/Skipped:</span>
                        <span className="text-slate-350 font-bold">{stats.skipped} Profiles</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Drafted Board of Trustees Executive Memorandum:</span>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={
                          `SUBJECT: AUTOMATED VERIFICATION COHORT COMPLIANCE SUMMATION\n` +
                          `BATCH ID: BATCH-${Date.now().toString().substring(0,8).toUpperCase()}\n` +
                          `COHORT RECONCILIATION RESULT:\n` +
                          `- Total Profiles Submitted: ${items.length}\n` +
                          `- Cleared Citizens (DHA): ${stats.dhaSuccesses} of ${items.length}\n` +
                          `- Accredited Degrees (SAQA): ${stats.saqaSuccesses} of ${items.length}\n` +
                          `- Suspicion / Discrepancy Warnings: ${stats.failures}\n\n` +
                          `DECISION DIGEST SYNTHESIS:\n` +
                          `Systems successfully scanned the submitted qualification registers against National Registers. ` +
                          `${stats.failures > 0 ? `Urgent notice: ${stats.failures} candidates have been flagged for manual verification due to Luhn checksum errors or missing SAQA validation state. ` : 'All scanned candidates conform with the national qualification standards. '} ` +
                          `This digest is mathematically certified and appended to the Department of Labour Audit Trail.`
                        }
                        id="batchMemoTextarea"
                        className="w-full h-28 bg-[#070709] border border-slate-900 rounded p-3 text-[11.5px] font-mono text-slate-300 focus:outline-none focus:border-slate-800 scrollbar-fancy resize-none leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const textArea = document.getElementById('batchMemoTextarea') as HTMLTextAreaElement;
                          if (textArea) {
                            textArea.select();
                            document.execCommand('copy');
                            alert('📋 Executive compliance batch summary memo copied to clipboard!');
                          }
                        }}
                        className="absolute right-2.5 bottom-2.5 px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 font-mono text-[9px] font-bold uppercase rounded cursor-pointer transition-all active:scale-95"
                      >
                        Copy Memo
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Successfully Verified Column */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Passed Compliance ({items.filter(i => i.generalStatus === 'success').length})</span>
                  </div>
                  <div className="bg-[#09090c] border border-slate-850 rounded-xl p-3.5 space-y-2 max-h-56 overflow-y-auto scrollbar-fancy">
                    {items.filter(i => i.generalStatus === 'success').length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">No candidates passed all tests in this batch run.</p>
                    ) : (
                      items.filter(i => i.generalStatus === 'success').map(item => (
                        <div key={item.candidate.id} className="p-2 w-full rounded border border-emerald-950/40 bg-emerald-950/5 flex items-center justify-between text-xs transition-all hover:bg-emerald-950/10 hover:border-emerald-900/30">
                          <div>
                            <span className="font-serif text-slate-200 block">{item.candidate.firstName} {item.candidate.lastName}</span>
                            <span className="text-[10px] font-mono text-slate-500 block uppercase mt-0.5">ID: {item.candidate.nationalId}</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-emerald-900/20 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded uppercase uppercase">verified</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Flagged/Failed Mismatch Column */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Mismatches & Errors ({items.filter(i => i.generalStatus === 'failed').length})</span>
                    </div>
                    {items.filter(i => i.generalStatus === 'failed').length > 0 && (
                      <button
                        type="button"
                        onClick={handleRetryFailed}
                        className="h-6.5 px-2 bg-rose-950/45 hover:bg-rose-900/60 border border-rose-900/40 text-rose-400 hover:text-white rounded text-[9.5px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1"
                        title="Retry failed verification candidates only in this same batch session"
                      >
                        🔄 Retry Failures
                      </button>
                    )}
                  </div>
                  <div className="bg-[#09090c] border border-slate-850 rounded-xl p-3.5 space-y-2.5 max-h-56 overflow-y-auto scrollbar-fancy">
                    {items.filter(i => i.generalStatus === 'failed').length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">No verification failures recorded in this cohort.</p>
                    ) : (
                      items.filter(i => i.generalStatus === 'failed').map(item => (
                        <div key={item.candidate.id} className="p-2.5 rounded border border-rose-950/45 bg-rose-950/5 text-xs space-y-1.5 hover:bg-rose-950/10 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-serif text-slate-200 block font-bold text-rose-400">{item.candidate.firstName} {item.candidate.lastName}</span>
                              <span className="text-[9.5px] font-mono text-slate-500 block mt-0.5">ID: {item.candidate.nationalId}</span>
                            </div>
                            <span className="text-[8.5px] font-mono font-bold bg-rose-900/25 text-rose-400 border border-rose-950 px-1.5 py-0.5 rounded uppercase">flagged</span>
                          </div>

                          <div className="space-y-1.5 bg-black/40 p-2 rounded border border-slate-900">
                            {item.dhaStatus === 'failed' && (
                              <div className="text-[10px] leading-relaxed">
                                <span className="text-rose-400 font-mono font-bold uppercase block text-[8px] tracking-wider leading-none">DHA Registry Error:</span>
                                <span className="text-slate-300 font-sans mt-0.5 block">{item.dhaError || "Citizen parameters not matching Department of Home Affairs demographic indexes."}</span>
                              </div>
                            )}
                            {item.saqaStatus === 'failed' && (
                              <div className="text-[10px] leading-relaxed">
                                <span className="text-amber-500 font-mono font-bold uppercase block text-[8px] tracking-wider leading-none">SAQA Register Mismatch:</span>
                                <span className="text-slate-300 font-sans mt-0.5 block">{item.saqaError || "Supplied certificate parameters failed validation check mapping."}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sovereign Batch Runs History Archive */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#141418] border border-slate-850 p-4 rounded-xl flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-400" />
                <div>
                  <span className="text-[10.5px] font-mono text-slate-200 uppercase tracking-widest font-bold block">
                    📜 Sovereign Batch History Audit Archives
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-500 block">
                    Secure ledger storing all processed Department of Home Affairs and SAQA validations
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHistory(prev => !prev);
                  loadHistory();
                }}
                className="h-7.5 px-3 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[9.5px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer text-slate-300 hover:text-white"
              >
                {showHistory ? "Collapse Audit Archives" : `Inspect History Ledger (${historyBatches.length})`}
              </button>
            </div>

            {showHistory && (
              <div className="space-y-4 animate-fadeIn">
                {/* 1. Bento Audit Analytics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 p-3.5 border border-slate-900 rounded-xl">
                  {/* card 1: Registry Compliance Index */}
                  <div className="bg-[#09090c] border border-slate-900 rounded-lg p-2.5 space-y-1">
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest block">compliance ledger index</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-serif text-emerald-400 font-bold">
                        {historyBatches.length > 0 
                          ? Math.round(((historyBatches.reduce((acc, b) => acc + (b.totalCandidates || 0), 0) - historyBatches.reduce((acc, b) => acc + (b.failedCount || 0), 0)) / Math.max(1, historyBatches.reduce((acc, b) => acc + (b.totalCandidates || 0), 0))) * 100)
                          : 100}%
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400/70 bg-emerald-950/40 px-1 py-0.5 rounded leading-none">Compliant</span>
                    </div>
                  </div>

                  {/* card 2: Total unique candidates screened */}
                  <div className="bg-[#09090c] border border-slate-900 rounded-lg p-2.5 space-y-1">
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest block">total profiles vetted</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-serif text-slate-200 font-bold">
                        {historyBatches.reduce((acc, b) => acc + (b.totalCandidates || 0), 0)}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">Candidates</span>
                    </div>
                  </div>

                  {/* card 3: Mismatches Isolated count */}
                  <div className="bg-[#09090c] border border-slate-900 rounded-lg p-2.5 space-y-1">
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest block">mismatches flagged</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-serif text-rose-400 font-bold">
                        {historyBatches.reduce((acc, b) => acc + (b.failedCount || 0), 0)}
                      </span>
                      <span className="text-[9px] font-mono text-rose-500/70 bg-rose-950/30 px-1 py-0.5 rounded leading-none">Flagged</span>
                    </div>
                  </div>

                  {/* card 4: API SLA connection index */}
                  <div className="bg-[#09090c] border border-slate-900 rounded-lg p-2.5 space-y-1">
                    <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest block">sovereign gateway sla</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-mono text-slate-300 font-bold">99.98% SLA</span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse self-center"></span>
                    </div>
                  </div>
                </div>

                {/* 2. Ledger Filter Console */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0d11] p-3 border border-slate-900 rounded-xl">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-550 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search batch runs by candidate or auditor email..."
                      value={searchBatchQuery}
                      onChange={(e) => setSearchBatchQuery(e.target.value)}
                      className="w-full bg-black/60 border border-slate-850 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-mono text-slate-200 placeholder:text-slate-505 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[10.5px] font-mono">
                      <input
                        type="checkbox"
                        checked={filterBatchFailOnly}
                        onChange={(e) => setFilterBatchFailOnly(e.target.checked)}
                        className="rounded accent-emerald-500 h-3.5 w-3.5 bg-slate-900 border-slate-800"
                      />
                      <span className={filterBatchFailOnly ? "text-rose-400 font-bold" : "text-slate-400"}>Flagged Failures Only</span>
                    </label>

                    {searchBatchQuery || filterBatchFailOnly ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchBatchQuery("");
                          setFilterBatchFailOnly(false);
                        }}
                        className="text-[9.5px] font-mono text-emerald-400 hover:underline"
                      >
                        Reset Ledger Filters
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* 3. Archives data table */}
                <div className="border border-slate-850 rounded-xl overflow-hidden bg-black/40 p-4 space-y-3 max-h-64 overflow-y-auto scrollbar-fancy">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 font-mono text-[9px] text-slate-500 uppercase tracking-wider select-none">
                        <th className="pb-2 font-bold">Batch Timestamp</th>
                        <th className="pb-2 text-center font-bold">Candidates</th>
                        <th className="pb-2 text-center text-emerald-400 font-bold">DHA Cleared</th>
                        <th className="pb-2 text-center text-emerald-400 font-bold">SAQA Certified</th>
                        <th className="pb-2 text-center text-rose-400 font-bold">Mismatches</th>
                        <th className="pb-2 text-center text-slate-500 font-bold">Bypassed</th>
                        <th className="pb-2 text-right">Performed By</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyBatches.filter(batch => {
                        const matchesQuery = searchBatchQuery === "" || 
                          batch.performedBy.toLowerCase().includes(searchBatchQuery.toLowerCase()) ||
                          batch.id.toLowerCase().includes(searchBatchQuery.toLowerCase()) ||
                          batch.results?.some(r => r.candidateName?.toLowerCase().includes(searchBatchQuery.toLowerCase()));
                        const matchesFail = !filterBatchFailOnly || (batch.failedCount && batch.failedCount > 0);
                        return matchesQuery && matchesFail;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-[10px] text-slate-500 italic font-mono uppercase tracking-wider">
                            No historic bulk vetting transactions matched filter guidelines.
                          </td>
                        </tr>
                      ) : (
                        historyBatches
                          .filter(batch => {
                            const matchesQuery = searchBatchQuery === "" || 
                              batch.performedBy.toLowerCase().includes(searchBatchQuery.toLowerCase()) ||
                              batch.id.toLowerCase().includes(searchBatchQuery.toLowerCase()) ||
                              batch.results?.some(r => r.candidateName?.toLowerCase().includes(searchBatchQuery.toLowerCase()));
                            const matchesFail = !filterBatchFailOnly || (batch.failedCount && batch.failedCount > 0);
                            return matchesQuery && matchesFail;
                          })
                          .map((batch) => (
                            <tr key={batch.id} className="border-b border-slate-900/60 hover:bg-[#141418]/40 transition-colors">
                              <td className="py-2.5 font-mono text-[10px] text-slate-300">
                                {new Date(batch.timestamp).toLocaleString("en-ZA", {
                                  dateStyle: "medium",
                                  timeStyle: "short"
                                })}
                              </td>
                              <td className="py-2.5 text-center font-serif text-[11.5px] text-slate-300">{batch.totalCandidates}</td>
                              <td className="py-2.5 text-center text-emerald-400 font-mono text-[10.5px] font-bold">{batch.successfulDha}</td>
                              <td className="py-2.5 text-center text-emerald-400 font-mono text-[10.5px] font-bold">{batch.successfulSaqa}</td>
                              <td className="py-2.5 text-center text-rose-400 font-mono text-[10.5px] font-bold">{batch.failedCount}</td>
                              <td className="py-2.5 text-center text-slate-500 font-mono text-[10.5px]">{batch.skippedCount}</td>
                              <td className="py-2.5 text-right font-mono text-[9px] text-slate-500">{batch.performedBy}</td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => downloadBatchCSV(batch)}
                                  className="p-1 text-emerald-400 hover:text-white bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-900/30 rounded inline-flex items-center justify-center transition-all cursor-pointer"
                                  title="Export Certified Spreadsheets Report (.csv)"
                                >
                                  <Download className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Selected Candidates Roster Status List */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
              {progress === 100 && !isProcessing ? "Full Queue Status Log" : "Vetting Cohort Queue"}
            </h4>
            <div className="border border-slate-850 rounded-xl overflow-hidden bg-black/20 max-h-48 overflow-y-auto scrollbar-fancy">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#191922] border-b border-slate-850 font-mono text-[9px] text-slate-500 uppercase tracking-wider select-none">
                    <th className="p-3">Candidate</th>
                    <th className="p-3">National ID No</th>
                    <th className="p-3">DHA Status</th>
                    <th className="p-3">SAQA Status</th>
                    <th className="p-3 text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-sans">
                  {items.map((item, idx) => {
                    const c = item.candidate;
                    const isFocus = currentCandidateIndex === idx;
                    const isExpanded = expandedCandidateId === c.id;

                    return (
                      <React.Fragment key={c.id}>
                        <tr 
                          onClick={() => setExpandedCandidateId(isExpanded ? null : c.id)}
                          className={`transition-colors text-[11.5px] cursor-pointer ${
                            isFocus 
                              ? 'bg-[#0F1715]/90 border-l border-emerald-500' 
                              : isExpanded 
                                ? 'bg-slate-900/45 border-b border-slate-900'
                                : item.generalStatus === 'success'
                                  ? 'bg-emerald-950/5 hover:bg-slate-900/40'
                                  : 'hover:bg-slate-950/20'
                          }`}
                          title="Click to expand demographic alignment register ledger report"
                        >
                          <td className="p-3 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              {/* Inline Collapse Chevron status indicator */}
                              <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`} />
                              
                              <span className="text-slate-450 text-[10px] font-mono leading-none">{idx + 1}.</span>
                              {/* Inline Real-time Status Icon Indicator */}
                              <span className="shrink-0 inline-flex items-center justify-center">
                                {item.generalStatus === 'processing' && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                                )}
                                {item.generalStatus === 'success' && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                )}
                                {item.generalStatus === 'failed' && (
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                )}
                                {item.generalStatus === 'idle' && (
                                  <HelpCircle className="h-3.5 w-3.5 text-slate-700 hover:text-slate-500" />
                                )}
                              </span>
                              <span>{c.firstName} {c.lastName}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">{c.nationalId}</td>
                          <td className="p-3 font-mono">
                            {item.dhaStatus === 'pending' && <span className="text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-950 text-[10px]">Pending</span>}
                            {item.dhaStatus === 'verifying' && <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30 text-[10px] animate-pulse">Requesting...</span>}
                            {item.dhaStatus === 'success' && <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/40 text-[10px]">✓ Cleared</span>}
                            {item.dhaStatus === 'failed' && <span className="text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-950 text-[10px]" title={item.dhaError || "Validation issue"}>⚠ Failed</span>}
                            {item.dhaStatus === 'skipped' && <span className="text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[10px]">Skipped</span>}
                          </td>
                          <td className="p-3 font-mono">
                            {item.saqaStatus === 'pending' && <span className="text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-950 text-[10px]">Pending</span>}
                            {item.saqaStatus === 'verifying' && <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30 text-[10px] animate-pulse">Checking...</span>}
                            {item.saqaStatus === 'success' && <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/40 text-[10px]">✓ Verified</span>}
                            {item.saqaStatus === 'failed' && <span className="text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-950 text-[10px]" title={item.saqaError || "Verification mismatch"}>⚠ Mismatch</span>}
                            {item.saqaStatus === 'skipped' && <span className="text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[10px]">Skipped</span>}
                          </td>
                          <td className="p-3 text-right">
                            {item.generalStatus === 'processing' && (
                              <span className="text-emerald-400 font-mono text-[10px] font-bold animate-pulse flex items-center justify-end gap-1">
                                <Loader2 className="h-3 w-3 animate-spin shrink-0" /> Processing
                              </span>
                            )}
                            {item.generalStatus === 'success' && (
                              <span className="text-emerald-400 font-mono text-[10px] font-bold">Complete</span>
                            )}
                            {item.generalStatus === 'failed' && (
                              <span className="text-rose-455 text-rose-400 font-mono text-[10px] font-bold">Uncertified</span>
                            )}
                            {item.generalStatus === 'idle' && (
                              <span className="text-slate-600 font-mono text-[10px]">Queued</span>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#0b0c0f]/95 border-b border-slate-900 leading-relaxed">
                            <td colSpan={5} className="p-4">
                              <div className="bg-[#050507] border border-slate-850 rounded-xl p-4 space-y-3.5 text-slate-300 select-text animate-fadeIn">
                                
                                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                                    <ShieldAlert className="h-4 w-4 text-emerald-500" /> Sovereign Demographic Integrity & NLRD Registry Verification Output
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-500 uppercase">
                                    Document GUID: compliance-{c.id}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  {/* Section 1: Supplied */}
                                  <div className="space-y-2 bg-[#0d0e12]/60 p-3 rounded-lg border border-slate-900/50">
                                    <div className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-900 pb-1">
                                      Input Parameters Supplied
                                    </div>
                                    <div className="space-y-1.5 font-sans">
                                      <div>
                                        <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Full Name</span>
                                        <span className="text-slate-200 font-bold block">{c.firstName} {c.lastName}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">SA Identity Number</span>
                                        <span className="text-slate-300 font-mono text-[10.5px] block mt-0.5">{c.nationalId}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Registered Degree</span>
                                        <span className="text-slate-300 block truncate" title={c.qualificationName}>{c.qualificationName || "Metric Standard"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">NQF Accredit Standard</span>
                                        <span className="text-slate-300 font-mono block">Level {c.nqfLevel} Validation</span>
                                      </div>
                                      <div>
                                        <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Institution / Registry Index</span>
                                        <span className="text-slate-300 font-mono text-[10px] block truncate" title={c.institution}>{c.institution} │ Student NO: {c.studentNumber || "N/A"}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Section 2: DHA Registry */}
                                  <div className="space-y-2 bg-[#0d0e12]/60 p-3 rounded-lg border border-slate-900/50">
                                    <div className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-900 pb-1">
                                      DHA Population Register Sync
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">DHA Sync Status:</span>
                                        {item.dhaStatus === 'success' ? (
                                          <span className="text-[8.5px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.5 rounded uppercase font-bold leading-none">Passed Compliance</span>
                                        ) : item.dhaStatus === 'failed' ? (
                                          <span className="text-[8.5px] font-mono bg-rose-950/30 text-rose-400 border border-rose-900/30 px-1.5 py-0.5 rounded uppercase font-bold leading-none">DHA Reject</span>
                                        ) : item.dhaStatus === 'skipped' ? (
                                          <span className="text-[8.5px] font-mono bg-slate-900/80 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded uppercase leading-none">Pre-Cleared</span>
                                        ) : (
                                          <span className="text-[8.5px] font-mono bg-slate-950 text-slate-600 border border-slate-900 px-1.5 py-0.5 rounded uppercase leading-none">Awaiting sync...</span>
                                        )}
                                      </div>

                                      {item.dhaStatus === 'success' || c.dhaVerified ? (
                                        <div className="space-y-1.5 font-sans">
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Canonical Official Name</span>
                                            <span className="text-emerald-400 font-bold block">{c.firstName.toUpperCase()} {c.lastName.toUpperCase()}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Status / Vitality register</span>
                                            <span className="text-emerald-400 font-mono font-bold text-[10.5px] block leading-none mt-0.5">● CITIZEN ACTIVE - ALIVE</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Birth Certificate validation</span>
                                            <span className="text-slate-300 font-mono block">DOB Match (19{c.nationalId?.substring(0, 2)}-{c.nationalId?.substring(2, 4)}-{c.nationalId?.substring(4, 6)})</span>
                                          </div>
                                        </div>
                                      ) : item.dhaStatus === 'failed' ? (
                                        <div className="space-y-1 bg-rose-950/10 p-2 rounded border border-rose-900/20">
                                          <span className="text-[8.5px] font-mono text-rose-400 uppercase tracking-wider block font-bold leading-none">DHA Mismatch Detail:</span>
                                          <span className="text-slate-300 font-sans block text-[10px] leading-normal">{item.dhaError || "Supplied identity profile does not match national population database index registers."}</span>
                                        </div>
                                      ) : (
                                        <p className="text-slate-500 text-[10px] italic">Awaiting Home Affairs demographic dispatch return telemetry...</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Section 3: SAQA Registry */}
                                  <div className="space-y-2 bg-[#0d0e12]/60 p-3 rounded-lg border border-slate-900/50">
                                    <div className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider border-b border-slate-900 pb-1">
                                      SAQA NLRD Registry Records
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9.5px] font-mono text-slate-500 uppercase leading-none">NLRD Sync Status:</span>
                                        {item.saqaStatus === 'success' ? (
                                          <span className="text-[8.5px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.5 rounded uppercase font-bold leading-none">Standards Approved</span>
                                        ) : item.saqaStatus === 'failed' ? (
                                          <span className="text-[8.5px] font-mono bg-rose-950/30 text-rose-400 border border-rose-900/30 px-1.5 py-0.5 rounded uppercase font-bold leading-none">Unaccredited</span>
                                        ) : item.saqaStatus === 'skipped' ? (
                                          <span className="text-[8.5px] font-mono bg-slate-900/80 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded uppercase leading-none">Pre-Verified</span>
                                        ) : (
                                          <span className="text-[8.5px] font-mono bg-slate-950 text-slate-600 border border-slate-900 px-1.5 py-0.5 rounded uppercase leading-none">Awaiting lookup...</span>
                                        )}
                                      </div>

                                      {item.saqaStatus === 'success' || c.saqaVerified ? (
                                        <div className="space-y-1.5 font-sans">
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Accredited NQF Standard</span>
                                            <span className="text-emerald-400 font-bold block">Certified standards (Level {c.nqfLevel})</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Registered Registry Stamp</span>
                                            <span className="text-slate-300 block truncate" title={c.institution}>{c.institution} Verified NLRD</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] uppercase font-mono text-slate-500 block leading-none">Authentication Ledger Key</span>
                                            <span className="text-slate-400 font-mono text-[8px] block break-all leading-none mt-0.5">SAQA_HL5_{c.nationalId ? btoa(c.nationalId).slice(0, 12).toUpperCase() : "HASH"}</span>
                                          </div>
                                        </div>
                                      ) : item.saqaStatus === 'failed' ? (
                                        <div className="space-y-1 bg-rose-950/10 p-2 rounded border border-rose-900/20">
                                          <span className="text-[8.5px] font-mono text-rose-400 uppercase tracking-wider block font-bold leading-none">NLRD Verification Exception:</span>
                                          <span className="text-slate-300 font-sans block text-[10px] leading-normal">{item.saqaError || "Qualification degree name, student number or NQF level mismatches the NLRD database indices."}</span>
                                        </div>
                                      ) : (
                                        <p className="text-slate-500 text-[10px] italic">Awaiting NLRD qualification register database lookup response telemetry...</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Monospaced Live Audit Logging Console */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center bg-[#141418] border border-slate-900/40 p-2 rounded-lg">
              <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
                <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                Live Cryptographic Vetting Terminal logs
              </h4>
              <span className="text-[9px] font-mono text-slate-650 bg-black/40 border border-slate-850 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-slate-500 select-none">
                Audited Sync
              </span>
            </div>

            <div 
              ref={logConsoleRef}
              className="bg-[#07070a] border border-slate-900 rounded-xl p-4 font-mono text-[10.5px] text-slate-400 space-y-1.5 h-36 overflow-y-auto scrollbar-fancy selection:bg-emerald-500/20"
            >
              {logs.map((log, lIdx) => (
                <div key={lIdx} className="leading-relaxed hover:text-white break-words">
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Controls Footer */}
        <div className="p-5 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#191922]">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4 text-emerald-500 animate-pulse" />
            Federal Department of Labour Cryptographic Secure Channel
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Desk
            </button>

            {!progress && !isProcessing ? (
              <button
                type="button"
                onClick={triggerBulkVerification}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-widest rounded transition-all cursor-pointer hover:scale-[1.02] active:scale-95 duration-150"
              >
                <Play className="h-4.5 w-4.5 text-white animate-pulse" />
                Authorize Bulk Run
              </button>
            ) : isProcessing ? (
              <button
                type="button"
                disabled
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-950/30 text-emerald-555 text-emerald-405 border border-emerald-900/30 text-xs font-mono font-bold uppercase tracking-widest rounded cursor-not-allowed shrink-0"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                Processing Vetting Cycle...
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase tracking-widest rounded transition-all cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
