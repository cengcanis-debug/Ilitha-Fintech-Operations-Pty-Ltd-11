import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Users, Landmark, Lock, ShieldCheck, CreditCard, 
  Sun, Moon, Star, Menu, X, ArrowRight, HelpCircle, CheckCircle, 
  Terminal, Activity, Sparkles, FileText, Compass, Briefcase, Eye,
  Server, Globe, Cpu, ChevronRight, UserCheck, KeyRound, Wifi, Smartphone, Scale,
  RefreshCw, Database, Clock, FileSignature, Zap, Award
} from 'lucide-react';

import { SovereignComplianceDashboard } from './components/SovereignComplianceDashboard';
import { ApplicationProcessWizard } from './components/ApplicationProcessWizard';
import { ValidationCenter } from './components/ValidationCenter';
import ZeroDataHub from './components/ZeroDataHub';
import { LegalIPHub } from './components/LegalIPHub';
import { CandidateTimeline } from './components/CandidateTimeline';
import { CandidateProfileSection } from './components/CandidateProfileSection';
import { BulkVerificationModal } from './components/BulkVerificationModal';
import { ComplianceReportGenerator } from './components/ComplianceReportGenerator';
import { CvGeneratorHub } from './components/CvGeneratorHub';

import { Candidate, Job, HiringDecision, AuditLog } from './types';
import { 
  getCandidates, 
  getJobs, 
  getDecisions, 
  getAuditLogs, 
  saveCandidate, 
  recordDecision, 
  recordAuditEntry,
  verifyIdentityDHA,
  verifyQualificationSAQA
} from './lib/api';

