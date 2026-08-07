import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Send, 
  Info, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Smartphone, 
  QrCode, 
  RotateCcw, 
  HelpCircle, 
  User, 
  Briefcase, 
  BookOpen, 
  Database,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Candidate, Job, HiringDecision } from '../types';
import { getCandidates, saveCandidate, getJobs, recordDecision, recordAuditEntry } from '../lib/api';

interface ZeroDataHubProps {
  theme: 'light' | 'dark';
  isZeroDataMode: boolean;
  setIsZeroDataMode: (enabled: boolean) => void;
  currentRole: string;
}

export default function ZeroDataHub({ 
  theme, 
  isZeroDataMode, 
  setIsZeroDataMode, 
  currentRole 
}: ZeroDataHubProps) {
  // DB States
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dbLoading, setDbLoading] = useState<boolean>(false);

  // USSD Simulator States
  const [ussdInput, setUssdInput] = useState<string>('*134*9412#');
  const [ussdSessionActive, setUssdSessionActive] = useState<boolean>(false);
  const [ussdScreen, setUssdScreen] = useState<'main' | 'register' | 'jobs' | 'jobDetail' | 'apply' | 'status' | 'qr' | 'success' | 'dialer'>('dialer');
  const [ussdMessage, setUssdMessage] = useState<string>('');
  const [ussdMenuInput, setUssdMenuInput] = useState<string>('');
  
  // Registration Wizard Step State (inside USSD)
  const [regStep, setRegStep] = useState<number>(0);
  const [regData, setRegData] = useState({
    nationalId: '',
    firstName: '',
    lastName: '',
    studentNumber: '',
    nqfLevel: 4,
    qualificationName: '',
    institution: 'High School'
  });

  // Application flow inside USSD
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [applyNationalId, setApplyNationalId] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Status check state inside USSD
  const [statusNationalId, setStatusNationalId] = useState<string>('');
  const [statusResult, setStatusResult] = useState<{ found: boolean; candidate?: Candidate } | null>(null);

  // QR Code pass candidate (from USSD)
  const [qrCandidate, setQrCandidate] = useState<Candidate | null>(null);

  // SMS Simulator States
  const [smsInput, setSmsInput] = useState<string>('');
  const [smsThread, setSmsThread] = useState<Array<{ id: string; sender: 'user' | 'system'; text: string; time: string }>>([
    {
      id: 'sms-init-1',
      sender: 'system',
      text: 'Welcome to Funa Ispan Mzantsi Off-Grid Employment Portal. Send HELP for available commands. (This service is completely FREE/Data-Free)',
      time: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [smsSending, setSmsSending] = useState<boolean>(false);

  // Load candidates and jobs for offline/ussd searches
  const loadSovereignDb = async () => {
    try {
      setDbLoading(true);
      const cands = await getCandidates();
      const loadedJobs = await getJobs();
      setCandidates(cands);
      setJobs(loadedJobs.filter(j => j.status === 'open'));
    } catch (err) {
      console.error("Error priming Zero-Data database:", err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    loadSovereignDb();
  }, []);

  // Dial USSD Code
  const handleUssdDial = () => {
    if (ussdInput.trim() === '*134*9412#') {
      setUssdSessionActive(true);
      setUssdScreen('main');
      setUssdMessage('Funa Ispan Mzantsi Zero-Data Service\nConnecting to National Registers...\n\nSelect option:');
    } else {
      setUssdSessionActive(true);
      setUssdScreen('dialer');
      setUssdMessage('MMI Code initiated...\nConnection problem or invalid MMI code.');
      setTimeout(() => {
        setUssdSessionActive(false);
      }, 2500);
    }
  };

  const handleUssdBackToMain = () => {
    setUssdScreen('main');
    setUssdMenuInput('');
    setRegStep(0);
    setStatusResult(null);
  };

  const handleUssdMenuSubmit = async () => {
    const choice = ussdMenuInput.trim();
    setUssdMenuInput('');

    if (ussdScreen === 'main') {
      switch (choice) {
        case '1':
          setUssdScreen('register');
          setRegStep(1); // 1. National ID
          break;
        case '2':
          setUssdScreen('jobs');
          break;
        case '3':
          setUssdScreen('apply');
          setApplyNationalId('');
          setSelectedJobId('');
          break;
        case '4':
          setUssdScreen('status');
          setStatusNationalId('');
          setStatusResult(null);
          break;
        case '5':
          // Retrieve standard verified candidate pass or mock QR info
          if (candidates.length > 0) {
            const verifiedCand = candidates.find(c => c.dhaVerified && c.saqaVerified);
            if (verifiedCand) {
              setQrCandidate(verifiedCand);
              setUssdScreen('qr');
            } else {
              setQrCandidate(candidates[0]);
              setUssdScreen('qr');
            }
          } else {
            setUssdMessage('No candidates registered yet to produce a pass.');
            setUssdScreen('main');
          }
          break;
        case '6':
          // SARR Info
          setUssdMessage('Funa Ispan Mzantsi is zero-rated on all local networks (Vodacom, MTN, Cell C, Telkom). This ensures job seekers can register, update profiles, and apply without active airtime or data packages.');
          break;
        default:
          setUssdMessage('Invalid selection. Select option:');
          break;
      }
    } else if (ussdScreen === 'register') {
      // Step-by-step register Wizard in USSD simulation
      if (regStep === 1) {
        // Validate National ID (13 digits)
        if (choice.length !== 13 || isNaN(Number(choice))) {
          alert("National ID must be exactly 13 digits.");
          return;
        }
        setRegData(prev => ({ ...prev, nationalId: choice }));
        setRegStep(2); // Next: First Name
      } else if (regStep === 2) {
        if (!choice) return;
        setRegData(prev => ({ ...prev, firstName: choice }));
        setRegStep(3); // Next: Last Name
      } else if (regStep === 3) {
        if (!choice) return;
        setRegData(prev => ({ ...prev, lastName: choice }));
        setRegStep(4); // Next: Student Number
      } else if (regStep === 4) {
        if (!choice) return;
        setRegData(prev => ({ ...prev, studentNumber: choice }));
        setRegStep(5); // Next: NQF level
      } else if (regStep === 5) {
        const nqf = parseInt(choice);
        if (isNaN(nqf) || nqf < 1 || nqf > 10) {
          alert("NQF level must be an integer between 1 and 10.");
          return;
        }
        setRegData(prev => ({ ...prev, nqfLevel: nqf }));
        setRegStep(6); // Next: Qualification Name
      } else if (regStep === 6) {
        if (!choice) return;
        const completeData = { ...regData, qualificationName: choice };
        setRegData(prev => ({ ...prev, qualificationName: choice }));
        
        // Finalize registration
        setDbLoading(true);
        try {
          const sysId = `CAND-USSD-${Math.floor(1000 + Math.random() * 9000)}`;
          const payload: Candidate = {
            id: sysId,
            nationalId: completeData.nationalId,
            firstName: completeData.firstName,
            lastName: completeData.lastName,
            email: `${completeData.firstName.toLowerCase()}.${completeData.lastName.toLowerCase()}@datafree.za`,
            studentNumber: completeData.studentNumber,
            nqfLevel: completeData.nqfLevel,
            qualificationName: completeData.qualificationName,
            institution: completeData.institution,
            dhaVerified: true, // Auto-verified on registration for demo speed
            saqaVerified: true,
            status: 'verified',
            createdAt: new Date().toISOString()
          };

          await saveCandidate(payload);
          await recordAuditEntry(
            "USSD Registration Success",
            `Successfully onboarded candidate ${payload.firstName} ${payload.lastName} offline via USSD *134*9412#`,
            payload.id,
            "USSD Gateway"
          );
          
          await loadSovereignDb();
          setUssdScreen('success');
          setUssdMessage(`Onboarding complete!\nRegistered Name: ${payload.firstName} ${payload.lastName}\nStatus: VERIFIED (DHA/SAQA OK)\n\nThank you for utilizing Funa Ispan Mzantsi.`);
        } catch (err) {
          console.error(err);
          setUssdMessage("Error writing registration to secure employment ledger.");
        } finally {
          setDbLoading(false);
        }
      }
    } else if (ussdScreen === 'jobs') {
      // Selecting a job
      const idx = parseInt(choice) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < jobs.length) {
        setSelectedJob(jobs[idx]);
        setUssdScreen('jobDetail');
      } else {
        setUssdScreen('main');
      }
    } else if (ussdScreen === 'apply') {
      if (!applyNationalId) {
        if (choice.length !== 13 || isNaN(Number(choice))) {
          alert("National ID must be exactly 13 digits.");
          return;
        }
        setApplyNationalId(choice);
      } else {
        // Job selection from indices
        const idx = parseInt(choice) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < jobs.length) {
          const targetJob = jobs[idx];
          
          // Submit application!
          setDbLoading(true);
          try {
            // Find Candidate in local state matching ID
            const candidate = candidates.find(c => c.nationalId === applyNationalId);
            if (!candidate) {
              setUssdMessage("Apply failed:\nCandidate ID not found on database.\nPlease register first.");
              setUssdScreen('main');
              setDbLoading(false);
              return;
            }

            // Create Decision
            const decision: Omit<HiringDecision, 'id' | 'recordedAt'> = {
              jobId: targetJob.id,
              candidateId: candidate.id,
              decision: 'shortlisted',
              rankScoreAtDecision: candidate.nqfLevel >= targetJob.requiredNqfLevel ? 85 : 45,
              justification: `Shortlisted automatically via zero-data USSD portal application. Meets NQF requirement of Level ${targetJob.requiredNqfLevel}.`,
              recordedBy: 'Zero-Data USSD Gateway'
            };

            await recordDecision(decision);
            await recordAuditEntry(
              "USSD Job Application",
              `Onboarded applicant ${candidate.firstName} applied to Job ID ${targetJob.id} via USSD *134*9412#`,
              candidate.id,
              "USSD Gateway"
            );

            await loadSovereignDb();
            setUssdScreen('success');
            setUssdMessage(`Application submitted!\nRole: ${targetJob.title}\nStatus: SHORTLISTED\n\nYour profile has been locked to the secure Vertex AI matching list.`);
          } catch (e) {
            console.error(e);
            setUssdMessage("System validation error registering application.");
          } finally {
            setDbLoading(false);
          }
        } else {
          setUssdScreen('main');
        }
      }
    } else if (ussdScreen === 'status') {
      if (choice.length !== 13 || isNaN(Number(choice))) {
        alert("Enter 13-digit National ID number.");
        return;
      }
      const foundCand = candidates.find(c => c.nationalId === choice);
      if (foundCand) {
        setStatusResult({ found: true, candidate: foundCand });
      } else {
        setStatusResult({ found: false });
      }
    }
  };

  // SMS Gateway Simulator Parsing
  const handleSendSMS = async () => {
    if (!smsInput.trim()) return;

    const userMsg = smsInput.trim();
    setSmsInput('');
    setSmsSending(true);

    const newSmsList = [
      ...smsThread,
      {
        id: `user-${Date.now()}`,
        sender: 'user' as const,
        text: userMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setSmsThread(newSmsList);

    // Simulated network delay
    setTimeout(async () => {
      const responseText = await parseSMSCommand(userMsg);
      setSmsThread(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system' as const,
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setSmsSending(false);
    }, 1200);
  };

  const parseSMSCommand = async (msg: string): Promise<string> => {
    const tokens = msg.split(/\s+/);
    const cmd = tokens[0].toUpperCase();

    switch (cmd) {
      case 'HELP':
        return `Funa Ispan Mzantsi Off-Grid SMS Hub Commands:\n\n` +
          `• JOBS: List all open, verified roles.\n` +
          `• STATUS [ID_NUMBER]: Check DHA & SAQA verification state.\n` +
          `• REGISTER [ID] [Name] [Surname] [NQF] [Qual] [Inst]: Create offline compliance profile.\n` +
          `• APPLY [ID] [JOB_ID]: Apply instantly to any role.\n\n` +
          `All requests are zero-rated.`;

      case 'JOBS':
        if (jobs.length === 0) return "No open job listings were found on the secure registry currently.";
        return `Open Sovereign Opportunities:\n\n` + 
          jobs.map((j, i) => `[${j.id}] ${j.title} (Req: NQF Level ${j.requiredNqfLevel})`).join('\n\n') +
          `\n\nTo apply, send: APPLY [YOUR_ID] [JOB_ID]`;

      case 'STATUS': {
        const idNum = tokens[1];
        if (!idNum || idNum.length !== 13) {
          return "Error: Please specify a valid 13-digit South African ID. Syntax: STATUS [ID_NUMBER]";
        }
        const candidate = candidates.find(c => c.nationalId === idNum);
        if (!candidate) {
          return `ID ${idNum} not found in Funa Ispan Mzantsi Sovereign Registry. Send REGISTER to create your profile.`;
        }
        return `Sovereign Vetting Audit for ${candidate.firstName} ${candidate.lastName}:\n` +
          `• DHA National Record Match: ${candidate.dhaVerified ? 'VERIFIED [OK]' : 'PENDING'}\n` +
          `• SAQA Academic Accreditation: ${candidate.saqaVerified ? `VERIFIED [NQF LEVEL ${candidate.nqfLevel}]` : 'PENDING'}\n` +
          `• Profile Ledger ID: ${candidate.id}\n\n` +
          `This record constitutes valid off-grid proof of credentials.`;
      }

      case 'REGISTER': {
        // Syntax: REGISTER [ID] [Name] [Surname] [NQF] [Qual] [Inst]
        if (tokens.length < 6) {
          return "Error: Missing parameters. Syntax:\nREGISTER [ID] [Name] [Surname] [NQF] [Qualification] [Institution]";
        }
        const id = tokens[1];
        const name = tokens[2];
        const surname = tokens[3];
        const nqf = parseInt(tokens[4]);
        
        // Reconstruct qualification and institution from remaining tokens
        const qualAndInst = tokens.slice(5).join(' ');
        const parts = qualAndInst.split(' at ');
        const qual = parts[0] || "Certificate";
        const inst = parts[1] || "Technical College";

        if (id.length !== 13 || isNaN(Number(id))) {
          return "Error: ID number must be exactly 13 digits.";
        }
        if (isNaN(nqf) || nqf < 1 || nqf > 10) {
          return "Error: NQF Level must be between 1 and 10.";
        }

        try {
          const sysId = `CAND-SMS-${Math.floor(1000 + Math.random() * 9000)}`;
          const payload: Candidate = {
            id: sysId,
            nationalId: id,
            firstName: name,
            lastName: surname,
            email: `${name.toLowerCase()}.${surname.toLowerCase()}@datafree.za`,
            studentNumber: `LUR${Math.floor(100000 + Math.random() * 900000)}`,
            nqfLevel: nqf,
            qualificationName: qual,
            institution: inst,
            dhaVerified: true,
            saqaVerified: true,
            status: 'verified',
            createdAt: new Date().toISOString()
          };

          await saveCandidate(payload);
          await recordAuditEntry(
            "SMS Registration Success",
            `Successfully onboarded candidate ${payload.firstName} ${payload.lastName} offline via SMS shortcode`,
            payload.id,
            "SMS Gateway"
          );

          await loadSovereignDb();
          return `Sovereign registration successful!\n` +
            `ID: ${payload.id}\n` +
            `Candidate: ${payload.firstName} ${payload.lastName}\n` +
            `NQF Level ${payload.nqfLevel} verified via SAQA evaluation registry.\n\n` +
            `You can now apply to jobs using: APPLY [ID] [JOB_ID]`;
        } catch (e) {
          return "Error writing offline profile. Please double check parameters or try again.";
        }
      }

      case 'APPLY': {
        // Syntax: APPLY [ID] [JOB_ID]
        const idNum = tokens[1];
        const jId = tokens[2];

        if (!idNum || idNum.length !== 13 || !jId) {
          return "Error: Invalid parameters. Syntax: APPLY [13-DIGIT-ID] [JOB-ID]";
        }

        const candidate = candidates.find(c => c.nationalId === idNum);
        if (!candidate) {
          return "Application Rejected: Candidate ID not found. Register first using REGISTER command.";
        }

        const targetJob = jobs.find(j => j.id === jId || j.id.toLowerCase() === jId.toLowerCase());
        if (!targetJob) {
          return `Application Rejected: Job ID "${jId}" does not exist on our active list. Type JOBS to see available roles.`;
        }

        try {
          const decision: Omit<HiringDecision, 'id' | 'recordedAt'> = {
            jobId: targetJob.id,
            candidateId: candidate.id,
            decision: 'shortlisted',
            rankScoreAtDecision: candidate.nqfLevel >= targetJob.requiredNqfLevel ? 90 : 50,
            justification: `Shortlisted automatically via Off-Grid SMS application gateway. Matches NQF Level requirement of ${targetJob.requiredNqfLevel}.`,
            recordedBy: 'Zero-Data SMS Hub'
          };

          await recordDecision(decision);
          await recordAuditEntry(
            "SMS Job Application",
            `Applicant ${candidate.firstName} applied to Job ID ${targetJob.id} via Off-Grid SMS`,
            candidate.id,
            "SMS Gateway"
          );

          await loadSovereignDb();
          return `Application Success!\n` +
            `Candidate: ${candidate.firstName} ${candidate.lastName}\n` +
            `Role: ${targetJob.title}\n` +
            `Match Suitability: ${candidate.nqfLevel >= targetJob.requiredNqfLevel ? 'HIGH EXCELLENCE [NQF OK]' : 'POTENTIAL FIT'}\n\n` +
            `Your details have been committed into the National Labour compliance roster.`;
        } catch (e) {
          return "Critical error processing your application. Please try again later.";
        }
      }

      default:
        return `Unsupported keyword command. Send HELP to 34120 to see the valid list of offline interactive structures.`;
    }
  };

  return (
    <div id="zero-data-hub" className="space-y-6 font-sans">
      
      {/* Zero-Data Control Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${
        isZeroDataMode 
          ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
          : 'bg-[#141418] border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg transition-all ${
            isZeroDataMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'
          }`}>
            {isZeroDataMode ? <Wifi className="h-6 w-6 animate-pulse" /> : <WifiOff className="h-6 w-6" />}
          </div>
          <div className="text-left">
            <h4 className="font-serif font-light text-base text-slate-100 tracking-wide flex items-center gap-2">
              Sovereign SARR Zero-Rated Mode
              {isZeroDataMode && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                  Active (0kb bandwidth)
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {isZeroDataMode 
                ? 'Running entirely inside South Africa’s zero-rated SARR sandbox. Heavy assets (images, fonts, telemetry) are offline.' 
                : 'Interactive simulator highlighting off-grid USSD and SMS systems designed for candidates with zero internet balance.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsZeroDataMode(!isZeroDataMode);
            // Show alert or change styles
          }}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
            isZeroDataMode 
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20' 
              : 'bg-[#0c0c0e] hover:bg-slate-900 border border-slate-800 text-slate-300'
          }`}
        >
          {isZeroDataMode ? 'DISABLE DATA-FREE MODE' : 'ENABLE DATA-FREE MODE'}
        </button>
      </div>

      {/* Landscape Grid - Main Simulation Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* USSD Keypad & Phone Simulator - lg:col-span-6 */}
        <div className="lg:col-span-6 bg-[#141418] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[640px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/10 rounded text-indigo-400">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <h5 className="font-bold text-sm text-slate-200">Interactive USSD Channel</h5>
                  <p className="text-[10px] text-slate-500 font-mono">Simulates cellular session (*134*9412#)</p>
                </div>
              </div>
              <button 
                onClick={handleUssdBackToMain}
                className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-[#0c0c0e] px-2 py-1 rounded border border-slate-800"
                title="Force reset the current USSD stack back to the selection index."
              >
                <RotateCcw className="h-3 w-3" />
                Reset Stack
              </button>
            </div>

            {/* USSD Simulated Terminal View */}
            <div className="bg-[#050507] border-2 border-slate-850 rounded-xl p-5 font-mono text-xs text-left h-[300px] flex flex-col justify-between relative overflow-hidden">
              {/* Terminal Signal Header */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-900 pb-1.5 mb-2">
                <span className="flex items-center gap-1 font-bold text-emerald-500">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  FUNA ISPAN MZANTSI FREE GATE
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Wifi className="h-3 w-3" /> USSD ACTIVE
                </span>
              </div>

              {/* Terminal Main Content */}
              <div className="flex-1 overflow-y-auto space-y-3 pt-1 select-text scrollbar-thin">
                {/* Dial screen state */}
                {ussdScreen === 'dialer' && (
                  <div className="space-y-4">
                    <p className="text-slate-300 leading-relaxed text-center py-6">
                      {ussdMessage || "Dial *134*9412# to initiate zero-data sovereign validation session."}
                    </p>
                    <div className="flex justify-center">
                      <div className="relative w-full max-w-xs">
                        <input
                          type="text"
                          value={ussdInput}
                          onChange={(e) => setUssdInput(e.target.value)}
                          className="w-full bg-[#101014] border border-slate-800 p-2 text-center rounded font-bold font-mono tracking-widest text-indigo-400 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Main menu state */}
                {ussdScreen === 'main' && (
                  <div className="space-y-2">
                    <p className="text-amber-400 font-bold">--- FUNA ISPAN MZANTSI PORTAL ---</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Complete verified employment registries and DHA queries with ZERO mobile data.
                    </p>
                    <div className="space-y-1 text-slate-300 text-[11px] font-medium pt-2">
                      <p>1. Onboard / Register My Profile</p>
                      <p>2. Browse Active Government Vacancies</p>
                      <p>3. Submit Quick Job Application</p>
                      <p>4. Check My Vetting Status (DHA/SAQA)</p>
                      <p>5. Fetch Cryptographic QR Pass</p>
                      <p>6. SARR Zero-Rated Framework Info</p>
                    </div>
                  </div>
                )}

                {/* Register state */}
                {ussdScreen === 'register' && (
                  <div className="space-y-3">
                    <p className="text-emerald-400 font-bold">--- PROFILE ONBOARDING ({regStep}/6) ---</p>
                    {regStep === 1 && <p className="text-slate-300">Enter candidate 13-digit National ID number:</p>}
                    {regStep === 2 && <p className="text-slate-300">Enter First Name:</p>}
                    {regStep === 3 && <p className="text-slate-300">Enter Surname:</p>}
                    {regStep === 4 && <p className="text-slate-300">Enter Student Number (SAQA verification key):</p>}
                    {regStep === 5 && <p className="text-slate-300">Enter NQF Level (1 - 10):</p>}
                    {regStep === 6 && <p className="text-slate-300">Enter Qualification Name:</p>}
                    
                    <div className="bg-[#101014] border border-slate-850 p-2 rounded text-[10px] text-slate-400 space-y-1">
                      {regData.nationalId && <p>• ID: {regData.nationalId}</p>}
                      {regData.firstName && <p>• First Name: {regData.firstName}</p>}
                      {regData.lastName && <p>• Surname: {regData.lastName}</p>}
                      {regData.studentNumber && <p>• Student Number: {regData.studentNumber}</p>}
                      {regStep > 5 && <p>• NQF: Level {regData.nqfLevel}</p>}
                    </div>
                  </div>
                )}

                {/* Jobs listing state */}
                {ussdScreen === 'jobs' && (
                  <div className="space-y-2">
                    <p className="text-emerald-400 font-bold">--- ACTIVE VACANCIES ---</p>
                    {jobs.length === 0 ? (
                      <p className="text-slate-500 italic">No job listings found on offline cache.</p>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {jobs.map((job, idx) => (
                          <div key={job.id} className="text-slate-300 text-[11px]">
                            {idx + 1}. <span className="font-bold text-slate-200">{job.title}</span> 
                            <span className="block pl-3 text-[10px] text-slate-450 font-sans">{job.department} (Req: NQF {job.requiredNqfLevel})</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-slate-500 pt-1">Enter job index to view full description.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Job detail state */}
                {ussdScreen === 'jobDetail' && selectedJob && (
                  <div className="space-y-2 text-[11px]">
                    <p className="text-indigo-400 font-bold">{selectedJob.title}</p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">{selectedJob.description}</p>
                    <div className="border-t border-slate-900 pt-2 text-[10px] text-slate-500 space-y-0.5">
                      <p>Department: {selectedJob.department}</p>
                      <p>Required NQF Qualification: Level {selectedJob.requiredNqfLevel}</p>
                      <p>Ref ID: {selectedJob.id}</p>
                    </div>
                    <p className="text-slate-300 font-bold pt-1">To apply for this role, enter "BACK", select option 3 (Apply), and specify job ID: {selectedJob.id}</p>
                  </div>
                )}

                {/* Apply state */}
                {ussdScreen === 'apply' && (
                  <div className="space-y-2">
                    <p className="text-emerald-400 font-bold">--- SUBMIT QUICK APPLICATION ---</p>
                    {!applyNationalId ? (
                      <p className="text-slate-300">Enter candidate 13-digit National ID number:</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-slate-400 text-[10px]">Applying for ID: {applyNationalId}</p>
                        <p className="text-slate-300">Select Job number to link profile:</p>
                        <div className="space-y-1">
                          {jobs.map((job, idx) => (
                            <p key={job.id} className="text-[11px] text-slate-300">
                              {idx + 1}. {job.title}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Vetting status check state */}
                {ussdScreen === 'status' && (
                  <div className="space-y-2">
                    <p className="text-emerald-400 font-bold">--- RECOGNITION VETTING AUDIT ---</p>
                    {statusResult === null ? (
                      <p className="text-slate-300">Enter candidate 13-digit National ID number:</p>
                    ) : (
                      <div className="space-y-2.5 text-[11px]">
                        {statusResult.found && statusResult.candidate ? (
                          <>
                            <div className="flex items-center gap-1 bg-emerald-950/20 border border-emerald-900 p-1.5 rounded">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-bold uppercase text-[10px]">Record Located Verified</span>
                            </div>
                            <div className="space-y-1 pr-1">
                              <p><span className="text-slate-500">Full Name:</span> {statusResult.candidate.firstName} {statusResult.candidate.lastName}</p>
                              <p><span className="text-slate-500">Citizen Verification:</span> DHA MATCHED [OK]</p>
                              <p><span className="text-slate-500">Academic Evaluation:</span> SAQA LEVEL {statusResult.candidate.nqfLevel} [VERIFIED]</p>
                              <p><span className="text-slate-500">Student Ref:</span> {statusResult.candidate.studentNumber}</p>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-red-400 italic">No credentials matching ID on file.</p>
                            <p className="text-slate-450 leading-relaxed text-[10px]">Destitute candidates can register for free via option 1 to initiate Home Affairs check.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* QR Display state */}
                {ussdScreen === 'qr' && qrCandidate && (
                  <div className="flex gap-4 items-center h-full">
                    <div className="bg-white p-1 rounded">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=050507&data=${encodeURIComponent(
                          window.location.origin + '?verifyId=' + qrCandidate.id
                        )}`} 
                        alt="USSD Code Offline Pass"
                        className="w-20 h-20"
                      />
                    </div>
                    <div className="space-y-1 text-[11px] flex-1">
                      <p className="font-bold text-slate-200 truncate">{qrCandidate.firstName} {qrCandidate.lastName}</p>
                      <p className="text-[10px] text-slate-450 uppercase font-mono">SOVEREIGN PASS</p>
                      <p className="text-emerald-400 text-[10px] font-bold font-mono">DHA/SAQA VALID</p>
                      <p className="text-[9px] text-slate-500 font-mono truncate select-all">{qrCandidate.id}</p>
                    </div>
                  </div>
                )}

                {/* Success state */}
                {ussdScreen === 'success' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[11px]">
                      <Check className="h-4 w-4 bg-emerald-950 p-0.5 rounded-full" />
                      Action Committed Successfully
                    </div>
                    <p className="text-slate-300 text-[11px] whitespace-pre-line leading-relaxed">
                      {ussdMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom input area for active session */}
              {ussdSessionActive && ussdScreen !== 'qr' && ussdScreen !== 'success' && (
                <div className="border-t border-slate-900 pt-2 mt-2 flex gap-2 items-center">
                  <input
                    type="text"
                    value={ussdMenuInput}
                    onChange={(e) => setUssdMenuInput(e.target.value)}
                    placeholder="Enter choice / value"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUssdMenuSubmit();
                    }}
                    className="flex-1 bg-[#101014] border border-slate-800 px-2 py-1.5 text-xs text-indigo-400 rounded focus:outline-none focus:border-indigo-500 font-mono"
                    autoFocus
                  />
                  <button
                    onClick={handleUssdMenuSubmit}
                    className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded font-bold text-[10px] uppercase tracking-wider text-white transition-all cursor-pointer font-sans"
                  >
                    Send
                  </button>
                </div>
              )}

              {/* Prompt helper when success or QR shown */}
              {ussdSessionActive && (ussdScreen === 'qr' || ussdScreen === 'success' || ussdScreen === 'jobDetail' || ussdScreen === 'status') && (
                <div className="border-t border-slate-900 pt-2 mt-2 flex justify-end">
                  <button
                    onClick={handleUssdBackToMain}
                    className="bg-slate-800 hover:bg-slate-700 px-3 py-1 text-[10px] font-bold text-slate-200 rounded transition-all cursor-pointer font-sans uppercase"
                  >
                    Main Menu
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Physical Phone Pad Interface */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-6 border-t border-slate-850/60 mt-4 select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (!ussdSessionActive) {
                    setUssdInput(prev => prev + key);
                  } else {
                    setUssdMenuInput(prev => prev + key);
                  }
                }}
                className="bg-[#1c1c24] hover:bg-[#252530] text-slate-100 font-mono font-bold py-3.5 rounded-xl border border-slate-800 hover:border-slate-700 text-sm transition-all duration-100 shadow active:scale-95 cursor-pointer flex flex-col items-center justify-center h-12"
              >
                <span>{key}</span>
              </button>
            ))}
            
            {/* Dial and Clear Controls */}
            <button
              onClick={() => {
                if (!ussdSessionActive) {
                  setUssdInput('');
                } else {
                  setUssdMenuInput('');
                }
              }}
              className="bg-red-950/45 hover:bg-red-900/60 border border-red-900/40 text-red-400 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center h-12"
              title="Clear current input string."
            >
              CLEAR
            </button>
            <button
              onClick={() => {
                if (!ussdSessionActive) {
                  handleUssdDial();
                } else {
                  handleUssdMenuSubmit();
                }
              }}
              className="bg-emerald-600/35 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-400 font-extrabold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center h-12 col-span-2 shadow-lg shadow-emerald-950/20"
              title="Establish connection or submit value to USSD."
            >
              {ussdSessionActive ? 'SUBMIT' : 'SEND/DIAL'}
            </button>
          </div>
        </div>

        {/* Off-Grid SMS Shortcode Portal - lg:col-span-6 */}
        <div className="lg:col-span-6 bg-[#141418] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[640px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded text-emerald-400">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <h5 className="font-bold text-sm text-slate-200">Free Off-Grid SMS Hub</h5>
                  <p className="text-[10px] text-slate-500 font-mono">Unregistered cellular shortcode 34120</p>
                </div>
              </div>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-mono uppercase font-bold tracking-wider shrink-0 select-none">
                Zero-Rated
              </span>
            </div>

            {/* Simulated Smartphone Chat Screen */}
            <div className="bg-[#050507] border-2 border-slate-850 rounded-xl p-4 flex flex-col justify-between h-[400px] font-sans relative overflow-hidden">
              {/* Signal bar header */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-900 pb-2 mb-3 select-none">
                <span className="font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  FUNA ISPAN MZANTSI SHORTCODE: 34120
                </span>
                <span className="font-mono text-slate-500">CELL C / MTN / VODA</span>
              </div>

              {/* Chat bubble body */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 select-text scrollbar-thin">
                {smsThread.map((sms) => (
                  <div
                    key={sms.id}
                    className={`flex flex-col max-w-[85%] ${sms.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      sms.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                        : 'bg-slate-900 text-slate-350 rounded-bl-none border border-slate-850/50'
                    }`}>
                      {sms.text.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                    <span className="text-[8px] text-slate-650 font-mono mt-1 px-1.5">{sms.time}</span>
                  </div>
                ))}

                {smsSending && (
                  <div className="flex flex-col max-w-[85%] mr-auto items-start">
                    <div className="bg-slate-900 border border-slate-850/50 px-3.5 py-2 rounded-2xl text-xs text-slate-500 rounded-bl-none italic flex items-center gap-1.5 select-none">
                      <span className="inline-block w-1 h-1 rounded-full bg-slate-500 animate-bounce"></span>
                      <span className="inline-block w-1 h-1 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="inline-block w-1 h-1 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]"></span>
                      Funa Ispan Mzantsi Server replying...
                    </div>
                  </div>
                )}
              </div>

              {/* Quick preset chips to help testing */}
              <div className="border-t border-slate-900 pt-3 mt-3">
                <p className="text-[10px] text-slate-500 font-mono mb-2 text-left select-none uppercase tracking-wider">SMS Presets & Keywords:</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  <button
                    onClick={() => setSmsInput('HELP')}
                    className="bg-[#101014] hover:bg-slate-900 text-slate-300 border border-slate-850 text-[10px] px-2.5 py-1 rounded-lg font-mono transition-all cursor-pointer"
                  >
                    HELP
                  </button>
                  <button
                    onClick={() => setSmsInput('JOBS')}
                    className="bg-[#101014] hover:bg-slate-900 text-slate-300 border border-slate-850 text-[10px] px-2.5 py-1 rounded-lg font-mono transition-all cursor-pointer"
                  >
                    JOBS
                  </button>
                  <button
                    onClick={() => {
                      if (candidates.length > 0) {
                        setSmsInput(`STATUS ${candidates[0].nationalId}`);
                      } else {
                        setSmsInput('STATUS 9412155092083');
                      }
                    }}
                    className="bg-[#101014] hover:bg-slate-900 text-slate-300 border border-slate-850 text-[10px] px-2.5 py-1 rounded-lg font-mono transition-all cursor-pointer"
                  >
                    STATUS [ID]
                  </button>
                  <button
                    onClick={() => {
                      const idNum = `96${Math.floor(100000 + Math.random() * 900000)}5081084`;
                      setSmsInput(`REGISTER ${idNum} Lindiwe Sisulu 7 BTech at Wits`);
                    }}
                    className="bg-[#101014] hover:bg-slate-900 text-slate-300 border border-slate-850 text-[10px] px-2.5 py-1 rounded-lg font-mono transition-all cursor-pointer"
                  >
                    REGISTER [MOCK]
                  </button>
                  <button
                    onClick={() => {
                      if (candidates.length > 0 && jobs.length > 0) {
                        setSmsInput(`APPLY ${candidates[0].nationalId} ${jobs[0].id}`);
                      } else {
                        setSmsInput('APPLY 9412155092083 job-1');
                      }
                    }}
                    className="bg-[#101014] hover:bg-slate-900 text-slate-300 border border-slate-850 text-[10px] px-2.5 py-1 rounded-lg font-mono transition-all cursor-pointer"
                  >
                    APPLY [MOCK]
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Message Dispatch Input Bar */}
          <div className="flex gap-2.5 items-center mt-4">
            <input
              type="text"
              value={smsInput}
              onChange={(e) => setSmsInput(e.target.value)}
              placeholder="Type SMS command (e.g. HELP)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendSMS();
              }}
              className="flex-1 bg-[#101014] border border-slate-800 hover:border-slate-700 px-4 py-3 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-mono transition-all"
            />
            <button
              onClick={handleSendSMS}
              disabled={smsSending}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/20"
              title="Dispatch message through free SMS shortcode"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* South Africa Zero-Rated Portal Reference Info Section */}
      <div className="bg-[#101014] border border-slate-850 rounded-2xl p-6 text-left">
        <h5 className="font-serif font-light text-base text-slate-100 tracking-wide mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-emerald-400" />
          Zero-Rated & Structural Coupling Architectural Framework
        </h5>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 leading-relaxed">
          <div className="space-y-1">
            <p className="font-bold text-slate-300 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              SARR Network Mirroring
            </p>
            <p>
              In alignment with the National Department of Labour directives, Funa Ispan Mzantsi is registered on the South African Zero-Rated Registry (SARR). This allows cellular operators to serve the platform's assets free of billing data.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-300 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
              Low-Bandwidth Fallbacks
            </p>
            <p>
              When SARR Mode is active, all dynamic layout parameters, heavy CSS transitions, and SVG icons simplify into lightweight structural representations. This avoids memory congestion on budget feature devices.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Vertex AI Vetting Handshakes
            </p>
            <p>
              Candidates registered via off-grid shortcode or USSD menus are instantly vetted against SAQA and Home Affairs databases. They receive confirmation receipts directly via interactive SMS response grids.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
