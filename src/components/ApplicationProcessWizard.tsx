import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, ShieldCheck, FileCheck, 
  ChevronRight, Lock, Eye, AlertCircle, RefreshCw, Check, ArrowRight, ShieldAlert, BookOpen, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate, CandidateDocument } from '../types';

interface ApplicationProcessWizardProps {
  activeCandidate: Candidate;
  setActiveCandidate: React.Dispatch<React.SetStateAction<Candidate>>;
  dhaVerifyStatus: 'idle' | 'verifying' | 'verified' | 'failed';
  setDhaVerifyStatus: (status: 'idle' | 'verifying' | 'verified' | 'failed') => void;
  saqaVerifyStatus: 'idle' | 'verifying' | 'verified' | 'failed';
  setSaqaVerifyStatus: (status: 'idle' | 'verifying' | 'verified' | 'failed') => void;
  verificationFeedback: { dha?: string; saqa?: string };
  setVerificationFeedback: React.Dispatch<React.SetStateAction<{ dha?: string; saqa?: string }>>;
  performDhaVerification: () => Promise<void>;
  performSaqaVerification: () => Promise<void>;
  handleRegisterProfileHook: (updatedProfile: Candidate) => Promise<void>;
  NQF_LEVEL_LABELS: Record<number, string>;
}

