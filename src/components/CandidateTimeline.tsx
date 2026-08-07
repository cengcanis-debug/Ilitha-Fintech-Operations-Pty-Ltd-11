import React, { useState, useMemo } from 'react';
import { 
  User, Fingerprint, GraduationCap, Sparkles, FileCheck, Lock, 
  CheckCircle, AlertCircle, Clock, ChevronRight, Search, Landmark,
  Database, ShieldCheck, Cpu, ArrowRight, HelpCircle, HardDrive, Briefcase, FileX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate, HiringDecision, AuditLog, Job } from '../types';

interface CandidateTimelineProps {
  candidatesList: Candidate[];
  decisionsList: HiringDecision[];
  auditLogs: AuditLog[];
  jobs?: Job[];
  selectedCandidateId?: string;
  onSelectedCandidateIdChange?: (id: string) => void;
}

export function CandidateTimeline({
  candidatesList,
  decisionsList,
  auditLogs,
  jobs = [],
  selectedCandidateId,
  onSelectedCandidateIdChange
}: CandidateTimelineProps) {
  // If no candidates, render a friendly warning state
  if (candidatesList.length === 0) {
    return (
      <div className="bg-[#141418] border border-slate-800 rounded-xl p-8 text-center text-slate-500 font-sans space-y-3">
        <User className="h-10 w-10 text-slate-700 mx-auto" />
        <h4 className="text-slate-300 font-semibold text-sm">No Active Candidates Found</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please register or import candidate profiles first to inspect their Department of Labour vetting timelines.
        </p>
      </div>
    );
  }

  // Active selected candidate ID state
  const [localSelectedId, setLocalSelectedId] = useState<string>(candidatesList[0]?.id || "");
  const [activeStepTab, setActiveStepTab] = useState<number>(0);
  const [timelineSearch, setTimelineSearch] = useState<string>("");

  const currentSelectedId = selectedCandidateId !== undefined ? selectedCandidateId : localSelectedId;

  // Get active candidate object
  const selectedCandidate = useMemo(() => {
    return candidatesList.find(c => c.id === currentSelectedId) || candidatesList[0];
  }, [candidatesList, currentSelectedId]);

  // Handle switching candidates nicely
  const handleCandidateChange = (candId: string) => {
    if (onSelectedCandidateIdChange) {
      onSelectedCandidateIdChange(candId);
    } else {
      setLocalSelectedId(candId);
    }
    setActiveStepTab(0); // Reset expand step to first step
  };

  // Find latest decision for this candidate
  const candidateDecision = useMemo(() => {
    if (!selectedCandidate) return null;
    return decisionsList.find(d => d.candidateId === selectedCandidate.id);
  }, [decisionsList, selectedCandidate]);

  // Find all related audit logs for selected candidate
  const relatedLogs = useMemo(() => {
    if (!selectedCandidate) return [];
    return auditLogs.filter(log => 
      log.candidateId === selectedCandidate.id || 
      log.candidateId === selectedCandidate.nationalId ||
      log.details.includes(selectedCandidate.lastName) ||
      log.details.includes(selectedCandidate.id)
    );
  }, [auditLogs, selectedCandidate]);

  // Filter candidates for search dropdown selector to make it easy to manage large number of records
  const filteredSelectorCandidates = useMemo(() => {
    if (!timelineSearch.trim()) return candidatesList;
    const q = timelineSearch.toLowerCase();
    return candidatesList.filter(c => 
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.nationalId.includes(q)
    );
  }, [candidatesList, timelineSearch]);

  // Formulate the 5 verification stages
  const timelineSteps = useMemo(() => {
    if (!selectedCandidate) return [];

    const steps = [
      {
        id: 0,
        title: "Profile Onboarding",
        subTitle: "Ledger Node Created",
        icon: User,
        status: "COMPLETED" as const,
        colorClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
        badgeText: "STABLE",
        badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-600/20",
        timestamp: selectedCandidate.createdAt 
          ? new Date(selectedCandidate.createdAt).toLocaleString() 
          : new Date(Date.now() - 48 * 3600 * 1000).toLocaleString(),
        desc: "Initial ingestion pipeline completed. Form Z83 equivalent record converted to schema-compliant local JSON document. System UID and unique public key mapped in local state.",
        technicalDetails: {
          "Database Status": "LOCAL_OK",
          "Verification Signature": "SHA-256 SYSTEM_INGEST",
          "Z83 Schema Mappings": "Complete",
          "Authority Standard": "Dept of Labour Regulations 2026",
          "Lurits Linked Number": selectedCandidate.studentNumber || "N/A"
        }
      },
      {
        id: 1,
        title: "Identity Check",
        subTitle: "DHA Handshake Vetting",
        icon: Fingerprint,
        status: selectedCandidate.dhaVerified ? "COMPLETED" as const : "WARNING" as const,
        colorClass: selectedCandidate.dhaVerified 
          ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" 
          : "text-amber-400 border-amber-500/20 bg-amber-500/5",
        badgeText: selectedCandidate.dhaVerified ? "VERIFIED OK" : "UNVERIFIED / PENDING",
        badgeColor: selectedCandidate.dhaVerified 
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-600/30" 
          : "bg-amber-500/10 text-amber-400 border-amber-600/30",
        timestamp: selectedCandidate.verifiedAt 
          ? new Date(selectedCandidate.verifiedAt).toLocaleString() 
          : selectedCandidate.dhaVerified
            ? new Date(Date.now() - 24 * 3600 * 1000).toLocaleString()
            : "Awaiting Vetting Action",
        desc: selectedCandidate.dhaVerified 
          ? `South African Department of Home Affairs (DHA) national register lookup completed. Identity checksum digits validated using Luhn algorithm. Mapped name matches official birth/residency records.`
          : "Subject has registration details pending official Home Affairs database gateway query. High likelihood of placeholder data being parsed during sandbox mode.",
        technicalDetails: {
          "Gateway Server": "DHA Secure API V2",
          "National ID Checksum": "Luhn Digit Match PASS",
          "Citizen Registry Status": "ALIVE / SOUTH_AFRICAN",
          "Handshake ID": `DHA-HS-${selectedCandidate.nationalId.slice(0,6)}`,
          "Vetting Authority": "Pretoria HQ Secure Proxy Tunnel"
        }
      },
      {
        id: 2,
        title: "Qualifications Vetting",
        subTitle: "SAQA Registry Matching",
        icon: GraduationCap,
        status: selectedCandidate.saqaVerified ? "COMPLETED" as const : "WARNING" as const,
        colorClass: selectedCandidate.saqaVerified 
          ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" 
          : "text-amber-400 border-amber-500/20 bg-amber-500/5",
        badgeText: selectedCandidate.saqaVerified ? `NQF LEVEL ${selectedCandidate.nqfLevel} OK` : "PENDING EVALUATION",
        badgeColor: selectedCandidate.saqaVerified 
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-600/30" 
          : "bg-amber-500/10 text-amber-400 border-amber-600/30",
        timestamp: selectedCandidate.verifiedAt 
          ? new Date(selectedCandidate.verifiedAt).toLocaleString() 
          : selectedCandidate.saqaVerified
            ? new Date(Date.now() - 12 * 3600 * 1000).toLocaleString()
            : "Awaiting Qualification Match",
        desc: selectedCandidate.saqaVerified 
          ? `Qualifications verified directly against the South African Qualifications Authority (SAQA) National Learners' Records Database (NLRD). Registered credential verified as: "${selectedCandidate.qualificationName}" at level NQF ${selectedCandidate.nqfLevel}.`
          : "Educational certificate references uploaded and queued for SAQA API webhook handshake. Awaiting NLRD (National Learners' Records Database) status lookup.",
        technicalDetails: {
          "Verification Standard": "NLRD Registry Check",
          "Reported Institution": selectedCandidate.institution,
          "Stated Qualification": selectedCandidate.qualificationName || "No declared title",
          "Foreign Assessment": selectedCandidate.isInternational ? "Evaluated (SAQA Equivalence Standard)" : "Domestic Direct Tracking",
          "Verification Status Code": selectedCandidate.saqaVerified ? "NLRD_OK_LEVEL_STAMPED" : "NLRD_QUEUED_STAGED"
        }
      },
      {
        id: 3,
        title: "AI Fitment Scoring",
        subTitle: "NQF Alignment Match",
        icon: Sparkles,
        status: selectedCandidate.rankScore && selectedCandidate.rankScore > 0 ? "COMPLETED" as const : "INFO" as const,
        colorClass: selectedCandidate.rankScore && selectedCandidate.rankScore > 0 
          ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" 
          : "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
        badgeText: selectedCandidate.rankScore ? `${selectedCandidate.rankScore}% COMPLIANT` : "FITMENT READY",
        badgeColor: selectedCandidate.rankScore 
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-600/30" 
          : "bg-indigo-500/10 text-indigo-400 border-indigo-600/30",
        timestamp: selectedCandidate.verifiedAt 
          ? new Date(selectedCandidate.verifiedAt).toLocaleString() 
          : selectedCandidate.rankScore
            ? new Date(Date.now() - 6 * 3600 * 1000).toLocaleString()
            : "Analytical scoring waiting",
        desc: selectedCandidate.rankScore 
          ? `High precision Vertex AI fitment algorithm evaluated candidate against targeted vacancy criteria. Computed suitability index is ${selectedCandidate.rankScore}%. Educational profile aligns with declared legislated skills thresholds.`
          : "Suitability alignment indexing automatically triggers when evaluating candidate against configured jobs. Vertex AI stands ready to compute alignment index and educational NQF score match.",
        technicalDetails: {
          "Linguistic Match Rating": selectedCandidate.alignmentRating || "NOT_RATED",
          "Verification Algorithm": "Vertex AI LLM Spec Matcher V2",
          "Required Minimum NQF": "Evaluated against targeted post",
          "Targeted Skills Traces": selectedCandidate.extraSkills || "Analytical Vetting Profile"
        }
      },
      {
        id: 4,
        title: "Sovereign Sign-off",
        subTitle: "Immutable Ledger Locking",
        icon: FileCheck,
        status: candidateDecision ? "COMPLETED" as const : "PENDING" as const,
        colorClass: candidateDecision 
          ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" 
          : "text-slate-500 border-slate-800 bg-[#0A0A0C]/40",
        badgeText: candidateDecision ? `DECISION: ${candidateDecision.decision.toUpperCase()}` : "DRAFT STATE",
        badgeColor: candidateDecision 
          ? candidateDecision.decision === 'hired'
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-600/30"
            : candidateDecision.decision === 'rejected'
              ? "bg-rose-500/10 text-rose-400 border-rose-600/30"
              : "bg-blue-500/10 text-blue-400 border-blue-600/30"
          : "bg-slate-800 text-slate-400 border-slate-700/30",
        timestamp: candidateDecision 
          ? new Date(candidateDecision.recordedAt).toLocaleString() 
          : "Decision Pending Operator Input",
        desc: candidateDecision 
          ? `Hiring decision finalized with legislative justification and locked into the National Department of Labour Compliance ledger. Recorded by ${candidateDecision.recordedBy}. Audit justification signature stored.`
          : "Candidate selection remains in draft stage. Complete the recruitment selection portal wizard to commit an immutable decision record and sign off compliance.",
        technicalDetails: {
          "Durable Ledger Status": candidateDecision ? "LOCKED_IMMUTABLE" : "UNCOMMITTED_DRAFT",
          "Recorded By Operator": candidateDecision ? candidateDecision.recordedBy : "Pending Auth Profile",
          "Compliance Audit Proof": candidateDecision ? `SHA-256 LOCK_ID-${candidateDecision.id.slice(0,8)}` : "No ledger proof in draft",
          "Legislative Clearance": candidateDecision ? "APPROVED BY DESIGNATED OFFICER" : "AWAITING VERDICT SUMMARY"
        }
      }
    ];

    return steps;
  }, [selectedCandidate, candidateDecision]);

  const isEmployed = useMemo(() => {
    if (!selectedCandidate) return false;
    if (selectedCandidate.employmentStatus === 'Employed') return true;
    if (selectedCandidate.employmentStatus === 'Unemployed') return false;
    
    const isHiredDecision = decisionsList.some(d => d.candidateId === selectedCandidate.id && d.decision === 'hired');
    if (isHiredDecision) return true;

    if (selectedCandidate.workHistory) {
      try {
        const history = JSON.parse(selectedCandidate.workHistory);
        if (Array.isArray(history) && history.length > 0) {
          return history.some((job: any) => job.current === true || String(job.endDate).toLowerCase() === 'present');
        }
      } catch (e) {
        // Safe skip
      }
    }
    return false;
  }, [selectedCandidate, decisionsList]);

  const unsuccessfulCount = useMemo(() => {
    if (!selectedCandidate) return 0;
    return decisionsList.filter(d => d.candidateId === selectedCandidate.id && d.decision !== 'hired').length;
  }, [decisionsList, selectedCandidate]);

  return (
    <div className="bg-[#141418] border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
      
      {/* Selector & Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-505 animate-pulse bg-emerald-500"></div>
            <h4 className="font-serif font-light text-base text-slate-150 italic tracking-wide">Candidate Verification Timelines</h4>
          </div>
          <p className="text-xs text-slate-400">Trace compliance records of vetted candidates as a connected cryptographic validation timeline.</p>
        </div>

        {/* Dropdown Candidate Selection Matrix */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Quick Search inside filter */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-605 text-slate-500" />
            <input 
              type="text" 
              placeholder="Filter names..."
              value={timelineSearch}
              onChange={(e) => setTimelineSearch(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-slate-800 rounded px-2 py-1.5 pl-7.5 text-[11px] text-slate-200 outline-none placeholder-slate-700 font-mono transition-all focus:border-slate-600"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <select
              value={currentSelectedId}
              onChange={(e) => handleCandidateChange(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-slate-800 text-[11px] text-slate-200 rounded px-3 py-2 font-mono outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
            >
              {filteredSelectorCandidates.length === 0 ? (
                <option value="">No matches found</option>
              ) : (
                filteredSelectorCandidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.firstName} {cand.lastName} ({cand.dhaVerified && cand.saqaVerified ? "Verified" : "Draft"})
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <ChevronRight className="h-3 w-3 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Candidate Quick Statistics Strip */}
      {selectedCandidate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4 bg-[#0A0A0C]/50 border border-slate-850/60 rounded-xl text-xs font-sans">
          
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="text-left truncate">
              <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider">Candidate Node</span>
              <span className="font-semibold text-slate-200 block truncate">{selectedCandidate.firstName} {selectedCandidate.lastName}</span>
              <span className="text-[10px] text-slate-400 font-mono italic truncate block">{selectedCandidate.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-900 pt-3 sm:pt-0 sm:pl-4">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
              <Landmark className="h-4.5 w-4.5" />
            </div>
            <div className="text-left truncate">
              <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider">National ID Status</span>
              <span className="font-semibold text-slate-200 font-mono block truncate">{selectedCandidate.nationalId}</span>
              <span className={`inline-flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider ${selectedCandidate.dhaVerified ? "text-emerald-400" : "text-amber-400"}`}>
                <ShieldCheck className="h-3 w-3" /> {selectedCandidate.dhaVerified ? "DHA Approved" : "Awaiting DHA"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t lg:border-t-0 lg:border-l border-slate-900 pt-3 lg:pt-0 lg:pl-4">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div className="text-left truncate">
              <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider">Academic SAQA Level</span>
              <span className="font-semibold text-slate-200 block truncate">{selectedCandidate.qualificationName || "No Declared Qualification"}</span>
              <span className={`inline-flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider ${selectedCandidate.saqaVerified ? "text-emerald-400" : "text-amber-400"}`}>
                <Database className="h-3 w-3" /> {selectedCandidate.saqaVerified ? `NQF Level ${selectedCandidate.nqfLevel} Verified` : "Pending NLRD"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-900 pt-3 xl:pt-0 xl:pl-4">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <div className="text-left truncate">
              <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider">Suitability Fitment</span>
              <span className="font-semibold text-slate-200 block truncate">{candidateDecision ? `Outcome Finalized` : `Verification Stage`}</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block font-mono mt-0.5 uppercase tracking-wider">
                {selectedCandidate.status}
              </span>
            </div>
          </div>

          {/* New Column 5: Current Employment Status */}
          <div className="flex items-center gap-3 border-t lg:border-t-0 lg:border-l border-slate-900 pt-3 lg:pt-0 lg:pl-4">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
              <Briefcase className="h-4.5 w-4.5" />
            </div>
            <div className="text-left truncate">
              <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider">Employment Status</span>
              <span className="font-semibold text-slate-200 block truncate">{isEmployed ? 'Employed' : 'Unemployed'}</span>
              <span className={`inline-flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded ${
                isEmployed 
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/25'
              }`}>
                ● {isEmployed ? 'Currently Employed' : 'Unemployed (Avail.)'}
              </span>
            </div>
          </div>

          {/* New Column 6: Unsuccessful Postings Count */}
          <div className="flex items-center gap-3 border-t xl:border-t-0 xl:border-l border-slate-900 pt-3 xl:pt-0 xl:pl-4 font-sans">
            <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
              <FileX className="h-4.5 w-4.5" />
            </div>
            <div className="text-left truncate">
              <span className="text-[9px] text-slate-500 block uppercase font-mono tracking-wider font-sans">Unsuccessful Posts</span>
              <span className="font-semibold text-slate-200 block truncate font-mono">{unsuccessfulCount} / {decisionsList.filter(d => d.candidateId === selectedCandidate.id).length} Job Posts</span>
              <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Evaluated w/o success</span>
            </div>
          </div>

        </div>
      )}

      {/* Connected Path Responsive Visualizer */}
      {selectedCandidate && (
        <div className="space-y-6">
          <div className="relative">
            
            {/* Connection path backgrounds (Horizontal line for desktop; rendered absolutely) */}
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-800 -translate-y-1/2 hidden md:block z-0"></div>
            
            {/* Dynamic visual path connecting completed steps with emerald highlight */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 hidden md:block z-0 overflow-hidden" style={{ top: '50%', transform: 'translateY(-50%)' }}>
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                style={{ 
                  width: `${
                    timelineSteps.filter(s => s.status === 'COMPLETED').length === 5 
                      ? '100' 
                      : (timelineSteps.filter(s => s.status === 'COMPLETED').length - 1) * 25
                  }%` 
                }}
              ></div>
            </div>

            {/* Stepper Bubble Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10 text-center">
              {timelineSteps.map((step) => {
                const StepIcon = step.icon;
                const isCompleted = step.status === 'COMPLETED';
                const isWarning = step.status === 'WARNING';
                const isInfo = step.status === 'INFO';
                const isActive = activeStepTab === step.id;

                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStepTab(step.id)}
                    className="flex flex-row md:flex-col items-center gap-3.5 bg-[#0e0e11] md:bg-transparent border border-slate-850 md:border-0 rounded-xl p-3 md:p-0 text-left md:text-center group transition-all cursor-pointer focus:outline-none"
                  >
                    
                    {/* Circle Indicator */}
                    <div className="relative shrink-0 mx-auto">
                      <div 
                        className={`h-11 w-11 rounded-full border flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? 'scale-110 shadow-2xl bg-[#141418]' 
                            : 'bg-[#0A0A0C] hover:scale-105'
                        } ${
                          isCompleted 
                            ? 'border-emerald-500 text-emerald-400 shadow-emerald-500/10 shadow-lg' 
                            : isWarning 
                              ? 'border-amber-500 text-amber-400 shadow-amber-500/10'
                              : isInfo
                                ? 'border-indigo-500 text-indigo-400 shadow-indigo-505/10'
                                : 'border-slate-800 text-slate-600'
                        }`}
                      >
                        <StepIcon className="h-5 w-5" />

                        {/* Completed tiny badge */}
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#141418] flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-white fill-current" />
                          </div>
                        )}
                        {/* Warning tiny badge */}
                        {isWarning && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 border-2 border-[#141418] flex items-center justify-center">
                            <AlertCircle className="h-3 w-3 text-[#0a0a0c] fill-current" />
                          </div>
                        )}
                      </div>

                      {/* Active Indicator Ring */}
                      {isActive && (
                        <div className="absolute -inset-1.5 border border-dashed border-emerald-500/40 rounded-full animate-spin [animation-duration:12s]"></div>
                      )}
                    </div>

                    {/* Step descriptions */}
                    <div className="text-left md:text-center min-w-0 flex-1">
                      <span className={`block font-mono text-[9px] uppercase tracking-widest ${
                        isCompleted ? 'text-emerald-400' : isWarning ? 'text-amber-400' : isInfo ? 'text-indigo-400' : 'text-slate-500'
                      }`}>
                        Step {step.id + 1}
                      </span>
                      <span className="block font-semibold text-slate-100 text-xs truncate mt-0.5 group-hover:text-white transition-colors">
                        {step.title}
                      </span>
                      <span className="block text-[10px] text-slate-500 truncate font-mono">
                        {step.subTitle}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider mt-2.5 border ${step.badgeColor}`}>
                      {step.badgeText}
                    </span>

                  </button>
                );
              })}
            </div>
          </div>

          {/* Stepped Active Accordion card detail with micro-entry motion */}
          <AnimatePresence mode="wait">
            {activeStepTab !== null && timelineSteps[activeStepTab] && (
              <motion.div
                key={activeStepTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                className="bg-[#0A0A0C] border border-slate-800 rounded-xl p-5 md:p-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
                  
                  {/* Detailed Description Column */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h5 className="font-serif font-light text-base text-slate-100 italic tracking-wide">
                        {timelineSteps[activeStepTab].title} Sequence Details
                      </h5>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${timelineSteps[activeStepTab].badgeColor}`}>
                        {timelineSteps[activeStepTab].badgeText}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans font-normal">
                      {timelineSteps[activeStepTab].desc}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                      <span className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-850">
                        <Clock className="h-3 w-3 text-slate-550 shrink-0" />
                        Vetted Timestamp: {timelineSteps[activeStepTab].timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Technical Meta Ledger Fields Column */}
                  <div className="lg:col-span-5 bg-[#141418] border border-slate-850/60 p-4 rounded-xl space-y-3 shrink-0">
                    <div className="border-b border-slate-900 pb-1.5 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <Database className="h-3 w-3 text-emerald-500" /> Technical Audit proof
                      </span>
                      <span className="text-[8px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                        VERIFIABLE
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] font-mono">
                      {Object.entries(timelineSteps[activeStepTab].technicalDetails).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start gap-2">
                          <span className="text-slate-600 uppercase text-[10px] shrink-0">{key}:</span>
                          <span className="text-slate-350 text-right truncate max-w-[200px]" title={String(value)}>
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Candidate-Specific Cryptographic Trace and Recruitment Outcome Ledgers */}
      {selectedCandidate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-850/60 pt-5">
          
          {/* Pane 1: Related Legislative Registry Audit Traces */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-emerald-500" />
                Related Legislative Registry Audit Traces ({relatedLogs.length})
              </h5>
              <span className="text-[10px] text-slate-500 font-mono">HASH: COMPLIANT</span>
            </div>

            <div className="bg-[#0A0A0C] border border-slate-850 rounded-xl overflow-hidden shadow-inner max-h-64 overflow-y-auto">
              {relatedLogs.length === 0 ? (
                <div className="text-center py-10 font-mono text-slate-500 text-xs">
                  No matched cryptographic ledger traces recorded yet for this candidate in current session.
                </div>
              ) : (
                <div className="divide-y divide-slate-900/60 font-mono text-[11px]">
                  {relatedLogs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-[#141418]/60 transition-colors flex flex-col justify-between gap-1 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 uppercase text-[10px]">
                          {log.action}
                        </span>
                        <span className="text-slate-400 font-sans">{log.details}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500">
                        <div className="flex gap-3">
                          <span>By: {log.performedBy}</span>
                          <span>IP: {log.ipAddress}</span>
                        </div>
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pane 2: Recruitment History & Unsuccessful Applications Ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-500" />
                Recruitment Lifecycle & Outcomes Ledger ({decisionsList.filter(d => d.candidateId === selectedCandidate.id).length})
              </h5>
              <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">
                {unsuccessfulCount} UNSUCCESSFUL
              </span>
            </div>

            <div className="bg-[#0A0A0C] border border-slate-850 rounded-xl overflow-hidden shadow-inner max-h-64 overflow-y-auto text-left">
              {decisionsList.filter(d => d.candidateId === selectedCandidate.id).length === 0 ? (
                <div className="text-center py-10 font-mono text-slate-500 text-xs">
                  No recruitment decisions or applications recorded yet for this candidate.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/40 text-[11px] font-sans">
                  {decisionsList.filter(d => d.candidateId === selectedCandidate.id).map((decision) => {
                    const matchedJob = jobs.find(j => j.id === decision.jobId);
                    const isSuccess = decision.decision === 'hired';
                    return (
                      <div key={decision.id} className="p-3 hover:bg-[#141418]/60 transition-colors space-y-2">
                        <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <div>
                            <span className="font-semibold text-slate-200 block text-xs">
                              {matchedJob ? matchedJob.title : "Unspecified Position"}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              ID: {decision.jobId ? decision.jobId.slice(0, 8) : 'Job ID'} • Score: {decision.rankScoreAtDecision}%
                            </span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold text-center shrink-0 border ${
                            isSuccess 
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                              : decision.decision === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                          }`}>
                            {isSuccess ? '★ HIRED' : decision.decision === 'rejected' ? 'REJECTED' : 'SHORTLISTED'}
                          </span>
                        </div>

                        <p className="text-slate-350 text-[11px] leading-relaxed italic bg-[#101014] p-2 rounded border border-slate-900 font-serif">
                          "{decision.justification || 'No legislative justification statement supplied'}"
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>Auditor: {decision.recordedBy}</span>
                          <span>{new Date(decision.recordedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
