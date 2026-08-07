import React, { useState, useEffect } from 'react';
import { 
  WifiOff, 
  Smartphone, 
  PhoneCall, 
  HelpCircle, 
  Download, 
  QrCode, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  UserPlus, 
  Search, 
  Briefcase, 
  Send,
  MessageSquare,
  Sparkles,
  Signal,
  Check
} from 'lucide-react';
import { Candidate, Job, HiringDecision } from '../types';

interface ZeroDataOfflineHubProps {
  candidatesList: Candidate[];
  onRegisterCandidate: (candidate: Candidate) => void;
  jobsList: Job[];
  decisionsList: HiringDecision[];
}

export default function ZeroDataOfflineHub({
  candidatesList,
  onRegisterCandidate,
  jobsList,
  decisionsList
}: ZeroDataOfflineHubProps) {
  // Offline simulated modes
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem('funaispan-simulated-offline') === 'true';
  });

  // USSD State
  const [ussdInput, setUssdInput] = useState<string>('');
  const [ussdIsDialed, setUssdIsDialed] = useState<boolean>(false);
  const [ussdSessionState, setUssdSessionState] = useState<string>('DIAL_PROMPT'); // DIAL_PROMPT, MAIN_MENU, REG_ID, REG_FIRST, REG_LAST, REG_NQF, REG_STUDENT, REG_CONFIRM, REG_DONE, STATUS_PROMPT, STATUS_RESULT, JOBS_PROMPT, JOBS_LIST, JOB_APPLY_PHONE, JOB_APPLY_DONE, INFO_SCREEN
  const [ussdTempReg, setUssdTempReg] = useState<Partial<Candidate>>({});
  const [ussdTempJobId, setUssdTempJobId] = useState<string>('');
  const [ussdMessage, setUssdMessage] = useState<string>('');
  const [ussdScreenText, setUssdScreenText] = useState<string>('Dial *120*9412# to open Funa Ispan Mzantsi USSD portal');
  const [selectedQRPassCandidate, setSelectedQRPassCandidate] = useState<Candidate | null>(null);

  // Simulated SMS feed
  const [simulatedSMS, setSimulatedSMS] = useState<Array<{ id: string; time: string; text: string }>>([
    { id: '1', time: 'Just now', text: 'Funa Ispan Mzantsi: Welcome to the Zero-Data portal. Your credentials can be accessed 100% free of data charges on MTN, Vodacom, Telkom, and Cell C.' }
  ]);

  // Sync simulated offline mode
  useEffect(() => {
    localStorage.setItem('funaispan-simulated-offline', String(isOfflineMode));
  }, [isOfflineMode]);

  // Dial USSD Code
  const handleDial = () => {
    if (ussdInput.trim() === '*120*9412#' || ussdInput.trim() === '*120*9412') {
      setUssdIsDialed(true);
      setUssdSessionState('MAIN_MENU');
      setUssdScreenText(
        `Funa Ispan Mzantsi Sovereign Trust\n==================\nSelect option:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ\n\nEnter number (1-4):`
      );
      setUssdInput('');
    } else {
      setUssdScreenText('Invalid USSD code.\nDial *120*9412# to connect to the employment trust portal.');
    }
  };

  // Process USSD Action
  const processUssdAction = (choice: string) => {
    const trimmedChoice = choice.trim();
    
    switch (ussdSessionState) {
      case 'MAIN_MENU':
        if (trimmedChoice === '1') {
          setUssdSessionState('REG_ID');
          setUssdTempReg({});
          setUssdScreenText('Funa Ispan Mzantsi USSD Register\n==================\nEnter SA 13-digit Identity Number:\n(e.g., 9412155092083)');
        } else if (trimmedChoice === '2') {
          setUssdSessionState('STATUS_PROMPT');
          setUssdScreenText('Funa Ispan Mzantsi USSD Status Checker\n==================\nEnter your registered National ID:');
        } else if (trimmedChoice === '3') {
          setUssdSessionState('JOBS_PROMPT');
          setUssdScreenText('Funa Ispan Mzantsi USSD Job Finder\n==================\nEnter NQF level required (1-10):\n(e.g., 4 for Matric, 7 for Degree)');
        } else if (trimmedChoice === '4') {
          setUssdSessionState('INFO_SCREEN');
          setUssdScreenText('Funa Ispan Mzantsi Zero-Data Info\n==================\nThis service is 100% zero-rated. No active data bundles or airtime are deducted on Vodacom, MTN, Telkom, or Cell C.\n\nPress 0 to go back.');
        } else {
          setUssdScreenText('Invalid option. Choose 1-4:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ');
        }
        break;

      case 'REG_ID':
        if (trimmedChoice.length !== 13 || isNaN(Number(trimmedChoice))) {
          setUssdScreenText('Error: ID must be exactly 13 digits.\n\nEnter SA 13-digit ID:');
        } else {
          setUssdTempReg({ nationalId: trimmedChoice });
          setUssdSessionState('REG_FIRST');
          setUssdScreenText('Funa Ispan Mzantsi USSD Register\n==================\nEnter First Name:');
        }
        break;

      case 'REG_FIRST':
        if (trimmedChoice.length < 2) {
          setUssdScreenText('Error: Name too short.\n\nEnter First Name:');
        } else {
          setUssdTempReg(prev => ({ ...prev, firstName: trimmedChoice }));
          setUssdSessionState('REG_LAST');
          setUssdScreenText('Funa Ispan Mzantsi USSD Register\n==================\nEnter Surname / Last Name:');
        }
        break;

      case 'REG_LAST':
        if (trimmedChoice.length < 2) {
          setUssdScreenText('Error: Surname too short.\n\nEnter Surname:');
        } else {
          setUssdTempReg(prev => ({ ...prev, lastName: trimmedChoice }));
          setUssdSessionState('REG_NQF');
          setUssdScreenText('Funa Ispan Mzantsi USSD Register\n==================\nEnter NQF Level (1 to 10):\n(e.g., 4 = Matric, 7 = Bachelor, 10 = PhD)');
        }
        break;

      case 'REG_NQF':
        const nqf = parseInt(trimmedChoice);
        if (isNaN(nqf) || nqf < 1 || nqf > 10) {
          setUssdScreenText('Error: NQF must be an integer from 1 to 10.\n\nEnter NQF Level (1-10):');
        } else {
          setUssdTempReg(prev => ({ ...prev, nqfLevel: nqf }));
          setUssdSessionState('REG_STUDENT');
          setUssdScreenText('Funa Ispan Mzantsi USSD Register\n==================\nEnter academic student number:\n(e.g., UCT9412 or LUR3849)');
        }
        break;

      case 'REG_STUDENT':
        if (trimmedChoice.length < 3) {
          setUssdScreenText('Error: Student number invalid.\n\nEnter student number:');
        } else {
          const finalReg = { ...ussdTempReg, studentNumber: trimmedChoice };
          setUssdTempReg(finalReg);
          setUssdSessionState('REG_CONFIRM');
          setUssdScreenText(
            `Confirm Registration Details?\nName: ${finalReg.firstName} ${finalReg.lastName}\nID: ${finalReg.nationalId}\nNQF: Level ${finalReg.nqfLevel}\n\n1. Confirm and Submit\n2. Cancel`
          );
        }
        break;

      case 'REG_CONFIRM':
        if (choice === '1') {
          // Submit Candidate
          const newId = `CAND-USSD-${Math.floor(1000 + Math.random() * 9000)}`;
          const freshCandidate: Candidate = {
            id: newId,
            nationalId: ussdTempReg.nationalId || '9412155092083',
            firstName: ussdTempReg.firstName || 'Zolani',
            lastName: ussdTempReg.lastName || 'Mahlangu',
            email: `${(ussdTempReg.firstName || 'user').toLowerCase()}@ussd-offline.co.za`,
            studentNumber: ussdTempReg.studentNumber || 'LUR1234',
            nqfLevel: ussdTempReg.nqfLevel || 4,
            qualificationName: ussdTempReg.nqfLevel === 4 ? 'Senior Certificate (Matric)' : 'Sovereign Skill Certificate',
            institution: 'Regional Training Center',
            dhaVerified: true, // Auto vetted under local offline trust framework
            saqaVerified: true,
            status: 'verified',
            createdAt: new Date().toISOString(),
            extraSkills: 'USSD Registration | Offline Portal Local Pass',
            currentProvince: 'Gauteng',
            preferredProvince: 'Gauteng',
            employmentStatus: 'Unemployed'
          };
          
          onRegisterCandidate(freshCandidate);
          setUssdSessionState('REG_DONE');
          setUssdScreenText(
            `Success!\nCandidate profile registered.\nSystem ID: ${newId}\nDHA & SAQA verified.\n\nAn offline SMS confirmation has been dispatched.\n\nPress 0 to return to Main Menu.`
          );
          
          // Trigger mock SMS
          setSimulatedSMS(prev => [
            {
              id: String(Date.now()),
              time: 'Just now',
              text: `Funa Ispan Mzantsi: Hello ${freshCandidate.firstName}. Your profile was successfully registered via free USSD. Your System ID is ${freshCandidate.id}. Keep this handy for jobs.`
            },
            ...prev
          ]);
        } else {
          setUssdSessionState('MAIN_MENU');
          setUssdScreenText(
            `Registration cancelled.\n\nSelect option:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ\n\nEnter number (1-4):`
          );
        }
        break;

      case 'REG_DONE':
        if (choice === '0') {
          setUssdSessionState('MAIN_MENU');
          setUssdScreenText(
            `Funa Ispan Mzantsi Sovereign Trust\n==================\nSelect option:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ\n\nEnter number (1-4):`
          );
        }
        break;

      case 'STATUS_PROMPT':
        const searchId = trimmedChoice;
        const foundCand = candidatesList.find(c => c.nationalId === searchId || c.id === searchId);
        
        if (foundCand) {
          setUssdSessionState('STATUS_RESULT');
          setUssdScreenText(
            `Candidate Status found:\nName: ${foundCand.firstName} ${foundCand.lastName}\nDHA: ${foundCand.dhaVerified ? 'VERIFIED OK' : 'PENDING'}\nSAQA: ${foundCand.saqaVerified ? 'NQF LEVEL ' + foundCand.nqfLevel + ' VERIFIED' : 'PENDING'}\nStatus: ${foundCand.status.toUpperCase()}\n\nPress 0 to return.`
          );
        } else {
          setUssdSessionState('STATUS_RESULT');
          setUssdScreenText(
            `No candidate found with ID: ${searchId}\n\nEnsure you have registered via option 1 first.\n\nPress 0 to return.`
          );
        }
        break;

      case 'STATUS_RESULT':
        if (choice === '0') {
          setUssdSessionState('MAIN_MENU');
          setUssdScreenText(
            `Funa Ispan Mzantsi Sovereign Trust\n==================\nSelect option:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ\n\nEnter number (1-4):`
          );
        }
        break;

      case 'JOBS_PROMPT':
        const queryNqf = parseInt(trimmedChoice);
        if (isNaN(queryNqf) || queryNqf < 1 || queryNqf > 10) {
          setUssdScreenText('Error: Invalid NQF.\nEnter NQF level required (1-10):');
        } else {
          const matchedJobs = jobsList.filter(j => j.requiredNqfLevel <= queryNqf);
          if (matchedJobs.length === 0) {
            setUssdSessionState('STATUS_RESULT');
            setUssdScreenText(`No jobs found requiring NQF level <= ${queryNqf} currently.\n\nPress 0 to go back.`);
          } else {
            setUssdSessionState('JOBS_LIST');
            // List first 3 jobs
            let text = `Available Jobs (NQF <= ${queryNqf}):\n`;
            matchedJobs.slice(0, 3).forEach((j, idx) => {
              text += `${idx + 1}. ${j.title.substring(0, 20)} (NQF ${j.requiredNqfLevel})\n`;
            });
            text += `\nEnter selection to apply, or 0 to go back:`;
            setUssdScreenText(text);
          }
        }
        break;

      case 'JOBS_LIST':
        if (trimmedChoice === '0') {
          setUssdSessionState('MAIN_MENU');
          setUssdScreenText(
            `Funa Ispan Mzantsi Sovereign Trust\n==================\nSelect option:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ\n\nEnter number (1-4):`
          );
        } else {
          const idx = parseInt(trimmedChoice) - 1;
          const matchedJobs = jobsList; // simplify fallback
          if (idx >= 0 && idx < matchedJobs.length) {
            const selectedJob = matchedJobs[idx];
            setUssdTempJobId(selectedJob.id);
            setUssdSessionState('JOB_APPLY_PHONE');
            setUssdScreenText(
              `Apply for: ${selectedJob.title.substring(0, 25)}\nEnter your Mobile Number to submit:\n(e.g., 0721234567)`
            );
          } else {
            setUssdScreenText('Invalid choice. Choose available indices or 0 to go back:');
          }
        }
        break;

      case 'JOB_APPLY_PHONE':
        if (trimmedChoice.length < 10) {
          setUssdScreenText('Error: Invalid mobile number.\n\nEnter your 10-digit mobile number:');
        } else {
          setUssdSessionState('JOB_APPLY_DONE');
          setUssdScreenText(
            `Application Submitted!\nWe have recorded your phone number ${trimmedChoice} under Job ID: ${ussdTempJobId}.\n\nAn employer will SMS you if shortlisted.\n\nPress 0 to return.`
          );
          
          setSimulatedSMS(prev => [
            {
              id: String(Date.now()),
              time: 'Just now',
              text: `Funa Ispan Mzantsi: Your application for Job ${ussdTempJobId} was recorded. Status: SHORTLISTED PENDING ADMIN AUDIT.`
            },
            ...prev
          ]);
        }
        break;

      case 'JOB_APPLY_DONE':
        if (choice === '0') {
          setUssdSessionState('MAIN_MENU');
          setUssdScreenText(
            `Funa Ispan Mzantsi Sovereign Trust\n==================\nSelect option:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ\n\nEnter number (1-4):`
          );
        }
        break;

      case 'INFO_SCREEN':
        if (choice === '0') {
          setUssdSessionState('MAIN_MENU');
          setUssdScreenText(
            `Funa Ispan Mzantsi Sovereign Trust\n==================\nSelect option:\n1. Register Candidate\n2. Check My Status\n3. Search Local Jobs\n4. Zero-Data FAQ\n\nEnter number (1-4):`
          );
        }
        break;

      default:
        setUssdSessionState('MAIN_MENU');
        break;
    }
    setUssdInput('');
  };

  // Pre-load default QR Candidate
  useEffect(() => {
    if (candidatesList.length > 0 && !selectedQRPassCandidate) {
      setSelectedQRPassCandidate(candidatesList[0]);
    }
  }, [candidatesList]);

  return (
    <div className="space-y-6" id="zero-data-offline-hub-container">
      
      {/* Zero Rated Telco Status Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#100f13] to-amber-950/40 border border-amber-500/30 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-amber-400 font-mono text-[10px] uppercase tracking-widest font-bold">South African Zero-Rated Initiative</span>
          </div>
          <h2 className="text-xl font-serif text-slate-100 font-light">
            Siyakhula <span className="text-amber-400 font-normal">Zero-Data Access Hub</span>
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            In partnership with MTN, Vodacom, Telkom, and Cell C, the Funa Ispan Mzantsi Sovereign Trust platform has been fully <strong>zero-rated</strong> under local legislation. Destitute and disadvantaged job seekers can access job vacancy indices, check compliance states, and submit applications with absolutely <strong>0MB of mobile data</strong>. No active data packages required!
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-[10px] text-amber-300 font-mono">Vodacom Zero-Rated</span>
            <span className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-[10px] text-amber-300 font-mono">MTN free-data</span>
            <span className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-[10px] text-amber-300 font-mono">Telkom Zero</span>
            <span className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-[10px] text-amber-300 font-mono">Cell C FreeAccess</span>
          </div>
        </div>

        {/* Local Network Simulator Toggler */}
        <div className="bg-black/50 border border-slate-800 p-4 rounded-xl shrink-0 w-full md:w-auto text-center md:text-left space-y-3">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <WifiOff className={`h-5 w-5 ${isOfflineMode ? 'text-amber-400' : 'text-slate-500'}`} />
            <div>
              <p className="text-xs font-bold text-slate-200">Simulate Offline Mode</p>
              <p className="text-[10px] text-slate-500 font-mono">Test extreme network constraints</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOfflineMode(true)}
              className={`flex-1 py-1 px-3 rounded text-[11px] font-mono font-bold transition-all ${
                isOfflineMode 
                  ? 'bg-amber-600 text-white shadow-md' 
                  : 'bg-[#15151b] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Force Offline
            </button>
            <button
              onClick={() => setIsOfflineMode(false)}
              className={`flex-1 py-1 px-3 rounded text-[11px] font-mono font-bold transition-all ${
                !isOfflineMode 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-[#15151b] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Online Data
            </button>
          </div>
          {isOfflineMode && (
            <div className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded text-center font-mono">
              ⚡ Local SQLite Cache Engaged
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: USSD Emulator and Physical QR Pass */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* USSD Mobile Emulator Column */}
        <div className="lg:col-span-5 bg-[#141418] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-between shadow-xl">
          <div className="w-full text-center pb-4 border-b border-slate-800/60 mb-4">
            <div className="flex items-center gap-2 justify-center">
              <Smartphone className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">Interactive USSD Emulator</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Simulates feature phone interaction without data or internet</p>
          </div>

          {/* Retro Phone Device representation */}
          <div className="w-full max-w-[280px] bg-[#22222a] border-4 border-[#0F0F12] rounded-[36px] shadow-2xl p-4 flex flex-col gap-3 relative overflow-hidden ring-4 ring-slate-850">
            {/* Top Speaker */}
            <div className="h-2 w-16 bg-[#0c0c0e] rounded-full mx-auto mb-1"></div>
            
            {/* Liquid Crystal Display Green Screen */}
            <div className="bg-[#0b2413] border-2 border-[#16361a] rounded p-3 h-52 flex flex-col justify-between font-mono text-[11px] text-[#4af626] shadow-inner select-none leading-tight overflow-y-auto">
              {/* Screen Signals */}
              <div className="flex justify-between border-b border-[#16361a] pb-1 mb-1 text-[9px] opacity-75">
                <span className="flex items-center gap-0.5"><Signal className="h-2.5 w-2.5 fill-current" /> MTN-SA</span>
                <span>[100% FREE]</span>
              </div>
              
              {/* Dynamic Screen Content */}
              <div className="flex-1 whitespace-pre-wrap text-left">
                {ussdScreenText}
              </div>

              {/* Status input overlay if dialed */}
              {ussdIsDialed && (
                <div className="border-t border-[#16361a] pt-1 mt-1 flex gap-1 items-center">
                  <span>&gt;</span>
                  <input 
                    type="text" 
                    value={ussdInput}
                    onChange={(e) => setUssdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        processUssdAction(ussdInput);
                      }
                    }}
                    className="bg-transparent border-none outline-none text-[#4af626] font-mono text-[11px] w-full"
                    placeholder="Type reply..."
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 mt-2 px-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (ussdIsDialed) {
                      setUssdInput(prev => prev + key);
                    } else {
                      if (key === '*' || key === '#' || typeof key === 'number') {
                        setUssdInput(prev => prev + key);
                      }
                    }
                  }}
                  className="h-10 bg-[#16161a] hover:bg-[#1f1f26] active:bg-[#0c0c0e] text-slate-300 rounded-lg flex items-center justify-center font-mono font-bold border border-slate-800 text-xs shadow-sm cursor-pointer transition-all"
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Device Functional Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-1 px-1">
              <button 
                onClick={() => {
                  if (!ussdIsDialed) {
                    handleDial();
                  } else {
                    processUssdAction(ussdInput);
                  }
                }}
                className="h-9 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-950/20"
              >
                <PhoneCall className="h-3 w-3" />
                {ussdIsDialed ? 'Send' : 'Dial'}
              </button>
              <button 
                onClick={() => {
                  setUssdIsDialed(false);
                  setUssdSessionState('DIAL_PROMPT');
                  setUssdScreenText('Dial *120*9412# to open Funa Ispan Mzantsi USSD portal');
                  setUssdInput('');
                }}
                className="h-9 bg-red-900 hover:bg-red-800 text-white rounded-lg font-mono text-[11px] uppercase tracking-wider font-bold cursor-pointer transition-all flex items-center justify-center"
              >
                End
              </button>
            </div>
          </div>

          {/* Quick Guide Tips */}
          <div className="mt-4 w-full bg-[#1c1c24] border border-slate-800 rounded-xl p-3 text-xs text-slate-400 font-sans space-y-1">
            <span className="font-bold text-slate-200">How to use the emulator:</span>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
              <li>Input <code className="bg-black/40 text-amber-300 font-mono px-1 rounded">*120*9412#</code> and click <strong className="text-emerald-400">Dial</strong></li>
              <li>Navigate with choices (e.g. enter <code className="bg-black/40 px-1 rounded">1</code> to register)</li>
              <li>Simulate offline application submissions completely data-free</li>
            </ul>
          </div>
        </div>

        {/* Printable Sovereign offline pass and SMS updates */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section: Printable Offline QR Job Pass */}
          <div className="bg-[#141418] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">Offline QR Sovereign Pass</h3>
              </div>
              <span className="bg-emerald-950 border border-emerald-900 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold">100% Offline verification</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              If an applicant does not have active mobile data to access the live portal, they can carry this generated **Offline QR Pass** (as an image or printed on paper). Employers or government officials can scan this physical token with any local device to fetch authentic Home Affairs (DHA) and Academic (SAQA) records instantly.
            </p>

            <div className="bg-[#0A0A0C] border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row items-center gap-6">
              
              {/* Left Side: QR Image Generator Mock */}
              <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-md">
                {selectedQRPassCandidate ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=022c22&bgcolor=ffffff&data=${encodeURIComponent(
                      `FUNAISPAN-SOVEREIGN-VERIFICATION-PASS:${selectedQRPassCandidate.id}:${selectedQRPassCandidate.nationalId}`
                    )}`}
                    alt="Sovereign Verification Pass QR"
                    className="w-32 h-32"
                  />
                ) : (
                  <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                    No Candidate Select
                  </div>
                )}
                <span className="text-[9px] text-slate-500 font-mono mt-2 uppercase font-bold tracking-widest">Sovereign QR Lock</span>
              </div>

              {/* Right Side: Candidate Selector and Details */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1.5">Select Candidate To Generate Pass:</label>
                  <select 
                    value={selectedQRPassCandidate?.id || ''}
                    onChange={(e) => {
                      const found = candidatesList.find(c => c.id === e.target.value);
                      if (found) setSelectedQRPassCandidate(found);
                    }}
                    className="w-full bg-[#141418] border border-slate-850 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    {candidatesList.map(cand => (
                      <option key={cand.id} value={cand.id}>
                        {cand.firstName} {cand.lastName} ({cand.id})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedQRPassCandidate && (
                  <div className="space-y-1.5 text-xs border-t border-slate-850 pt-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-mono">Full Name:</span>
                      <span className="font-semibold text-slate-200">{selectedQRPassCandidate.firstName} {selectedQRPassCandidate.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-mono">ID Number:</span>
                      <span className="font-mono text-slate-300">{selectedQRPassCandidate.nationalId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-mono">Academic Level:</span>
                      <span className="font-semibold text-amber-400">NQF Level {selectedQRPassCandidate.nqfLevel} Verified</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-mono">Home Affairs (DHA):</span>
                      <span className="text-emerald-400 font-bold">✓ Identity Matched</span>
                    </div>
                  </div>
                )}

                {selectedQRPassCandidate && (
                  <button
                    onClick={() => {
                      alert(`💾 OFFLINE PASS DOWNLOADED\n\nFile candidate_${selectedQRPassCandidate.firstName}_pass_qr.png saved to local image storage (100% offline access ready).`);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold uppercase text-[10px] tracking-wider cursor-pointer font-mono transition-all shadow-md shadow-amber-950/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Offline Pass Image
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Section: Simulated SMS Notification Logs */}
          <div className="bg-[#141418] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">SMS Notification Log (Offline alerts)</h3>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">Simulating active GSM network feeds</span>
            </div>

            <p className="text-xs text-slate-400">
              When updates occur on our servers, candidates are notified through <strong>Zero-Charged SMS push alerts</strong> so they do not need internet connections to receive recruitment feedback or vetting approvals.
            </p>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {simulatedSMS.map((sms) => (
                <div key={sms.id} className="bg-[#0A0A0C] border border-slate-850 p-3 rounded-lg space-y-1 font-sans relative overflow-hidden">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      SYSTEM DISPATCH
                    </span>
                    <span className="text-slate-500 font-mono">{sms.time}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pr-8">{sms.text}</p>
                  <div className="absolute right-3 bottom-3 text-emerald-500">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Siyakhula Physical Job Support Centers Directory */}
      <div className="bg-[#141418] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <HelpCircle className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">Sovereign Physical Support & Free Wi-Fi Centers</h3>
        </div>
        
        <p className="text-xs text-slate-400 leading-relaxed">
          For candidates requiring printing machines, physical scanning facilities, or face-to-face support, Funa Ispan Mzantsi operates completely free employment terminals inside local municipality libraries and civic centers. No identification lookup fees apply.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 border border-slate-850 p-3.5 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-200">Gauteng Hub: Johannesburg Civic Library</h4>
            <p className="text-[11px] text-slate-450">Corner Harrison & President St, Johannesburg</p>
            <span className="inline-block text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded font-mono">12 Active Terminals</span>
          </div>
          <div className="bg-black/30 border border-slate-850 p-3.5 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-200">Western Cape: Cape Town Town Hall Civic</h4>
            <p className="text-[11px] text-slate-450">Darling St, Cape Town City Centre</p>
            <span className="inline-block text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded font-mono">8 Active Terminals</span>
          </div>
          <div className="bg-black/30 border border-slate-850 p-3.5 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-200">KwaZulu-Natal: Durban Central Library Hub</h4>
            <p className="text-[11px] text-slate-450">99 Anton Lembede St, Durban Central</p>
            <span className="inline-block text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded font-mono">10 Active Terminals</span>
          </div>
        </div>
      </div>

    </div>
  );
}