export function ApplicationProcessWizard({
  activeCandidate,
  setActiveCandidate,
  dhaVerifyStatus,
  setDhaVerifyStatus,
  saqaVerifyStatus,
  setSaqaVerifyStatus,
  verificationFeedback,
  setVerificationFeedback,
  performDhaVerification,
  performSaqaVerification,
  handleRegisterProfileHook,
  NQF_LEVEL_LABELS
}: ApplicationProcessWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [parsingLogs, setParsingLogs] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingProgress, setParsingProgress] = useState<number>(0);
  
  // Declaration & authorization checkboxes
  const [certifiedTruthful, setCertifiedTruthful] = useState<boolean>(false);
  const [authorizedForwarding, setAuthorizedForwarding] = useState<boolean>(false);
  const [formIsSubmitting, setFormIsSubmitting] = useState<boolean>(false);

  // Sub-step logs within academic/identity vetting
  const [academicLogs, setAcademicLogs] = useState<string[]>([]);
  const [identityLogs, setIdentityLogs] = useState<string[]>([]);

  // Pre-configured CV Scenarios to make the simulation incredibly realistic and responsive
  const scenarios = [
    {
      label: "Accredited SA Cadet Profile (Wits Graduate)",
      name: "Zolani Mandela",
      id: "9412155092083",
      email: "zolani@mandela.co.za",
      studentNumber: "LUR0498321",
      nqfLevel: 7,
      qualificationName: "Bachelor of Science in Engineering",
      institution: "University of the Witwatersrand",
      skills: "Basic Computing, Engineering Support, Project Coordination"
    },
    {
      label: "Technical Trade School Profile (UJ Tech)",
      name: "Sizwe Dlamini",
      id: "9608245037081",
      email: "sizwe.dlamini@outlook.com",
      studentNumber: "LUR0918732",
      nqfLevel: 6,
      qualificationName: "Diploma in Electrical Infrastructure",
      institution: "University of Johannesburg",
      skills: "Electrical, Welding, Bricklaying, First Aid"
    },
    {
      label: "Foreign Qualified Applicant (WES Evaluated)",
      name: "Farai Moyo",
      id: "9310125081084",
      email: "farai.moyo@gmail.com",
      studentNumber: "LUR0827361",
      nqfLevel: 8,
      qualificationName: "Honours Degree in Applied Mathematics",
      institution: "National University of Science and Technology",
      isInternational: true,
      originCountry: "Zimbabwe",
      foreignEvaluationNo: "DFQE-2026-00382",
      foreignEvaluationAuthority: "SAQA Foreign Evaluation DFQE",
      skills: "Basic Computing, Stock Tallying, Retail Merchandising"
    }
  ];

  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);

  // Parse CV Simulator
  const handleCvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCvFile(file);
      triggerCvParsing(file.name);
    }
  };

  const triggerCvParsing = (filename: string) => {
    setIsParsing(true);
    setParsingProgress(0);
    setParsingLogs([]);

    const logMessages = [
      `Initializing stream parser for file "${filename}"...`,
      "Decompressing text blocks & layer segmentation...",
      "Executing AI metadata parsing (Sovereign extraction target enabled)...",
      "Validating structural layout against official Department of Labour schemas...",
      "Form extraction successfully compiled on candidate's behalf!"
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logMessages.length) {
        setParsingLogs(prev => [...prev, logMessages[currentLogIndex]]);
        setParsingProgress(prev => Math.min(prev + 20, 100));
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsParsing(false);
          // Apply scenario values to pre-fill active candidate state based on selection
          const activeScenario = scenarios[selectedScenarioIndex];
          setActiveCandidate(prev => ({
            ...prev,
            firstName: activeScenario.name.split(' ')[0],
            lastName: activeScenario.name.split(' ').slice(1).join(' '),
            nationalId: activeScenario.id,
            email: activeScenario.email,
            studentNumber: activeScenario.studentNumber,
            nqfLevel: activeScenario.nqfLevel,
            qualificationName: activeScenario.qualificationName,
            institution: activeScenario.institution,
            extraSkills: activeScenario.skills,
            isInternational: (activeScenario as any).isInternational || false,
            originCountry: (activeScenario as any).originCountry || '',
            foreignEvaluationNo: (activeScenario as any).foreignEvaluationNo || '',
            foreignEvaluationAuthority: (activeScenario as any).foreignEvaluationAuthority || '',
            dhaVerified: false,
            saqaVerified: false
          }));
          // Reset subsequent steps setup
          setDhaVerifyStatus('idle');
          setSaqaVerifyStatus('idle');
          setVerificationFeedback({});
          // Progress automatically to review extracted data
          setCurrentStep(2);
        }, 500);
      }
    }, 800);
  };

  // Trigger simulated Academic Registration checks
  const runAcademicChecks = async () => {
    setAcademicLogs([
      "Establishing sovereign handshake with South African Qualifications Authority gateway...",
      `Querying qualification registry for "${activeCandidate.qualificationName}"...`
    ]);
    
    // Trigger actual API Verification through App.tsx method
    await performSaqaVerification();
  };

  useEffect(() => {
    if (saqaVerifyStatus === 'verified') {
      setAcademicLogs(prev => [
        ...prev,
        `Academic file matches database records in SAQA National Student Registrar system.`,
        "✅ Level Accreditation Match: CONFIRMED"
      ]);
    } else if (saqaVerifyStatus === 'failed') {
      setAcademicLogs(prev => [
        ...prev,
        "❌ Accreditation Verification query returned: NO_RECORD_FOUND"
      ]);
    }
  }, [saqaVerifyStatus]);

  // Trigger simulated DHA checks
  const runIdentityChecks = async () => {
    setIdentityLogs([
      "Re-shaping secure payload for Department of Home Affairs canister...",
      `Pinging national identity database for National ID ${activeCandidate.nationalId}...`
    ]);

    await performDhaVerification();
  };

  useEffect(() => {
    if (dhaVerifyStatus === 'verified') {
      setIdentityLogs(prev => [
        ...prev,
        "Sovereign identity registry matches first names, surname and active standing.",
        "✅ canonical identity verified: MATCHED"
      ]);
    } else if (dhaVerifyStatus === 'failed') {
      setIdentityLogs(prev => [
        ...prev,
        "❌ identity records could not be reconciled. Reason code: DHA_ERR_CHECKSUM_FAIL"
      ]);
    }
  }, [dhaVerifyStatus]);

  // Direct Submission handler
  const handleWizardSubmit = async () => {
    if (!certifiedTruthful || !authorizedForwarding) {
      alert("Please toggle both declarations before authorizing the transmission.");
      return;
    }
    setFormIsSubmitting(true);
    try {
      const payload: Candidate = {
        ...activeCandidate,
        status: 'verified'
      };
      await handleRegisterProfileHook(payload);
    } catch (e) {
      console.error(e);
    } finally {
      setFormIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#141418] border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl space-y-8">
      
      {/* Header and Step Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          <div className="text-left">
            <h3 className="font-serif font-light text-lg text-slate-100 italic tracking-wide">Guided CV Intake & Verification</h3>
            <p className="text-xs text-slate-400">Step-by-step interactive portfolio evaluation and official authorization portal.</p>
          </div>
        </div>

        {/* Phase badges */}
        <div className="flex items-center gap-1 bg-[#0A0A0C] p-1 rounded border border-slate-800 shrink-0 select-none">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              onClick={() => {
                // Let them traverse backwards or if completed
                if (step < currentStep) setCurrentStep(step);
              }}
              className={`h-7 w-7 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                currentStep === step
                  ? 'bg-emerald-600 text-white shadow shadow-emerald-600/30 font-extrabold'
                  : currentStep > step
                    ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-950/50 cursor-pointer'
                    : 'text-slate-600 border border-transparent'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Main Steps Carousel */}
      <div className="min-h-[380px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: CV SELECT AND EXTRACTOR SCREEN */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest block font-bold mb-1">Step 1 of 5: Document Upload & Scenario Selection</span>
                <h4 className="text-sm font-semibold text-slate-200">Load Your CV / Portfolio Scan</h4>
                <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                  Funa Ispan Mzantsi utilizes dynamic Vertex AI text extractors to analyze your CV content to automatically generate your official Department of Labour profile registration forms. Select an applicant profile scenario to simulate parsing, or upload your own document.
                </p>
              </div>

              {/* Scenario Selector */}
              <div className="bg-[#0A0A0C]/60 p-4 rounded-lg border border-slate-850 space-y-3">
                <label className="block text-xs font-medium text-slate-400 font-mono uppercase tracking-wider">Select CV Scenario Profile:</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {scenarios.map((sc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedScenarioIndex(idx)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedScenarioIndex === idx
                          ? 'border-emerald-500 bg-emerald-950/10 shadow shadow-emerald-500/10'
                          : 'border-slate-800 bg-[#0A0A0C] hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-200">{sc.name}</p>
                      <p className="text-[11px] text-slate-450 mt-0.5 mt-1 font-serif italic truncate">{sc.qualificationName}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">{sc.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag Zone */}
              <div className="relative border-2 border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/10 hover:border-slate-700 transition-colors flex flex-col items-center justify-center space-y-4">
                <input
                  type="file"
                  id="cv-intake-file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCvSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isParsing}
                />
                
                <div className="h-12 w-12 bg-slate-800/60 rounded-full flex items-center justify-center border border-slate-700">
                  {isParsing ? (
                    <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400" />
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-300 font-medium">Click to select or drag and drop your CV file here</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Supports PDF, DOC, DOCX up to 5MB</p>
                </div>
              </div>

              {/* Parsing Stream Log */}
              {isParsing && (
                <div className="bg-[#0A0A0C] border border-slate-850 p-4 rounded-xl space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Integrations Pipeline Diagnostics</span>
                    <span className="text-emerald-400 text-xs font-bold animate-pulse">{parsingProgress}%</span>
                  </div>
                  <div className="space-y-1.5 min-h-[90px] text-[11px]">
                    {parsingLogs.map((log, idx) => (
                      <p key={idx} className="text-emerald-400/90 leading-relaxed flex items-center gap-2">
                        <span className="text-emerald-555 font-bold">▶</span> {log}
                      </p>
                    ))}
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${parsingProgress}%` }} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: QUALIFICATION AND SAQA CHECK */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-505 uppercase tracking-widest block font-bold mb-1">Step 2 of 5: SAQA Qualifications Vetting</span>
                <h4 className="text-sm font-semibold text-slate-200">Qualifications & Academic Accreditations Assessment</h4>
                <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                  Next, we verify the extracted credentials against the SAQA database (South African Qualifications Authority) or evaluation registries to certify your declared NQF level.
                </p>
              </div>

              {/* Extracted Data Visual Summary */}
              <div className="bg-[#0A0A0C] border border-slate-850 p-4 rounded-xl flex items-start gap-4">
                <div className="h-11 w-11 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider block">Extracted Target Academics:</span>
                  <p className="text-xs font-bold text-slate-200">{activeCandidate.qualificationName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{activeCandidate.institution} <span className="text-slate-600">•</span> Level {activeCandidate.nqfLevel}</p>
                </div>
              </div>

              {/* Action and Log Area */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={runAcademicChecks}
                  disabled={saqaVerifyStatus === 'verifying' || saqaVerifyStatus === 'verified'}
                  className={`w-full py-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    saqaVerifyStatus === 'verified'
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 cursor-default'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 cursor-pointer'
                  }`}
                >
                  {saqaVerifyStatus === 'verifying' ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 text-emerald-400 animate-spin" />
                      Auditing Academic Files...
                    </>
                  ) : saqaVerifyStatus === 'verified' ? (
                    <>
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                      Accredited Qualification Successfully Verified
                    </>
                  ) : (
                    "Authorize and query SAQA database"
                  )}
                </button>

                {academicLogs.length > 0 && (
                  <div className="bg-[#0A0A0C]/80 border border-slate-850 p-4 rounded-xl space-y-1.5 font-mono text-[11px] leading-relaxed">
                    <span className="text-[9px] text-slate-500 uppercase font-bold block mb-2 tracking-widest">Sovereign Registrar Handshake Ledger</span>
                    {academicLogs.map((log, idx) => (
                      <p key={idx} className={log && typeof log === 'string' && (log.startsWith('✓') || log.startsWith('✅')) ? 'text-emerald-400' : log && typeof log === 'string' && log.startsWith('❌') ? 'text-rose-450' : 'text-slate-450'}>
                        {log}
                      </p>
                    ))}
                  </div>
                )}

                {verificationFeedback.saqa && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-950 text-[11px] font-mono leading-relaxed text-emerald-300 rounded-lg">
                    {verificationFeedback.saqa}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: IDENTITY AND DHA CHECK */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-505 uppercase tracking-widest block font-bold mb-1">Step 3 of 5: Home Affairs Vetting</span>
                <h4 className="text-sm font-semibold text-slate-200">Identity Integrity & DHA Verification</h4>
                <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                  Finally, we verify your extracted 13-Digit National ID payload against the Department of Home Affairs registers to confirm canonical citizenship details.
                </p>
              </div>

              {/* ID Data Visual Check */}
              <div className="bg-[#0A0A0C] border border-slate-850 p-4 rounded-xl flex items-start gap-4">
                <div className="h-11 w-11 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider block">Extracted Target Identity:</span>
                  <p className="text-xs font-bold text-slate-200">{activeCandidate.firstName} {activeCandidate.lastName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">SA ID: <span className="font-bold text-slate-300 tracking-wider font-sans">{activeCandidate.nationalId}</span></p>
                </div>
              </div>

              {/* Action and Log Area */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={runIdentityChecks}
                  disabled={dhaVerifyStatus === 'verifying' || dhaVerifyStatus === 'verified' || saqaVerifyStatus !== 'verified'}
                  className={`w-full py-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    dhaVerifyStatus === 'verified'
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 cursor-default'
                      : saqaVerifyStatus !== 'verified'
                        ? 'bg-slate-900 text-slate-600 border-slate-850 cursor-not-allowed'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 cursor-pointer'
                  }`}
                >
                  {saqaVerifyStatus !== 'verified' ? (
                    "Complete Academic checkpoint first"
                  ) : dhaVerifyStatus === 'verifying' ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 text-emerald-400 animate-spin" />
                      Interrogating DHA Register...
                    </>
                  ) : dhaVerifyStatus === 'verified' ? (
                    <>
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                      National Identity verified successfully
                    </>
                  ) : (
                    "Authorize and query DHA Registry"
                  )}
                </button>

                {identityLogs.length > 0 && (
                  <div className="bg-[#0A0A0C]/80 border border-slate-850 p-4 rounded-xl space-y-1.5 font-mono text-[11px] leading-relaxed">
                    <span className="text-[9px] text-slate-500 uppercase font-bold block mb-2 tracking-widest">Department of Home Affairs Sovereign Ledger</span>
                    {identityLogs.map((log, idx) => (
                      <p key={idx} className={log && typeof log === 'string' && (log.startsWith('✓') || log.startsWith('✅')) ? 'text-emerald-400' : log && typeof log === 'string' && log.startsWith('❌') ? 'text-rose-450' : 'text-slate-450'}>
                        {log}
                      </p>
                    ))}
                  </div>
                )}

                {verificationFeedback.dha && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-950 text-[11px] font-mono leading-relaxed text-emerald-300 rounded-lg">
                    {verificationFeedback.dha}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: FORM REVIEW AND CO-SIGN DECLARATIONS */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-505 uppercase tracking-widest block font-bold mb-1">Step 4 of 5: Review Generated Intake Forms</span>
                <h4 className="text-sm font-semibold text-slate-200">Sovereign Intake Application Forms (Inspection Drawer)</h4>
                <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                  We have generated your formal employment vetted form based on your parsed CV and verified credentials. Inspect the official digital representation below.
                </p>
              </div>

              {/* GREEN OFFICIAL FORM REPRESENTATION BOX */}
              <div className="bg-[#121614] border border-emerald-800/40 rounded-xl p-5 md:p-6 text-xs text-slate-300 shadow-inner relative overflow-hidden font-sans">
                {/* Official watermarked header */}
                <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/[0.02] border-b border-l border-emerald-500/10 rounded-bl-3xl flex items-center justify-center font-serif text-[10px] italic font-light font-bold text-emerald-500/15 pointer-events-none uppercase tracking-widest">
                  FORM Z83
                </div>

                <div className="flex items-center gap-2.5 border-b border-emerald-800/20 pb-4 mb-4">
                  <div className="h-10 w-10 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    <FileCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="font-serif font-semibold tracking-wide text-xs text-emerald-400 uppercase">NATIONAL CADET PROGRAMME INTAKE STATEMENT</h5>
                    <p className="text-[10px] text-slate-450">DIRECTORATE OF SOCIAL DEVELOPMENT & CO-OPS • SOUTH AFRICA</p>
                  </div>
                </div>

                {/* Form fields grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-b border-emerald-800/15 pb-4 mb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">1. CANONICAL NAMES:</span>
                    <span className="font-semibold text-slate-250 block text-xs">{activeCandidate.firstName} {activeCandidate.lastName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">2. SOVEREIGN ID:</span>
                    <span className="font-mono font-medium text-slate-250 block text-xs tracking-wider">{activeCandidate.nationalId}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">3. QUAL DECLARED:</span>
                    <span className="font-semibold text-slate-250 block text-xs">{activeCandidate.qualificationName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">4. INSTITUTION:</span>
                    <span className="font-semibold text-[#8bf7c0] block text-xs">{activeCandidate.institution}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">5. ACCREDITATION:</span>
                    <span className="font-mono text-emerald-400 block text-xs">SAQA NQF LEVEL {activeCandidate.nqfLevel}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">6. EMAIL FILING:</span>
                    <span className="font-medium text-slate-250 block text-xs truncate">{activeCandidate.email}</span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-emerald-800/15 pb-4 mb-4 text-left">
                  <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">7. EXTRACTED TRADE & DISCIPLINE SKILLS:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeCandidate.extraSkills
                      ? activeCandidate.extraSkills.split(',').map(s => s.trim()).filter(Boolean).map((sk, idx) => (
                          <span key={idx} className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-mono">
                            {sk}
                          </span>
                        ))
                      : <span className="text-[10px] text-slate-500">No trade skills captured.</span>}
                  </div>
                </div>

                {/* Secure Seal of approval */}
                <div className="flex items-center justify-between font-mono text-[9px] text-emerald-500/75">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    STATUS: DIGITALLY SEALED AND REGISTRAR LOCKED
                  </span>
                  <span className="font-bold">ID: ZIZA-{activeCandidate.nationalId.substring(0, 5).toUpperCase()}</span>
                </div>
              </div>

              {/* AUTHORIZATIONS SUB-FORM */}
              <div className="bg-[#0A0A0C]/50 border border-slate-850 p-4 rounded-xl space-y-3">
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wide border-b border-slate-900 pb-2 mb-2">Required Declaration Agreements</label>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none text-slate-300 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={certifiedTruthful}
                      onChange={(e) => setCertifiedTruthful(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 border-slate-805 bg-[#141418] h-4 w-4 mt-0.5 cursor-pointer accent-emerald-500 shrink-0"
                    />
                    <span className="text-xs leading-5">
                      I certify that the information generated automatically above is correct and truthfully represents my official qualifications.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none text-slate-300 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={authorizedForwarding}
                      onChange={(e) => setAuthorizedForwarding(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 border-slate-805 bg-[#141418] h-4 w-4 mt-0.5 cursor-pointer accent-emerald-500 shrink-0"
                    />
                    <span className="text-xs leading-5">
                      I explicitly authorise Funa Ispan Mzantsi and Department of Labour to forward this verified intake portfolio and query historical files on my behalf.
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: FINAL REGISTER AND ROUTING GATE */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6 text-center py-6"
            >
              <div className="max-w-md mx-auto space-y-4">
                <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <UserCheck className="h-8 w-8" />
                </div>
                
                <div>
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest block font-bold mb-1">Step 5 of 5: Final Transmission Handshake</span>
                  <h4 className="text-sm font-semibold text-slate-200">Sovereign Matching Portfolio Ready!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    Congratulations! Your South African national identity records (DHA) and accredited qualifications (SAQA) have both been formally queried and appended to your intake form. Your verified matching state is fully constructed.
                  </p>
                </div>

                <div className="bg-[#0A0A0C] border border-slate-850 p-4 rounded-xl text-left text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Applicant:</span>
                    <span className="font-semibold text-slate-200">{activeCandidate.firstName} {activeCandidate.lastName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Form Accr:</span>
                    <span className="text-emerald-400 font-mono">DHA & SAQA VERIFIED SEALS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Intake Dispatch:</span>
                    <span className="font-medium text-slate-350">Forwarded to Department of Labour</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleWizardSubmit}
                  disabled={formIsSubmitting || !certifiedTruthful || !authorizedForwarding}
                  className={`w-full py-4 rounded-lg text-sm font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                    certifiedTruthful && authorizedForwarding
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-600/30 font-extrabold hover:scale-[1.01]'
                      : 'bg-slate-805 text-slate-500 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  {formIsSubmitting ? (
                    <>
                      <RefreshCw className="h-4.5 w-4.5 text-white animate-spin" />
                      Filing Case and Dispatching Portfolio...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 text-white animate-pulse" />
                      Consent, Sign & Forward Verified Application
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer controls */}
        <div className="flex justify-between items-center pt-8 border-t border-slate-800 mt-8">
          <button
            type="button"
            disabled={currentStep === 1 || isParsing}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-mono cursor-pointer"
          >
            Previous
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              disabled={
                (currentStep === 1 && !cvFile && isParsing) ||
                (currentStep === 2 && saqaVerifyStatus !== 'verified') ||
                (currentStep === 3 && dhaVerifyStatus !== 'verified') ||
                (currentStep === 4 && (!certifiedTruthful || !authorizedForwarding))
              }
              onClick={() => setCurrentStep(prev => prev + 1)}
              className={`px-5 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${
                (currentStep === 1 && !isParsing) ||
                (currentStep === 2 && saqaVerifyStatus === 'verified') ||
                (currentStep === 3 && dhaVerifyStatus === 'verified') ||
                (currentStep === 4 && certifiedTruthful && authorizedForwarding)
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-600/20 hover:scale-[1.02] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed'
              }`}
            >
              Next Step
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            <div className="w-[102px]"></div> // spacing balancer
          )}
        </div>
      </div>

    </div>
  );
}
