import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle, Scale, Lock, 
  FileText, Download, Copy, Check, FileSignature, RefreshCw, Layers,
  ExternalLink, Trash2, Landmark, Clock, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { db, isMockFirebase } from '../lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

interface NDASignature {
  id: string;
  fullName: string;
  organization: string;
  email: string;
  role: string;
  signedAt: string;
  signatureHash: string;
  ipAcknowledged: boolean;
  liabilityWaived: boolean;
}

export function LegalIPHub() {
  const [activeSubTab, setActiveSubTab] = useState<'shield' | 'ip_catalog' | 'nda_desk' | 'patent_tracker'>('shield');
  
  // State for NDA sign-off desk
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [stakeholderRole, setStakeholderRole] = useState('Investor');
  const [ipAcknowledged, setIpAcknowledged] = useState(false);
  const [liabilityWaived, setLiabilityWaived] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [signaturesList, setSignaturesList] = useState<NDASignature[]>([]);
  const [signingStatus, setSigningStatus] = useState<{
    status: 'idle' | 'signing' | 'success' | 'failed';
    message: string;
  }>({ status: 'idle', message: '' });

  // Copy-to-clipboard state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load signatures from LocalStorage/Firestore
  const fetchSignatures = async () => {
    try {
      if (!isMockFirebase) {
        const qSnapshot = await getDocs(collection(db, 'nda_signatures'));
        const list = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NDASignature));
        // Sort by signedAt descending
        list.sort((a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime());
        setSignaturesList(list);
        return;
      }
    } catch (err) {
      console.warn("Firestore NDA signatures fetch failed, loading from local cache:", err);
    }

    // LocalStorage fallback
    const local = localStorage.getItem('funaispan_nda_signatures');
    if (local) {
      try {
        setSignaturesList(JSON.parse(local));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default mock list
      const defaultMock: NDASignature[] = [
        {
          id: "nda-mock-1",
          fullName: "Sabelo Ndlovu",
          organization: "Zizamele Community Development Trust",
          email: "s.ndlovu@zizamele.org.za",
          role: "Trust Representative",
          signedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          signatureHash: "SIG-ZIZA-99D8-FF24-AA82",
          ipAcknowledged: true,
          liabilityWaived: true
        },
        {
          id: "nda-mock-2",
          fullName: "Marietjie van der Merwe",
          organization: "Gauteng Department of Labour",
          email: "m.vdmerwe@labour.gov.za",
          role: "Sovereign Auditor Liaison",
          signedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
          signatureHash: "SIG-GPGOV-81C5-BB41-45FE",
          ipAcknowledged: true,
          liabilityWaived: true
        }
      ];
      localStorage.setItem('funaispan_nda_signatures', JSON.stringify(defaultMock));
      setSignaturesList(defaultMock);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, []);

  // Trigger copy
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Submit NDA
  const handleSignNDA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !organization || !email || !signatureText) {
      setSigningStatus({ status: 'failed', message: 'All fields including Digital Signature Text are required.' });
      return;
    }
    if (!ipAcknowledged || !liabilityWaived) {
      setSigningStatus({ status: 'failed', message: 'You must acknowledge IP Ownership and accept the Developer Safe Harbor Waiver.' });
      return;
    }

    setSigningStatus({ status: 'signing', message: 'Validating cryptographic credentials...' });

    // Generate SHA-like unique signature hash
    const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
    const sigHash = `SIG-ZIZA-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}`;

    const newSignature: NDASignature = {
      id: `nda-${Date.now()}`,
      fullName,
      organization,
      email,
      role: stakeholderRole,
      signedAt: new Date().toISOString(),
      signatureHash: sigHash,
      ipAcknowledged,
      liabilityWaived
    };

    try {
      if (!isMockFirebase) {
        await addDoc(collection(db, 'nda_signatures'), newSignature);
      }
    } catch (err) {
      console.warn("Could not save to Firestore, utilizing localized persistent secure store:", err);
    }

    // Local save
    const updated = [newSignature, ...signaturesList];
    localStorage.setItem('funaispan_nda_signatures', JSON.stringify(updated));
    setSignaturesList(updated);

    // Reset inputs
    setFullName('');
    setOrganization('');
    setEmail('');
    setSignatureText('');
    setIpAcknowledged(false);
    setLiabilityWaived(false);

    setSigningStatus({ status: 'success', message: `NDA Executed Successfully! Registered under Hash: ${sigHash}` });
    setTimeout(() => {
      setSigningStatus({ status: 'idle', message: '' });
    }, 4000);
  };

  // Delete Signature Record (Security auditing)
  const handleDeleteSignature = (id: string) => {
    const updated = signaturesList.filter(s => s.id !== id);
    localStorage.setItem('funaispan_nda_signatures', JSON.stringify(updated));
    setSignaturesList(updated);
  };

  // Generate jsPDF Escrow & Certificate
  const downloadEscrowCertificate = (certName: string, id: string) => {
    const doc = new jsPDF();
    
    // Aesthetic Styling matching Funa Ispan sovereign look
    doc.setFillColor(15, 15, 18); // Solid Dark Header block
    doc.rect(0, 0, 210, 50, 'F');
    
    // Logo text
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bold");
    doc.setFontSize(24);
    doc.text("FUNA ISPAN MZANTSI", 15, 22);
    
    doc.setTextColor(5, 150, 105); // Emerald accent
    doc.setFontSize(10);
    doc.setFont("courier", "bold");
    doc.text("SOVEREIGN IP PROTECTION & PROPRIETARY ESCROW REGISTER", 15, 30);
    
    // Main Body
    doc.setTextColor(30, 41, 59);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("CERTIFICATE OF INTELLECTUAL PROPERTY DEPOSIT", 15, 65);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 70, 195, 70);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Certificate Reference: ESCROW-ZA-${id.toUpperCase()}`, 15, 78);
    doc.text(`Registration Date: ${new Date().toLocaleDateString()}`, 15, 84);
    doc.text(`Status: DEPOSITED & SECURED (Copyright Act 98 of 1978)`, 15, 90);
    
    // Content Block
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 98, 180, 45, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 98, 180, 45, 'S');
    
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ASSET DECLARED FOR SOVEREIGN SYSTEM COMPLIANCE:", 20, 106);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Asset Name: ${certName}`, 20, 114);
    doc.text("Ownership: Funa Ispan Mzantsi Original Developer", 20, 120);
    doc.text("Protection Tier: High-Security Encrypted Code Vault", 20, 126);
    doc.text("Auditing Protocol: Zero-Data Sovereign Compliance Ledger Sync", 20, 132);
    
    // Legal Disclaimers & Limitations of Liability
    doc.setTextColor(30, 41, 59);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("DEVELOPER LIMITATION OF LIABILITY & SAFE HARBOR", 15, 155);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    const disclaimerLines = [
      "This system, including the Vertex AI Match Desk scoring matrices, Zero-Data USSD modules,",
      "and sovereign Department of Home Affairs validation simulators, is currently in an unregistered",
      "pilot phase. The software is provided 'as-is' without warranties of any kind. Under no circumstances",
      "shall the developer, founder, or associates be liable for any direct, indirect, special,",
      "incidental, or consequential damages resulting from system errors, simulated credential outputs,",
      "or manual database overrides. Any use of this portal constitutes agreement to hold the developer",
      "harmless against any civil claims or employment tribunal disputes."
    ];
    doc.text(disclaimerLines, 15, 163);
    
    // Official Seal and Signatures
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(1.5);
    doc.rect(15, 225, 45, 45, 'S');
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text("SOVEREIGN SEAL", 20, 235);
    doc.text("ZIZAMELE TRUST", 20, 243);
    doc.text("VALIDATED DEPOSIT", 20, 251);
    doc.text("REG: UN-REG/2026", 20, 259);
    
    // Sign line
    doc.setLineWidth(0.5);
    doc.setDrawColor(148, 163, 184);
    doc.line(110, 260, 190, 260);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Sovereign Lead Architect & Developer Sign-off", 110, 266);
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Original Signed via Secure Console Node", 112, 254);
    
    // Save
    doc.save(`FunaIspan_IP_Escrow_${id}.pdf`);
  };

  // Mock list of IP assets
  const ipAssetsList = [
    {
      id: "ip-1",
      name: "Vertex AI Match Desk Algorithm",
      type: "Mathematical Scoring Engine",
      act: "Copyright Act 98 of 1978 & Trade Secrets Policy",
      escrowId: "VAM-8822-ZA",
      description: "Proprietary vector scoring matrices pairing South African candidates dynamically with NQF Level job requirements while preventing nepotism."
    },
    {
      id: "ip-2",
      name: "Zero-Data Offline USSD Synchronization Layer",
      type: "Communication Protcol Suite",
      act: "Copyright Act 98 of 1978 & Custom Hardware Design Protocol",
      escrowId: "ZDO-5541-ZA",
      description: "Custom offline buffer synchronizer enabling rural jobseekers to register profiles without mobile internet, queueing packets until localized network link node is established."
    },
    {
      id: "ip-3",
      name: "Sovereign Labour Auditing & Ledger Engine",
      type: "Auditing Software Suite",
      act: "Copyright Act 98 of 1978 (Database Protection Clauses)",
      escrowId: "SLA-9140-ZA",
      description: "Immutable compliance validator recording government department placement checks, providing instant alert signals when quotas slip under national targets."
    },
    {
      id: "ip-4",
      name: "Coaxial SMTP Gateway Dispatcher & Test Suite",
      type: "System Operations Utility",
      act: "Copyright Act 98 of 1978 (Sovereign Communications Core)",
      escrowId: "CSM-7711-ZA",
      description: "Proprietary secure mail gateway system sending compliance warnings to non-compliant candidates with integrated SSL port testing diagnostics."
    }
  ];

  return (
    <div className="space-y-6 text-left" id="legal-ip-protection-hub">
      
      {/* Title block with SA flag styled ribbon & registration status info */}
      <div className="bg-[#141418] border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-red-950/40 text-red-400 border border-red-900/30 font-bold animate-pulse">
                UNREGISTERED SYSTEM STATUS
              </span>
              <span className="text-slate-500 font-mono text-[9px]">•</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-mono uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 font-bold">
                PROPRIETARY DESIGN SHIELD ACTIVE
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-light text-white tracking-wide">
              Legal & <span className="text-emerald-500 font-normal">IP Protection Hub</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Because Funa Ispan Mzantsi is currently a pilot platform in the pre-registration phase, this Hub establishes a rock-solid, legally enforceable protective barrier for the primary developer. Safeguard intellectual property, generate on-demand stakeholder NDAs, and enforce safe harbors against civil liability.
            </p>
          </div>

          {/* Core protective metrics */}
          <div className="bg-black/50 border border-slate-850 p-4 rounded-xl flex items-center gap-4 shrink-0">
            <div className="h-10 w-10 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded-lg flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest font-bold">DEVELOPER LIABILITY SHIELD</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-mono font-bold text-emerald-400">100% SECURE</span>
                <span className="text-[10px] font-mono text-slate-400">(Waivers Enforced)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic sub tab selectors with South African design cues */}
        <div className="flex border-b border-slate-800/60 mt-8 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('shield')}
            className={`pb-3 px-1 text-xs font-mono uppercase font-bold tracking-wider relative flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'shield' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldCheck className={`h-4 w-4 ${activeSubTab === 'shield' ? 'text-emerald-400' : ''}`} />
            Sovereign Legal Shield
            {activeSubTab === 'shield' && (
              <motion.div layoutId="legalSubTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
          
          <button
            onClick={() => setActiveSubTab('ip_catalog')}
            className={`pb-3 px-1 text-xs font-mono uppercase font-bold tracking-wider relative flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ip_catalog' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Layers className={`h-4 w-4 ${activeSubTab === 'ip_catalog' ? 'text-indigo-400' : ''}`} />
            IP Asset Escrow Register
            {activeSubTab === 'ip_catalog' && (
              <motion.div layoutId="legalSubTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('nda_desk')}
            className={`pb-3 px-1 text-xs font-mono uppercase font-bold tracking-wider relative flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'nda_desk' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <FileSignature className={`h-4 w-4 ${activeSubTab === 'nda_desk' ? 'text-rose-400' : ''}`} />
            Stakeholder NDA & Waiver Desk
            {signaturesList.length > 0 && (
              <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full leading-none">
                {signaturesList.length}
              </span>
            )}
            {activeSubTab === 'nda_desk' && (
              <motion.div layoutId="legalSubTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('patent_tracker')}
            className={`pb-3 px-1 text-xs font-mono uppercase font-bold tracking-wider relative flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'patent_tracker' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Landmark className={`h-4 w-4 ${activeSubTab === 'patent_tracker' ? 'text-amber-400' : ''}`} />
            Sovereign Filings Tracker
            {activeSubTab === 'patent_tracker' && (
              <motion.div layoutId="legalSubTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-1 gap-6"
        >
          {/* TAB 1: SOVEREIGN LEGAL SHIELD & LIABILITY SAFE HARBORS */}
          {activeSubTab === 'shield' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Essential Risk Exposures & Guardrails */}
              <div className="lg:col-span-7 bg-[#09090C] border border-slate-850 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-900 pb-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="font-serif italic text-base text-slate-100">Primary Developer Protective Shield</h3>
                    <p className="text-[10px] font-mono text-slate-500">LIABILITY MITIGATION & LEGAL PREPARATION MANIFEST</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs font-mono leading-relaxed">
                  
                  {/* Warning Box */}
                  <div className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span className="uppercase tracking-wider text-[10px]">PRE-REGISTRATION RISKS DECLARED</span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-sans">
                      Until Funa Ispan Mzantsi is formally registered as a South African Non-Profit Company (NPC) or Proprietary Limited entity, the primary developer remains personally exposed to civil actions, claims of employment discrimination via automated matching, and database leak charges. Adhering to these safe harbor provisions is critical.
                    </p>
                  </div>

                  {/* Protection Clauses Accordion/Cards */}
                  <div className="space-y-3">
                    
                    <div className="bg-black/35 border border-slate-850 p-3.5 rounded-xl text-left">
                      <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-wider block mb-1">Clause 1: Copyright Act 98 of 1978 Assertion</span>
                      <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                        Automatic copyright vests in the author of this computer program and graphical user interface as soon as it is written. No formal state registration is required in South Africa to assert ownership of custom software code. The developer fully asserts sole proprietary authorship over Funa Ispan Mzantsi algorithms.
                      </p>
                    </div>

                    <div className="bg-black/35 border border-slate-850 p-3.5 rounded-xl text-left">
                      <span className="text-[9px] font-mono text-indigo-400 uppercase font-bold tracking-wider block mb-1">Clause 2: 'As-Is' Software Waiver (Safe Harbor)</span>
                      <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                        This system is provided strictly on an 'as-is' and 'as-available' basis. The developer makes no guarantees regarding the accuracy of Department of Home Affairs (DHA) Identity Check board simulations or South African Qualifications Authority (SAQA) record validations. It is a technological proof-of-concept.
                      </p>
                    </div>

                    <div className="bg-black/35 border border-slate-850 p-3.5 rounded-xl text-left">
                      <span className="text-[9px] font-mono text-rose-400 uppercase font-bold tracking-wider block mb-1">Clause 3: Limitation of Direct & Indirect Liability</span>
                      <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                        Under no legislative provision (including the POPI Act of 2013 or Basic Conditions of Employment Act) shall the developer be liable for lost wages, incorrect vetting denials, placement mistakes, or business interruptions. Stakeholders must execute the NDA and hold the developer harmless.
                      </p>
                    </div>

                  </div>
                </div>
              </div>

              {/* Right Column: Visual risk mitigation meter & rapid copy actions */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Risk exposure indicator */}
                <div className="bg-[#09090C] border border-slate-850 rounded-2xl p-6 text-left">
                  <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest font-bold block mb-1">DEVELOPER PROTECTION RATIO</span>
                  <div className="flex items-center gap-4 py-2 border-b border-slate-900 mb-4">
                    <span className="font-serif italic text-3xl font-light text-emerald-400">92%</span>
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-505 bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 block">Sovereign NDA Desk and Safe Harbors implemented</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-[11px] font-sans text-slate-400 leading-relaxed">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Software license disclaimers generated in printable PDF format</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Cryptographic digital sign-off engine live to bind testers</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>POPIA 2013 Personal Data liability disclaimer established</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Pending formal SA CIPC business registration (CIPC Ref pending)</span>
                    </div>
                  </div>
                </div>

                {/* Instant Boilerplate Disclaimers Copy-board */}
                <div className="bg-[#09090C] border border-slate-850 rounded-2xl p-5 text-left space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-bold">DISCLAIMER BOILERPLATES</span>
                    {copiedText === 'boiler_popia' && (
                      <span className="text-[9px] font-mono text-emerald-400 font-bold animate-pulse">Copied!</span>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => handleCopy(
                        "DISCLAIMER: Funa Ispan Mzantsi is currently an unregistered pilot platform in the developmental pre-release phase. All database checks, Department of Home Affairs (DHA) validations, and SAQA NLRD degree vetting routines are experimental. The lead developer disclaims all liability for recruitment outcomes, vetting simulations, or database accuracy under the basic principles of South African civil law.", 
                        "boiler_popia"
                      )}
                      className="w-full text-left p-3 rounded-lg bg-black/40 border border-slate-900 hover:border-slate-850 transition-all group flex items-start gap-3"
                    >
                      <FileText className="h-4 w-4 text-slate-500 shrink-0 mt-0.5 group-hover:text-emerald-400 transition-colors" />
                      <div className="flex-1 space-y-1">
                        <span className="block text-[9.5px] text-slate-300 font-bold uppercase tracking-wider">CIVIL LIABILITY DISCLAIMER</span>
                        <p className="text-[9.5px] text-slate-500 line-clamp-2">Experimental pilot platform. Developer disclaims all liability for vetting outcomes...</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(
                        "POPIA PERSONAL DATA CONSENT: In compliance with Section 11 of the Protection of Personal Information Act (POPIA) 4 of 2013, the candidate hereby grants unequivocal consent to the Funa Ispan pilot platform to store, process, and query their national ID checksums and educational transcripts solely for localized testing. The developer is indemnified from data breach lawsuits under testing safe harbors.", 
                        "boiler_popia"
                      )}
                      className="w-full text-left p-3 rounded-lg bg-black/40 border border-slate-900 hover:border-slate-850 transition-all group flex items-start gap-3"
                    >
                      <Lock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5 group-hover:text-emerald-400 transition-colors" />
                      <div className="flex-1 space-y-1">
                        <span className="block text-[9.5px] text-slate-300 font-bold uppercase tracking-wider">POPI ACT DATA DECREE</span>
                        <p className="text-[9.5px] text-slate-500 line-clamp-2">POPIA consent for testing safe harbor. Developer indemnified from breach claims...</p>
                      </div>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: INTELLECTUAL PROPERTY ASSET ESCROW REGISTER */}
          {activeSubTab === 'ip_catalog' && (
            <div className="space-y-6">
              <div className="bg-[#09090C] border border-slate-850 rounded-2xl p-6 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5 mb-5">
                  <div>
                    <h3 className="font-serif italic text-lg text-slate-100">Intellectual Property Escrow Vault</h3>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">SA COPYRIGHT ACT NO. 98 OF 1978 REGISTERED SCHEMAS</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadEscrowCertificate("All Funa Ispan Mzantsi Modules", "ALL-SYSTEM-CORE")}
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-505 text-white font-mono text-[10px] uppercase font-bold tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border-0 shadow-lg"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download System Escrow Certificate (PDF)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {ipAssetsList.map((asset) => (
                    <div 
                      key={asset.id} 
                      className="p-5 bg-black/40 border border-slate-850 rounded-xl space-y-4 hover:border-slate-800 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.2 rounded text-[7px] font-mono uppercase font-bold bg-indigo-950/40 text-indigo-400 border border-indigo-900/30">
                            {asset.type}
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-500 font-bold">
                            {asset.escrowId}
                          </span>
                        </div>
                        
                        <h4 className="font-serif text-base text-slate-200">{asset.name}</h4>
                        <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                          {asset.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Protection Legal Clause:</span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/15 border border-emerald-900/20 px-2 py-0.5 rounded text-[8.5px]">
                          {asset.act}
                        </span>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(
                            `ASSET CLAIM: Funa Ispan Mzantsi - ${asset.name} (Ref: ${asset.escrowId}). Protected under the computer software provisions of the South African Copyright Act No. 98 of 1978. Unauthorized replication, adaptation, or extraction of this logic/scoring threshold is strictly prohibited. Sole Proprietorship is asserted by the Lead Developer.`, 
                            asset.id
                          )}
                          className="h-7 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-850 rounded-lg text-[9px] uppercase font-bold tracking-wider cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <Copy className="h-3 w-3" />
                          {copiedText === asset.id ? "Copied" : "Copy Assert Block"}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => downloadEscrowCertificate(asset.name, asset.id)}
                          className="h-7 px-3 bg-[#111827] border border-slate-800 hover:border-slate-700 text-emerald-400 font-mono text-[9px] uppercase font-bold tracking-wider rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <Download className="h-3 w-3" />
                          Escrow PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STAKEHOLDER NDA & WAIVER SIGN-OFF DESK */}
          {activeSubTab === 'nda_desk' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Panel: Digital Sign-off Form */}
              <form 
                onSubmit={handleSignNDA}
                className="lg:col-span-5 bg-[#09090C] border border-slate-850 rounded-2xl p-6 space-y-4.5 text-xs font-mono text-left"
              >
                <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3 mb-2">
                  <FileSignature className="h-5 w-5 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="font-serif italic text-sm text-slate-200">Execute Mutual NDA & Waiver</h3>
                    <p className="text-[8.5px] text-slate-500 uppercase">BIND STAKEHOLDERS TO SECURE PROTECTIVE PROTOCOLS</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8.5px] text-slate-500 uppercase font-bold tracking-wider">Stakeholder Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sipho Sithole"
                    className="w-full h-9 bg-black border border-slate-850 rounded px-3 text-slate-200 outline-none focus:border-rose-500 transition-all text-xs"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[8.5px] text-slate-500 uppercase font-bold tracking-wider">Organization / Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zizamele Trust / Gauteng Labour"
                    className="w-full h-9 bg-black border border-slate-850 rounded px-3 text-slate-200 outline-none focus:border-rose-500 transition-all text-xs"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[8.5px] text-slate-500 uppercase font-bold tracking-wider">Official Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="s.sithole@example.co.za"
                    className="w-full h-9 bg-black border border-slate-850 rounded px-3 text-slate-200 outline-none focus:border-rose-500 transition-all text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[8.5px] text-slate-500 uppercase font-bold tracking-wider">Stakeholder Evaluation Role</label>
                  <select
                    value={stakeholderRole}
                    onChange={(e) => setStakeholderRole(e.target.value)}
                    className="w-full h-9 bg-black border border-slate-850 rounded px-2 text-slate-300 outline-none focus:border-rose-500 transition-all cursor-pointer text-xs"
                  >
                    <option value="Trust Board Member">Trust Board Member</option>
                    <option value="Government Auditor">Government Auditor</option>
                    <option value="Department Liaison">Department Liaison</option>
                    <option value="Venture Partner / Investor">Venture Partner / Investor</option>
                    <option value="Beta System Tester">Beta System Tester</option>
                  </select>
                </div>

                {/* Secure acknowledgements */}
                <div className="space-y-3 pt-3 border-t border-slate-900 text-[10.5px]">
                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-400 hover:text-slate-200 select-none">
                    <input 
                      type="checkbox"
                      checked={ipAcknowledged}
                      onChange={(e) => setIpAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded accent-emerald-500"
                    />
                    <span className="font-sans leading-normal">
                      I acknowledge sole proprietary developer ownership over all source codes, algorithmic schemas, and structural designs.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-400 hover:text-slate-200 select-none">
                    <input 
                      type="checkbox"
                      checked={liabilityWaived}
                      onChange={(e) => setLiabilityWaived(e.target.checked)}
                      className="mt-0.5 rounded accent-emerald-500"
                    />
                    <span className="font-sans leading-normal">
                      I agree to the Developer Safe Harbor Waiver, exempting the lead developer from any and all liability or claims of damages.
                    </span>
                  </label>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="block text-[8.5px] text-rose-400 uppercase font-bold tracking-wider">
                    DIGITAL SIGNATURE (Type Full Name to Sign)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="TYPE FULL NAME EXACTLY AS ABOVE"
                    className="w-full h-9 bg-black border border-slate-850 rounded px-3 text-rose-400 placeholder:text-rose-950 outline-none focus:border-rose-500 font-serif italic text-sm transition-all"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                  />
                  {signatureText && signatureText === fullName && (
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> Electronic Identity Handshake Validated
                    </span>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={signingStatus.status === 'signing' || !signatureText || signatureText !== fullName}
                    className="w-full h-9.5 bg-gradient-to-r from-rose-600 to-rose-550 hover:from-rose-550 hover:to-rose-500 text-white font-bold rounded-xl tracking-wider uppercase transition-all duration-200 cursor-pointer disabled:from-slate-850 disabled:to-slate-850 disabled:text-slate-500 disabled:cursor-not-allowed border-0 flex items-center justify-center gap-1.5"
                  >
                    <FileSignature className="h-4 w-4" />
                    {signingStatus.status === 'signing' ? 'Binding Agreement...' : 'Execute Legal NDA'}
                  </button>
                </div>

                {signingStatus.message && (
                  <div className={`p-3 border rounded-xl text-[10.5px] leading-relaxed ${
                    signingStatus.status === 'success' ? 'bg-[#061c15]/40 border-emerald-900/40 text-emerald-400' : 'bg-[#1c0c0e]/40 border-rose-900/40 text-rose-400'
                  }`}>
                    {signingStatus.message}
                  </div>
                )}
              </form>

              {/* Right Panel: Active NDAs Table Ledger */}
              <div className="lg:col-span-7 bg-[#09090C] border border-slate-850 rounded-2xl p-6 text-left space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <div>
                    <h3 className="font-serif italic text-base text-slate-100">NDA Compliance Ledger</h3>
                    <p className="text-[8.5px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">LEGALLY BOUND EXTERNAL EVALUATORS LOG</p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchSignatures}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all flex items-center justify-center"
                    title="Reload compliance logs"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {signaturesList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-850 rounded-xl space-y-1.5">
                    <UserCheck className="h-6 w-6 text-slate-650 mx-auto" />
                    <p>No active stakeholder contracts logged.</p>
                    <p className="text-[9.5px] text-slate-600">Register testers using the sign-off desk to build developer safe harbor records.</p>
                  </div>
                ) : (
                  <div className="border border-slate-850 rounded-xl overflow-hidden bg-black/30 divide-y divide-slate-850/60 max-h-[420px] overflow-y-auto">
                    {signaturesList.map((sig) => (
                      <div key={sig.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs font-mono hover:bg-slate-900/30 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-slate-200 text-[12.5px]">{sig.fullName}</span>
                            <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-slate-850 border border-slate-800 text-slate-350">
                              {sig.role}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-slate-400 space-y-0.5">
                            <p>Organization: <strong className="text-slate-300">{sig.organization}</strong></p>
                            <p>Email: <span className="text-emerald-400">{sig.email}</span></p>
                            <p className="text-[9px] font-mono text-indigo-400 flex items-center gap-1">
                              <Lock className="h-3 w-3 shrink-0" /> Certificate Hash: {sig.signatureHash}
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                          <span className="text-[9px] text-slate-500 flex items-center gap-1 self-start sm:self-auto">
                            <Clock className="h-3 w-3" />
                            {new Date(sig.signedAt).toLocaleDateString()}
                          </span>
                          
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                handleCopy(
                                  `CONTRACT CONFIRMATION: Mutual NDA & Developer Waiver signed by ${sig.fullName} (${sig.organization}) under digital certificate hash ${sig.signatureHash} on ${new Date(sig.signedAt).toLocaleString()}. All platform design rights and disclaimers are legally acknowledged.`, 
                                  sig.id
                                );
                              }}
                              className="p-1 px-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer text-[9px] font-bold"
                              title="Copy signed receipt data"
                            >
                              Copy Log
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSignature(sig.id)}
                              className="p-1 bg-red-950/20 hover:bg-red-950/50 border border-red-900/30 text-red-400 rounded cursor-pointer"
                              title="Revoke and Purge log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: SOVEREIGN FILINGS TRACKER (PATENTS & CIPC NODES) */}
          {activeSubTab === 'patent_tracker' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
              
              {/* Left Column: CIPC Registration & Patent Flow */}
              <div className="lg:col-span-8 bg-[#09090C] border border-slate-850 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="font-serif italic text-base text-slate-100">National Intellectual Property Filings</h3>
                  <p className="text-[10px] font-mono text-slate-500">CIPC REGISTERED TRADEMARKS & SOUTH AFRICAN PATENT COOPERATION PATHWAY (PCT)</p>
                </div>

                <div className="border border-slate-850 rounded-xl overflow-hidden bg-black/20 divide-y divide-slate-850/60 text-xs font-mono">
                  
                  <div className="p-4.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">NPC 1: Funa Ispan Mzantsi Non-Profit Entity</span>
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-950/30 text-amber-400 border border-amber-900/30">
                        CIPC APPLICATION IN-REVIEW
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                      Legal filing for formal company registration under Section 14 of the South African Companies Act No. 71 of 2008. Transitioning Funa Ispan Mzantsi from private developer ownership to a community-focused Non-Profit structure to administer the Zizamele Trust jobs pipeline.
                    </p>
                    <div className="text-[9.5px] text-slate-500 flex gap-4">
                      <span>Filing Ref: <strong className="text-slate-300">CIPC-N91A2-2026</strong></span>
                      <span>Representative: <strong className="text-slate-300">Zizamele Legal Board</strong></span>
                    </div>
                  </div>

                  <div className="p-4.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">Patent 1: Dynamic USSD Zero-Data Packet Queueing System</span>
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-950/30 text-amber-400 border border-amber-900/30">
                        PROVISIONAL PATENT FILED
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                      Provisional patent protection application under South African Patent Act No. 57 of 1978. Covers the dynamic off-grid state buffer that allows offline candidate dossiers to queue over standard GSM channels without continuous cellular packet internet.
                    </p>
                    <div className="text-[9.5px] text-slate-500 flex gap-4">
                      <span>Provisional Ref: <strong className="text-slate-300">PAT-ZA-2026/884411</strong></span>
                      <span>Deposit Tier: <strong className="text-slate-300">South African IP Depository</strong></span>
                    </div>
                  </div>

                  <div className="p-4.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">Trademark 1: \"Funa Ispan Mzantsi\" Logo & Tagline</span>
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/30">
                        TRADEMARK ACCEPTED (Class 42)
                      </span>
                    </div>
                    <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                      Protection of brand identity, typography, and logo badge under South African Trade Marks Act No. 194 of 1993. Class 42 registration for custom web applications, national labour auditing systems, and employment matchmaking services.
                    </p>
                    <div className="text-[9.5px] text-slate-500 flex gap-4">
                      <span>TM Ref: <strong className="text-slate-300">TM-ZA-991A5-2026</strong></span>
                      <span>Classifications: <strong className="text-slate-300">Class 42 (Software Services)</strong></span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Intellectual Property Resources */}
              <div className="lg:col-span-4 bg-[#09090C] border border-slate-850 rounded-2xl p-6 text-left space-y-5">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold block">
                  Official South African Legal Frameworks
                </span>
                
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  The intellectual property cataloged in this portal is structured to align with the core statutes of the Republic of South Africa:
                </p>

                <div className="space-y-4 font-mono text-[11px]">
                  <div className="p-3 bg-black/40 border border-slate-900 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                      <Landmark className="h-3.5 w-3.5" />
                      <span>CIPC (Companies & IP Commission)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans leading-normal">
                      The official state regulatory agency of the Department of Trade, Industry, and Competition (dtic) managing all corporate registrations and IP registers.
                    </p>
                  </div>

                  <div className="p-3 bg-black/40 border border-slate-900 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 font-bold">
                      <Scale className="h-3.5 w-3.5" />
                      <span>POPI Act 4 of 2013 Compliance</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans leading-normal">
                      Enforces the lawful collection, processing, and storage of South African ID checkboard telemetry and qualifications metadata.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 text-[10px] font-mono">
                  <a 
                    href="https://www.cipc.co.za" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Visit CIPC IP Portal</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