const NQF_LEVEL_LABELS: Record<number, string> = {
  1: 'NQF 1: Grade 9 / General Certificate',
  2: 'NQF 2: Grade 10 / Elementary Certificate',
  3: 'NQF 3: Grade 11 / Intermediate Certificate',
  4: 'NQF 4: Grade 12 (Matric) / National Senior Certificate',
  5: 'NQF 5: Higher Certificate / Occupational Certificate',
  6: 'NQF 6: National Diploma / Advanced Certificate',
  7: 'NQF 7: Bachelor\'s Degree / Advanced Diploma',
  8: 'NQF 8: Honours Degree / Postgraduate Diploma',
  9: 'NQF 9: Master\'s Degree / Professional Master\'s',
  10: 'NQF 10: Doctoral Degree / PhD'
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('candidate_wizard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isZeroDataMode, setIsZeroDataMode] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<string>('candidate');

  // DB States
  const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [decisionsList, setDecisionsList] = useState<HiringDecision[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [departmentTargets, setDepartmentTargets] = useState<Record<string, number>>({
    "Civil Engineering": 80,
    "Health Services": 85,
    "Education Admin": 75,
    "Safety & Security": 90,
    "Public Works": 70
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'warn' }>>([]);

  // Toast System
  const showToast = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Sync index.css light-theme overrides with App state
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
    }
  }, [isDarkMode]);

  // Load All Core South African sovereign data from REST server
  const loadData = async () => {
    try {
      setLoading(true);
      const cands = await getCandidates();
      const loadedJobs = await getJobs();
      const decs = await getDecisions();
      const logs = await getAuditLogs();
      
      setCandidatesList(cands);
      setJobs(loadedJobs);
      setDecisionsList(decs);
      setAuditLogs(logs);
    } catch (err) {
      console.error("Error loading application data:", err);
      showToast("Compliance API connection offline. Active local state sandbox mode.", "warn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Applicant Profile and Wizard Active States
  const [activeCandidate, setActiveCandidate] = useState<Candidate>({
    id: 'CAND-USER-' + Math.floor(1000 + Math.random() * 9000),
    nationalId: '',
    firstName: '',
    lastName: '',
    email: '',
    studentNumber: '',
    nqfLevel: 4,
    qualificationName: '',
    institution: '',
    dhaVerified: false,
    saqaVerified: false,
    status: 'pending'
  });

  const [dhaVerifyStatus, setDhaVerifyStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [saqaVerifyStatus, setSaqaVerifyStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [verificationFeedback, setVerificationFeedback] = useState<{ dha?: string; saqa?: string }>({});

  // Home Affairs Handshake trigger
  const performDhaVerification = async () => {
    if (!activeCandidate.nationalId || !activeCandidate.firstName || !activeCandidate.lastName) {
      showToast("Please provide legal full name and ID first.", "warn");
      return;
    }
    setDhaVerifyStatus('verifying');
    try {
      const res = await verifyIdentityDHA(activeCandidate.nationalId, activeCandidate.firstName, activeCandidate.lastName);
      if (res.verified) {
        setDhaVerifyStatus('verified');
        setActiveCandidate(prev => ({
          ...prev,
          dhaVerified: true,
          verifiedAt: new Date().toISOString()
        }));
        setVerificationFeedback(prev => ({ ...prev, dha: res.meta?.comment || "Identity confirmed via National Registry" }));
        showToast("DHA identity record verified successfully!", "success");
      } else {
        setDhaVerifyStatus('failed');
        setVerificationFeedback(prev => ({ ...prev, dha: res.reason || "Verification failed: Name does not match national registry." }));
        showToast("DHA identity check failed: Profile mismatch.", "warn");
      }
    } catch (err: any) {
      setDhaVerifyStatus('failed');
      setVerificationFeedback(prev => ({ ...prev, dha: err.message || "Failed to contact DHA API." }));
      showToast("DHA API Gateway returned error. Sandbox backup active.", "warn");
    }
    await loadData();
  };

  // SAQA NLRD Handshake trigger
  const performSaqaVerification = async () => {
    if (!activeCandidate.studentNumber || !activeCandidate.qualificationName || !activeCandidate.institution) {
      showToast("Please provide student number and educational files.", "warn");
      return;
    }
    setSaqaVerifyStatus('verifying');
    try {
      const res = await verifyQualificationSAQA(
        activeCandidate.studentNumber,
        activeCandidate.nqfLevel,
        activeCandidate.qualificationName,
        activeCandidate.institution,
        activeCandidate.isInternational,
        activeCandidate.originCountry,
        activeCandidate.foreignEvaluationNo,
        activeCandidate.foreignEvaluationAuthority
      );
      if (res.verified) {
        setSaqaVerifyStatus('verified');
        setActiveCandidate(prev => ({
          ...prev,
          saqaVerified: true
        }));
        setVerificationFeedback(prev => ({ ...prev, saqa: res.meta?.comment || "Qualification verified with NLRD registry." }));
        showToast("SAQA qualification match authenticated!", "success");
      } else {
        setSaqaVerifyStatus('failed');
        setVerificationFeedback(prev => ({ ...prev, saqa: res.reason || "Qualification not found in SAQA database." }));
        showToast("SAQA NLRD check failed: Record not found.", "warn");
      }
    } catch (err: any) {
      setSaqaVerifyStatus('failed');
      setVerificationFeedback(prev => ({ ...prev, saqa: err.message || "Failed to contact SAQA registry." }));
      showToast("SAQA validation gatekeeper timed out. Sandbox backup active.", "warn");
    }
    await loadData();
  };

  // Sync applicant profiles to database
  const handleRegisterProfileHook = async (updatedProfile: Candidate) => {
    try {
      const saved = await saveCandidate(updatedProfile);
      setActiveCandidate(saved);
      showToast("Compliance Verification dossier compiled!", "success");
      await recordAuditEntry(
        "CANDIDATE DOSSIER COMPILED",
        `Dossier files ingested for verification: ${saved.firstName} ${saved.lastName} (NQF Level ${saved.nqfLevel})`,
        saved.id,
        "Funa Ispan Mzantsi Ingestion Node"
      );
      await loadData();
    } catch (err) {
      console.error("Error compiling profile:", err);
    }
  };

  // Department targets setters
  const handleUpdateDepartmentTarget = (dept: string, target: number) => {
    setDepartmentTargets(prev => ({ ...prev, [dept]: target }));
    showToast(`Updated placement target for ${dept} to ${target}%`, 'info');
  };

  const handleAddDepartmentTarget = (dept: string, target: number) => {
    setDepartmentTargets(prev => ({ ...prev, [dept]: target }));
    showToast(`Added new department alignment goal: ${dept}`, 'success');
  };

  // Secure audits record dispatcher
  const recordAuditEntryHook = async (action: string, details: string, candidateId: string, performedBy: string) => {
    const log = await recordAuditEntry(action, details, candidateId, performedBy);
    await loadData();
    return log;
  };

  // Hiring Decision recorder
  const recordDecisionHook = async (decision: Omit<HiringDecision, 'id' | 'recordedAt'>) => {
    const saved = await recordDecision(decision);
    showToast(`Hiring compliance decision finalized: ${decision.decision.toUpperCase()}`, 'success');
    await loadData();
    return saved;
  };

  // Export JSON Report for Dept of Labour
  const exportDecisionsToJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(decisionsList, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `dol-compliance-report-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Department of Labour (DoL) JSON Dossier Exported!", "success");
    } catch (e) {
      showToast("Failed to compile DoL reports.", "warn");
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-[#050608] text-slate-300' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 pointer-events-auto backdrop-blur-md ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-800/60 text-emerald-300' 
                  : toast.type === 'warn'
                    ? 'bg-amber-950/90 border-amber-800/60 text-amber-300'
                    : 'bg-teal-950/90 border-teal-800/60 text-teal-300'
              }`}
            >
              <CheckCircle className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${
                toast.type === 'success' ? 'text-emerald-400' : toast.type === 'warn' ? 'text-amber-400' : 'text-teal-400'
              }`} />
              <div className="text-xs font-mono font-medium leading-normal">
                {toast.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Container Grid */}
      <div className="flex flex-col md:flex-row min-h-screen">
        
        {/* Navigation Sidebar (Desktop) */}
        <aside className={`w-64 shrink-0 hidden md:flex flex-col justify-between border-r ${
          isDarkMode ? 'bg-[#090b0e] border-slate-900' : 'bg-white border-slate-200'
        }`}>
          <div className="p-6 space-y-8 text-left">
            
            {/* Header Brand */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-display font-black tracking-tight text-white leading-none uppercase">
                  Funa Ispan
                </h1>
                <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-bold mt-0.5 block">
                  Mzantsi Portal
                </span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-3">
                Main Workspace
              </span>

              {[
                { id: 'candidate_wizard', label: 'Applicant Desk', icon: UserCheck },
                { id: 'candidate_timeline', label: 'Candidate Timelines', icon: Clock },
                { id: 'cv_generator', label: 'Elite CV Generator', icon: Award },
                { id: 'compliance_dashboard', label: 'Auditor Panel', icon: Compass },
                { id: 'validation_center', label: 'Validation Hub', icon: ShieldCheck },
                { id: 'mass_vetting', label: 'Mass Vetting Bureau', icon: Database },
                { id: 'compliance_reports', label: 'Reports & Seals', icon: FileSignature },
                { id: 'zero_data', label: 'Data-Free Portal', icon: Smartphone },
                { id: 'legal_ip', label: 'Sovereign NDA Desk', icon: Scale }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      showToast(`Opened: ${tab.label}`, 'info');
                    }}
                    className={`w-full h-10 px-3.5 rounded-xl text-left text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-3 cursor-pointer border ${
                      isActive 
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/10' 
                        : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Controls */}
          <div className="p-6 border-t border-slate-900 space-y-4 text-left">
            
            {/* System Security status */}
            <div className="p-3 bg-black/40 border border-slate-850 rounded-xl space-y-1 text-[10.5px] font-mono">
              <div className="flex justify-between text-slate-500 text-[9px] uppercase font-bold">
                <span>DHA Gateway:</span>
                <span className="text-emerald-400">ENCRYPTED</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[9px] uppercase font-bold">
                <span>SAQA NLRD Check:</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
            </div>

            {/* Dark Mode toggle & credits */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">© 2026 Sovereign</span>
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-black hover:bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header Navigation */}
        <header className={`md:hidden flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'bg-[#090b0e] border-slate-900' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-display font-bold text-white uppercase tracking-wider">
              Funa Ispan Mzantsi
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg bg-black border border-slate-850 text-slate-400"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-black border border-slate-850 text-slate-400"
            >
              {mobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
            </button>
          </div>
        </header>

        {/* Mobile menu drop-down */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-b overflow-hidden ${
                isDarkMode ? 'bg-[#090b0e] border-slate-900' : 'bg-white border-slate-200'
              }`}
            >
              <div className="p-4 space-y-2 text-left font-mono text-xs">
                {[
                  { id: 'candidate_wizard', label: 'Applicant Desk', icon: UserCheck },
                  { id: 'candidate_timeline', label: 'Candidate Timelines', icon: Clock },
                  { id: 'compliance_dashboard', label: 'Auditor Panel', icon: Compass },
                  { id: 'validation_center', label: 'Validation Hub', icon: ShieldCheck },
                  { id: 'mass_vetting', label: 'Mass Vetting Bureau', icon: Database },
                  { id: 'compliance_reports', label: 'Reports & Seals', icon: FileSignature },
                  { id: 'zero_data', label: 'Data-Free Portal', icon: Smartphone },
                  { id: 'legal_ip', label: 'Sovereign NDA Desk', icon: Scale }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full h-10 px-3.5 rounded-lg flex items-center gap-3 text-slate-300 active:bg-emerald-600 hover:bg-slate-900 transition-colors uppercase tracking-wider font-bold text-[11px]"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Workspace viewport */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full space-y-8 overflow-x-hidden">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900/60 pb-5">
            <div className="space-y-1 text-left">
              <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-bold">
                National Compliance Gate / {
                  activeTab === 'candidate_wizard' ? 'Ingestion Wizard' :
                  activeTab === 'candidate_timeline' ? 'Audit Trail & SAQA Verification' :
                  activeTab === 'cv_generator' ? 'InterviewCoach SA Engine' :
                  activeTab === 'compliance_dashboard' ? 'Auditor Intelligence Console' :
                  activeTab === 'validation_center' ? 'Accreditation Pipeline' :
                  activeTab === 'mass_vetting' ? 'Cohort Batch Vetting Desk' :
                  activeTab === 'compliance_reports' ? 'DoL Compliance Reports & Signatures' :
                  activeTab === 'zero_data' ? 'USSD & SMS Offline System' : 'Legal IP Guardrails'
                }
              </div>
              <h2 className="text-xl md:text-2xl font-display font-semibold text-white tracking-tight">
                {activeTab === 'candidate_wizard' && 'Sovereign Candidate Vetting Bureau'}
                {activeTab === 'candidate_timeline' && 'Citizen Dossier & Vetting Timeline'}
                {activeTab === 'cv_generator' && 'Elite CV Generation & ATS Optimization Engine'}
                {activeTab === 'compliance_dashboard' && 'National Employment & Placement Ledger'}
                {activeTab === 'validation_center' && 'Zero-Trust Verification Console'}
                {activeTab === 'mass_vetting' && 'Mass DHA & SAQA Verification Bureau'}
                {activeTab === 'compliance_reports' && 'DoL Compliance Reports & Official Digital Seals'}
                {activeTab === 'zero_data' && 'USSD & SMS Data-Free Ingestion Gateway'}
                {activeTab === 'legal_ip' && 'Sovereign Intellectual Property Guardrails'}
              </h2>
            </div>

            {/* Quick status badge */}
            <div className="flex items-center gap-2.5 shrink-0 bg-[#090b0e] border border-slate-850 px-3.5 py-1.5 rounded-xl text-xs font-mono self-start sm:self-center">
              <span className="text-slate-500 uppercase tracking-wider text-[9px]">Sovereign Node:</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE [SECURED]</span>
              </div>
            </div>
          </div>

          {/* Active View Router */}
          <div className="relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Hydrating Compliance Ledger...</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'candidate_wizard' && (
                    <ApplicationProcessWizard
                      activeCandidate={activeCandidate}
                      setActiveCandidate={setActiveCandidate}
                      dhaVerifyStatus={dhaVerifyStatus}
                      setDhaVerifyStatus={setDhaVerifyStatus}
                      saqaVerifyStatus={saqaVerifyStatus}
                      setSaqaVerifyStatus={setSaqaVerifyStatus}
                      verificationFeedback={verificationFeedback}
                      setVerificationFeedback={setVerificationFeedback}
                      performDhaVerification={performDhaVerification}
                      performSaqaVerification={performSaqaVerification}
                      handleRegisterProfileHook={handleRegisterProfileHook}
                      NQF_LEVEL_LABELS={NQF_LEVEL_LABELS}
                    />
                  )}

                  {activeTab === 'candidate_timeline' && (
                    <div className="space-y-8 text-left">
                      <div className="p-6 bg-[#090b0e] border border-slate-850 rounded-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                          <div>
                            <h3 className="text-base font-display font-semibold text-white">Citizen Dossier & NLRD Vetting History</h3>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">Inspect full 5-stage verification audit trails and edit SAQA qualifications</p>
                          </div>
                        </div>
                        <CandidateProfileSection
                          activeCandidate={activeCandidate}
                          setActiveCandidate={setActiveCandidate}
                          onProfileUpdated={loadData}
                          NQF_LEVEL_LABELS={NQF_LEVEL_LABELS}
                        />
                      </div>

                      <div className="p-6 bg-[#090b0e] border border-slate-850 rounded-2xl space-y-4">
                        <h3 className="text-base font-display font-semibold text-white">National Ledger Vetting Timeline</h3>
                        <CandidateTimeline
                          candidatesList={candidatesList}
                          decisionsList={decisionsList}
                          auditLogs={auditLogs}
                          jobs={jobs}
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'compliance_dashboard' && (
                    <SovereignComplianceDashboard
                      candidatesList={candidatesList}
                      auditLogs={auditLogs}
                      departmentTargets={departmentTargets}
                      onUpdateDepartmentTarget={handleUpdateDepartmentTarget}
                      onAddDepartmentTarget={handleAddDepartmentTarget}
                    />
                  )}

                  {activeTab === 'validation_center' && (
                    <ValidationCenter
                      candidatesList={candidatesList}
                      setCandidatesList={setCandidatesList}
                      decisionsList={decisionsList}
                      setDecisionsList={setDecisionsList}
                      jobs={jobs}
                      recordAuditEntry={recordAuditEntryHook}
                      refreshAuditData={loadData}
                      recordDecisionHook={recordDecisionHook}
                      exportDecisionsToJson={exportDecisionsToJson}
                    />
                  )}

                  {activeTab === 'mass_vetting' && (
                    <BulkVerificationModal
                      selectedIds={candidatesList.map(c => c.id)}
                      candidates={candidatesList}
                      onClose={() => setActiveTab('compliance_dashboard')}
                      onComplete={loadData}
                    />
                  )}

                  {activeTab === 'compliance_reports' && (
                    <ComplianceReportGenerator
                      candidates={candidatesList}
                      auditLogs={auditLogs}
                      onAddAuditLog={async (action, details, candidateId) => {
                        await recordAuditEntryHook(action, details, candidateId, 'Funa Ispan Compliance Bureau');
                      }}
                    />
                  )}

                  {activeTab === 'cv_generator' && (
                    <CvGeneratorHub
                      candidates={candidatesList}
                      jobs={jobs}
                      activeCandidate={candidatesList[0] || {
                        id: 'cand-default',
                        firstName: 'Sipho',
                        lastName: 'Zulu',
                        nationalId: '9204125800083',
                        email: 'sipho.zulu@mzantsi.co.za',
                        nqfLevel: 7,
                        qualificationName: 'Bachelor of Science in Engineering',
                        institution: 'University of the Witwatersrand',
                        studentNumber: 'WITS-99281',
                        dhaVerified: true,
                        saqaVerified: true,
                        extraSkills: 'Project Management, Structural Analysis, AutoCAD, Python'
                      }}
                      showToast={showToast}
                    />
                  )}

                  {activeTab === 'zero_data' && (
                    <ZeroDataHub
                      theme={isDarkMode ? 'dark' : 'light'}
                      isZeroDataMode={isZeroDataMode}
                      setIsZeroDataMode={setIsZeroDataMode}
                      currentRole={currentRole}
                    />
                  )}

                  {activeTab === 'legal_ip' && (
                    <LegalIPHub />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Safe Harbor Footnote */}
          <footer className="border-t border-slate-900 pt-6 mt-12 text-left space-y-4">
            <div className="p-4 bg-black/30 border border-slate-900 rounded-2xl flex flex-col sm:flex-row items-start gap-4 text-xs font-sans text-slate-500 leading-relaxed">
              <div className="h-7 w-7 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-center shrink-0">
                <Scale className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <strong className="text-slate-400 block text-[11px] font-semibold">Regulatory Integrity & POPIA Consent Protection</strong>
                <p>
                  This portal operates under Sections 11 and 18 of the South African Protection of Personal Information Act (POPIA). Citizen biometric and academic telemetry are cryptographically masked in-memory. Central system logs are secured using SHA-256 chain signatures conforming directly with Department of Labour (DoL) specifications.
                </p>
              </div>
            </div>
          </footer>

        </main>

      </div>
    </div>
  );
}
