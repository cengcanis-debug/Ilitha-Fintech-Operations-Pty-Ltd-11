import React, { useState, useEffect } from 'react';
import { 
  Briefcase, GraduationCap, Award, Search, Plus, Trash2, Edit2, 
  CheckCircle2, AlertCircle, Save, User, Mail, Shield, Check, 
  X, HelpCircle, Loader2, RefreshCw, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate } from '../types';
import { 
  saveCandidate, 
  searchQualificationsSAQA, 
  verifyQualificationSAQA, 
  SaqaQualificationSearchItem,
  getCandidates
} from '../lib/api';
import { handleFirestoreError, OperationType } from '../lib/firebase';

interface WorkExperience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface CandidateProfileSectionProps {
  activeCandidate: Candidate;
  setActiveCandidate: React.Dispatch<React.SetStateAction<Candidate>>;
  onProfileUpdated?: () => void;
  NQF_LEVEL_LABELS: Record<number, string>;
}

export function CandidateProfileSection({
  activeCandidate,
  setActiveCandidate,
  onProfileUpdated,
  NQF_LEVEL_LABELS
}: CandidateProfileSectionProps) {
  // Profiles switcher (for local demo flexibility)
  const [availableCandidates, setAvailableCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  // Form edit states
  const [firstName, setFirstName] = useState(activeCandidate.firstName || '');
  const [lastName, setLastName] = useState(activeCandidate.lastName || '');
  const [email, setEmail] = useState(activeCandidate.email || '');
  const [nationalId, setNationalId] = useState(activeCandidate.nationalId || '');
  const [studentNumber, setStudentNumber] = useState(activeCandidate.studentNumber || '');
  
  // Driving License fields
  const [drivingLicense, setDrivingLicense] = useState(activeCandidate.drivingLicense || 'None');
  const [drivingCodes, setDrivingCodes] = useState(activeCandidate.drivingCodes || '');

  // Work Experience state
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);
  const [expDescription, setExpDescription] = useState('');

  // Skills state
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  // SAQA Search & Education state
  const [qualificationName, setQualificationName] = useState(activeCandidate.qualificationName || '');
  const [institution, setInstitution] = useState(activeCandidate.institution || '');
  const [nqfLevel, setNqfLevel] = useState<number>(activeCandidate.nqfLevel || 4);
  const [isInternational, setIsInternational] = useState<boolean>(activeCandidate.isInternational || false);
  const [originCountry, setOriginCountry] = useState<string>(activeCandidate.originCountry || '');
  const [foreignEvaluationNo, setForeignEvaluationNo] = useState<string>(activeCandidate.foreignEvaluationNo || '');
  const [foreignEvaluationAuthority, setForeignEvaluationAuthority] = useState<string>(activeCandidate.foreignEvaluationAuthority || '');

  // Live SAQA Search States
  const [saqaSearchQuery, setSaqaSearchQuery] = useState('');
  const [saqaSearchResults, setSaqaSearchResults] = useState<SaqaQualificationSearchItem[]>([]);
  const [isSearchingSaqa, setIsSearchingSaqa] = useState(false);
  const [showSaqaDropdown, setShowSaqaDropdown] = useState(false);

  // Verification & Submission states
  const [isVerifyingSaqa, setIsVerifyingSaqa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load candidates for switcher
  const loadCandidatesList = async () => {
    setIsLoadingCandidates(true);
    try {
      const list = await getCandidates();
      setAvailableCandidates(list);
    } catch (err) {
      console.error("Failed to load candidates switcher", err);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    loadCandidatesList();
  }, []);

  // Update form inputs when activeCandidate changes
  useEffect(() => {
    setFirstName(activeCandidate.firstName || '');
    setLastName(activeCandidate.lastName || '');
    setEmail(activeCandidate.email || '');
    setNationalId(activeCandidate.nationalId || '');
    setStudentNumber(activeCandidate.studentNumber || '');
    setDrivingLicense(activeCandidate.drivingLicense || 'None');
    setDrivingCodes(activeCandidate.drivingCodes || '');
    
    setQualificationName(activeCandidate.qualificationName || '');
    setInstitution(activeCandidate.institution || '');
    setNqfLevel(activeCandidate.nqfLevel || 4);
    setIsInternational(activeCandidate.isInternational || false);
    setOriginCountry(activeCandidate.originCountry || '');
    setForeignEvaluationNo(activeCandidate.foreignEvaluationNo || '');
    setForeignEvaluationAuthority(activeCandidate.foreignEvaluationAuthority || '');

    // Parse workHistory string
    if (activeCandidate.workHistory) {
      try {
        const parsed = JSON.parse(activeCandidate.workHistory);
        if (Array.isArray(parsed)) {
          setWorkExperiences(parsed.map((item: any, idx: number) => ({
            id: item.id || `exp-${idx}-${Date.now()}`,
            title: item.title || '',
            company: item.company || '',
            startDate: item.startDate || item.duration?.split(' - ')[0] || '',
            endDate: item.endDate || item.duration?.split(' - ')[1] || '',
            current: item.current || item.duration?.toLowerCase().includes('present') || false,
            description: item.description || ''
          })));
        } else {
          setWorkExperiences([]);
        }
      } catch (e) {
        // Fallback if not stringified JSON (e.g. semicolon separated text)
        const items = activeCandidate.workHistory.split(';').map(s => s.trim()).filter(Boolean);
        setWorkExperiences(items.map((str, idx) => ({
          id: `exp-${idx}-${Date.now()}`,
          title: str,
          company: 'Prior Employer',
          startDate: '',
          endDate: '',
          current: false,
          description: 'Historical work history entry parsed from profile tags.'
        })));
      }
    } else {
      setWorkExperiences([]);
    }

    // Parse extraSkills comma list
    if (activeCandidate.extraSkills) {
      setSkills(activeCandidate.extraSkills.split(',').map(s => s.trim()).filter(Boolean));
    } else {
      setSkills([]);
    }
  }, [activeCandidate]);

  // Handle live SAQA search with debounce-like effect
  useEffect(() => {
    if (!saqaSearchQuery.trim()) {
      setSaqaSearchResults([]);
      setShowSaqaDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingSaqa(true);
      try {
        const results = await searchQualificationsSAQA(saqaSearchQuery);
        setSaqaSearchResults(results);
        setShowSaqaDropdown(results.length > 0);
      } catch (e) {
        console.error("SAQA qualifications search failed", e);
      } finally {
        setIsSearchingSaqa(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [saqaSearchQuery]);

  // Switch to another candidate profile for demo
  const handleSelectCandidate = (candId: string) => {
    const selected = availableCandidates.find(c => c.id === candId);
    if (selected) {
      setActiveCandidate(selected);
      setSuccessMessage(`Loaded profile for ${selected.firstName} ${selected.lastName}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Work Experience Handlers
  const handleAddWorkExperience = () => {
    if (!expTitle || !expCompany) {
      alert("Please supply both Job Title and Employer Company name.");
      return;
    }

    const durationStr = expCurrent ? `${expStartDate} - Present` : `${expStartDate} - ${expEndDate}`;

    const newExp: WorkExperience = {
      id: editingExperienceId || `exp-${Date.now()}`,
      title: expTitle,
      company: expCompany,
      startDate: expStartDate,
      endDate: expCurrent ? '' : expEndDate,
      current: expCurrent,
      description: expDescription
    };

    let updatedList: WorkExperience[];
    if (editingExperienceId) {
      updatedList = workExperiences.map(item => item.id === editingExperienceId ? newExp : item);
    } else {
      updatedList = [...workExperiences, newExp];
    }

    setWorkExperiences(updatedList);
    resetWorkForm();
  };

  const resetWorkForm = () => {
    setExpTitle('');
    setExpCompany('');
    setExpStartDate('');
    setExpEndDate('');
    setExpCurrent(false);
    setExpDescription('');
    setEditingExperienceId(null);
    setShowWorkForm(false);
  };

  const handleEditExperience = (item: WorkExperience) => {
    setEditingExperienceId(item.id);
    setExpTitle(item.title);
    setExpCompany(item.company);
    setExpStartDate(item.startDate);
    setExpEndDate(item.endDate);
    setExpCurrent(item.current);
    setExpDescription(item.description);
    setShowWorkForm(true);
  };

  const handleDeleteExperience = (id: string) => {
    setWorkExperiences(prev => prev.filter(item => item.id !== id));
  };

  // Skills Handlers
  const handleAddSkill = () => {
    const cleanSkill = newSkill.trim();
    if (cleanSkill && !skills.includes(cleanSkill)) {
      setSkills(prev => [...prev, cleanSkill]);
      setNewSkill('');
    }
  };

  const handleDeleteSkill = (skillToDelete: string) => {
    setSkills(prev => prev.filter(s => s !== skillToDelete));
  };

  // SAQA Qualification selection from Search
  const handleSelectSaqaQualification = (item: SaqaQualificationSearchItem) => {
    setQualificationName(item.name);
    setInstitution(item.institution);
    setNqfLevel(item.level);
    setIsInternational(false);
    setShowSaqaDropdown(false);
    setSaqaSearchQuery('');
  };

  // Perform SAQA Verification for Selected qualification
  const triggerSaqaVerification = async () => {
    if (!studentNumber) {
      setErrorMessage("Please input a valid LURITS Student Number before triggering SAQA verification.");
      return;
    }

    setIsVerifyingSaqa(true);
    setErrorMessage(null);
    
    try {
      const response = await verifyQualificationSAQA(
        studentNumber,
        nqfLevel,
        qualificationName,
        institution,
        isInternational,
        originCountry || undefined,
        foreignEvaluationNo || undefined,
        foreignEvaluationAuthority || undefined
      );

      if (response.verified) {
        setActiveCandidate(prev => ({
          ...prev,
          saqaVerified: true,
          nqfLevel: nqfLevel,
          qualificationName: qualificationName,
          institution: institution,
          studentNumber: studentNumber,
          isInternational: isInternational,
          originCountry: originCountry,
          foreignEvaluationNo: foreignEvaluationNo,
          foreignEvaluationAuthority: foreignEvaluationAuthority,
          verifiedAt: new Date().toISOString()
        }));
        setSuccessMessage("Academic Accreditation Verification Success! SAQA registry validated NQF Level standard.");
      } else {
        setErrorMessage(response.reason || "Discrepancy caught. Qualification credentials does not align with SAQA records.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reach South African Qualifications Authority gateway.");
    } finally {
      setIsVerifyingSaqa(false);
    }
  };

  // Save the Entire Profile to Firestore and Sync
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    // Format work history as structured array JSON
    const formattedHistory = workExperiences.map(exp => ({
      title: exp.title,
      company: exp.company,
      duration: exp.current ? `${exp.startDate} - Present` : `${exp.startDate} - ${exp.endDate}`,
      startDate: exp.startDate,
      endDate: exp.endDate,
      current: exp.current,
      description: exp.description
    }));

    const updatedProfile: Candidate = {
      ...activeCandidate,
      firstName,
      lastName,
      email,
      nationalId,
      studentNumber,
      qualificationName,
      institution,
      nqfLevel,
      drivingLicense,
      drivingCodes,
      isInternational,
      originCountry: isInternational ? originCountry : undefined,
      foreignEvaluationNo: isInternational ? foreignEvaluationNo : undefined,
      foreignEvaluationAuthority: isInternational ? foreignEvaluationAuthority : undefined,
      extraSkills: skills.join(', '),
      workHistory: JSON.stringify(formattedHistory),
      status: activeCandidate.saqaVerified && activeCandidate.dhaVerified ? 'verified' : 'pending'
    };

    try {
      await saveCandidate(updatedProfile);
      setActiveCandidate(updatedProfile);
      setSuccessMessage("Sovereign Candidate Profile saved securely to Cloud Firestore database.");
      
      // Reload switcher list
      await loadCandidatesList();

      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `candidates/${activeCandidate.id}`);
      } catch (errStringified: any) {
        setErrorMessage(`Firestore secure transaction rejected: ${errStringified.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* Interactive Top Banner & Profile Switcher for Compliance Demonstration */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5 shadow-lg">
        <div className="space-y-1.5 max-w-xl">
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
            Sovereign Profile Node
          </span>
          <h2 className="font-serif text-xl md:text-2xl font-light italic text-slate-100">
            Candidate Professional Profile Hub
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Manage your occupational qualifications, certified trade skills, and employment records. Authenticate tertiary qualifications directly against the SAQA NLRD system.
          </p>
        </div>

        {/* Demo Switcher */}
        <div className="bg-black/40 border border-slate-800/80 rounded-lg p-3 shrink-0 flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-semibold">Active Demonstration Profile</label>
          {isLoadingCandidates ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
              <span>Scanning ledger...</span>
            </div>
          ) : (
            <select
              value={activeCandidate.id}
              onChange={(e) => handleSelectCandidate(e.target.value)}
              className="bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none w-52 max-w-full"
            >
              {availableCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.id === 'user-default-1' ? 'Default' : c.status})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-xs flex items-center gap-3"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-xs flex items-center gap-3"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="font-mono">{errorMessage}</span>
        </motion.div>
      )}

      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Personal Info, Skills, Driving Codes */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Canonical Personal Details */}
          <div className="bg-[#141418] border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <User className="h-4.5 w-4.5 text-emerald-500" />
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200 font-semibold">1. Civil Registry Identity</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1" htmlFor="firstName">First Names</label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all"
                  placeholder="e.g. Zolani"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1" htmlFor="lastName">Surname</label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all"
                  placeholder="e.g. Mandela"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1" htmlFor="email">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all"
                  placeholder="zolani@mandela.co.za"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1" htmlFor="nationalId">South African 13-Digit ID</label>
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600" />
                <input
                  id="nationalId"
                  type="text"
                  required
                  maxLength={13}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all font-mono"
                  placeholder="9412155092083"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500">
                {activeCandidate.dhaVerified ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> DHA Registry Confirmed
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Civil verification pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Certified Skills & Trade Accents */}
          <div className="bg-[#141418] border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Award className="h-4.5 w-4.5 text-emerald-500" />
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200 font-semibold">2. Occupational Skills</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">{skills.length} Loaded</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Input trades, computing proficiencies, or machine licenses. These fuel the neural matching index.
            </p>

            {/* Live Tag Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Type a skill (e.g. Forklift, Plumbing)"
                className="flex-1 bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg px-3 py-2 text-xs flex items-center justify-center transition-all duration-150"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Render Skill Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {skills.length === 0 ? (
                <div className="text-xs text-slate-600 italic py-2 w-full text-center border border-dashed border-slate-800 rounded-lg">
                  No occupational skills recorded. Add tags above.
                </div>
              ) : (
                skills.map((skill, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-950 px-2.5 py-1 rounded-md text-xs font-mono"
                  >
                    <span>{skill}</span>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteSkill(skill)}
                      className="hover:text-red-400 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Skills Suggestion Chips */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest block font-semibold">Recommended Trade Skills:</span>
              <div className="flex flex-wrap gap-1">
                {["Electrical", "Bricklaying", "Solder", "Basic Computing", "Tallying", "Safety Officer", "Logistics", "Office Administration", "Retail Support"].map((suggestedSkill) => {
                  const alreadyHas = skills.includes(suggestedSkill);
                  return (
                    <button
                      key={suggestedSkill}
                      type="button"
                      disabled={alreadyHas}
                      onClick={() => setSkills(prev => [...prev, suggestedSkill])}
                      className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-all duration-150 ${
                        alreadyHas 
                          ? 'bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed'
                          : 'bg-[#0A0A0C] border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-950'
                      }`}
                    >
                      + {suggestedSkill}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Driver Licensing */}
          <div className="bg-[#141418] border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Briefcase className="h-4.5 w-4.5 text-emerald-500" />
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200 font-semibold">3. Transport & Licenses</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1" htmlFor="drivingLicense">License Status</label>
                <select
                  id="drivingLicense"
                  value={drivingLicense}
                  onChange={(e) => setDrivingLicense(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="None">No License</option>
                  <option value="Code 8 (Class B)">Code 8 / Class B</option>
                  <option value="Code 10 (Class C1)">Code 10 / Class C1</option>
                  <option value="Code 14 (Class EC)">Code 14 / Class EC</option>
                  <option value="Learners License">Learners License</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1" htmlFor="drivingCodes">Vehicle Codes</label>
                <input
                  id="drivingCodes"
                  type="text"
                  value={drivingCodes}
                  onChange={(e) => setDrivingCodes(e.target.value)}
                  className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all"
                  placeholder="e.g. Code B, EB, C1"
                  disabled={drivingLicense === 'None'}
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Education with SAQA Search, Work History List */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 4: Academic Standing & SAQA API Search Integration */}
          <div className="bg-[#141418] border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200 font-semibold">4. SAQA Verified Education</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                SAQA API Active
              </span>
            </div>

            {/* SAQA SEARCH WIDGET */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-3.5 relative">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-semibold">
                🔍 SAQA NQF registry lookup
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Type in keywords of your degree, certificate, or trade diploma. Select the matching entry from the official SAQA Learners database to automatically align with the NQF.
              </p>

              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  {isSearchingSaqa ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  ) : (
                    <Search className="h-4 w-4 text-slate-600" />
                  )}
                </div>
                <input
                  type="text"
                  value={saqaSearchQuery}
                  onChange={(e) => setSaqaSearchQuery(e.target.value)}
                  placeholder="Search qualifications... (e.g. Engineering, Accounting, Matric)"
                  className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all"
                />

                {/* Search Results Dropdown Overlay */}
                <AnimatePresence>
                  {showSaqaDropdown && saqaSearchResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute z-20 left-0 right-0 mt-1 bg-[#101014] border border-slate-800 rounded-lg shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-900"
                    >
                      {saqaSearchResults.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleSelectSaqaQualification(q)}
                          className="w-full text-left p-3 hover:bg-slate-900/60 transition-colors flex items-start gap-3 text-xs"
                        >
                          <div className="bg-emerald-600/10 text-emerald-400 font-mono text-[10px] font-bold h-6 w-14 rounded border border-emerald-500/20 flex items-center justify-center shrink-0">
                            NQF {q.level}
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="font-semibold text-slate-200">{q.name}</h5>
                            <p className="text-[11px] text-slate-500 font-mono">{q.institution}</p>
                            <span className="text-[9px] text-slate-600 font-mono block uppercase">ID: {q.id} • Field: {q.field}</span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* POPULATED EDUCATION FIELDS */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Qualification Name</label>
                  <input
                    type="text"
                    required
                    value={qualificationName}
                    onChange={(e) => setQualificationName(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                    placeholder="Linked qualification title"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Accredited Institution</label>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                    placeholder="Linked accredited body"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Accredited NQF level</label>
                  <select
                    value={nqfLevel}
                    onChange={(e) => setNqfLevel(Number(e.target.value))}
                    className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                      <option key={level} value={level}>
                        NQF Level {level} - {NQF_LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Student Number / LURITS Code</label>
                  <input
                    type="text"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                    placeholder="e.g. LUR0498321"
                  />
                </div>
              </div>

              {/* International Toggle block */}
              <div className="bg-slate-900/20 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternational}
                    onChange={(e) => setIsInternational(e.target.checked)}
                    className="rounded bg-black border-slate-800 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-slate-300">This is an International or Foreign Qualification</span>
                </label>

                {isInternational && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-850"
                  >
                    <div>
                      <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Origin Country</label>
                      <input
                        type="text"
                        value={originCountry}
                        onChange={(e) => setOriginCountry(e.target.value)}
                        className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                        placeholder="Zimbabwe"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">SAQA Certificate No</label>
                      <input
                        type="text"
                        value={foreignEvaluationNo}
                        onChange={(e) => setForeignEvaluationNo(e.target.value)}
                        className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                        placeholder="DFQE-2026-00382"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Evaluation Authority</label>
                      <input
                        type="text"
                        value={foreignEvaluationAuthority}
                        onChange={(e) => setForeignEvaluationAuthority(e.target.value)}
                        className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                        placeholder="SAQA Foreign Evaluation DFQE"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ACTION TRIGGER: VERIFY AGAINST SAQA REGISTER */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-950/10 border border-emerald-900/30 rounded-xl p-4">
                <div className="text-left">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block">Accreditation Audit Compliance</span>
                  <p className="text-[11px] text-slate-400">Validate tertiary standing with the SAQA registry.</p>
                </div>
                
                {activeCandidate.saqaVerified ? (
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-950 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>NQF APPROVED</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isVerifyingSaqa || !qualificationName}
                    onClick={triggerSaqaVerification}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-2 transition-all shrink-0"
                  >
                    {isVerifyingSaqa ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Verifying SAQA...
                      </>
                    ) : (
                      <>
                        <Shield className="h-3.5 w-3.5" />
                        Verify SAQA Credentials
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Section 5: Work Experience Timeline / Form */}
          <div className="bg-[#141418] border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Briefcase className="h-4.5 w-4.5 text-emerald-500" />
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200 font-semibold">5. Work Experience Timeline</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkForm(!showWorkForm)}
                className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg px-2.5 py-1 text-xs font-mono flex items-center gap-1.5 transition-all"
              >
                {showWorkForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                {showWorkForm ? 'Cancel' : 'Add Experience'}
              </button>
            </div>

            {/* EXPANDABLE WORK HISTORY FORM */}
            <AnimatePresence>
              {showWorkForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-3 overflow-hidden text-xs"
                >
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    {editingExperienceId ? '✏️ Edit Job Experience' : '➕ Record Job Experience'}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-500 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        placeholder="e.g. Electrical Apprentice"
                        className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-500 mb-1">Employer Company</label>
                      <input
                        type="text"
                        value={expCompany}
                        onChange={(e) => setExpCompany(e.target.value)}
                        placeholder="e.g. Eskom Holdings"
                        className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-500 mb-1">Start Date</label>
                      <input
                        type="text"
                        value={expStartDate}
                        onChange={(e) => setExpStartDate(e.target.value)}
                        placeholder="e.g. Jan 2024"
                        className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-500 mb-1">End Date</label>
                      <input
                        type="text"
                        value={expEndDate}
                        onChange={(e) => setExpEndDate(e.target.value)}
                        placeholder="e.g. Dec 2025"
                        disabled={expCurrent}
                        className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-slate-200 disabled:opacity-40"
                      />
                    </div>
                    <div className="pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={expCurrent}
                          onChange={(e) => setExpCurrent(e.target.checked)}
                          className="rounded bg-black border-slate-800 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                        />
                        <span className="text-[11px] text-slate-400">Current Role</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-slate-500 mb-1">Duties / Responsibilities</label>
                    <textarea
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      placeholder="Outline core responsibilities, toolsets, or achievements..."
                      rows={2.5}
                      className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-slate-200 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={resetWorkForm}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded px-3 py-1.5 font-mono"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleAddWorkExperience}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded px-4 py-1.5"
                    >
                      {editingExperienceId ? 'Save Edit' : 'Add to List'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* EXPERIENCE CHRONOLOGY LIST */}
            <div className="relative pl-1 space-y-4">
              {workExperiences.length === 0 ? (
                <div className="text-xs text-slate-600 italic py-4 text-center border border-dashed border-slate-800 rounded-lg">
                  No professional experiences recorded. Populate your timeline above.
                </div>
              ) : (
                <div className="relative border-l border-slate-850 pl-4 space-y-4 pt-1">
                  {workExperiences.map((item, idx) => (
                    <div key={item.id || idx} className="relative group text-xs">
                      {/* Timeline Node */}
                      <span className="absolute -left-[21px] top-1.5 flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                      
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-slate-200 text-sm">{item.title}</h4>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                            <span className="font-bold text-slate-300">{item.company}</span>
                            <span className="text-slate-600 px-1">•</span>
                            <span>{item.startDate} - {item.current ? 'Present' : item.endDate}</span>
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEditExperience(item)}
                            title="Edit"
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExperience(item.id)}
                            title="Delete"
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed bg-slate-900/10 border border-slate-900/40 rounded p-2.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* SECURE SUBMISSION BUTTON BAR */}
        <div className="lg:col-span-12 bg-slate-950 border border-slate-850 rounded-xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Sovereign Cloud Encrypted Node
            </span>
            <p className="text-[11px] text-slate-500">
              Profiles are cryptographically paired and stored under strict POPI Act compliance standards.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-serif font-semibold px-6 py-3 rounded-lg text-sm flex items-center justify-center gap-2.5 tracking-wide shadow-lg hover:shadow-emerald-500/15 duration-200 shrink-0"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Securing to Cloud Firestore...
              </>
            ) : (
              <>
                <Save className="h-4.5 w-4.5" />
                Save & Secure Profile to Firestore
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
