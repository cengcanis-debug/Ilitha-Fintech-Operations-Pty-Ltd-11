import React, { useState, useMemo } from 'react';
import { 
  History, Search, ShieldCheck, Fingerprint, RefreshCw, 
  UserCheck, AlertTriangle, Cpu, HelpCircle, HardDrive, 
  Award, Briefcase, Play, Flame, CheckCircle, Database, Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate, AuditLog } from '../types';

interface CandidateActivityFeedProps {
  candidatesList: Candidate[];
  auditLogs: AuditLog[];
  onTriggerSimulation: (candidateId: string, actionType: string, customDetails?: string) => void;
}

export function CandidateActivityFeed({
  candidatesList,
  auditLogs,
  onTriggerSimulation
}: CandidateActivityFeedProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "registration" | "vetting" | "decision" | "system">("all");
  
  // Simulation selected states
  const [selectedSimCandidateId, setSelectedSimCandidateId] = useState(candidatesList[0]?.id || "");
  const [simActionType, setSimActionType] = useState("BIOMETRIC_CHECK");
  const [customDetailText, setCustomDetailText] = useState("");

  const filteredLogs = useMemo(() => {
    let logs = [...auditLogs];

    // Sort chronologically reverse (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Search query match
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      logs = logs.filter(log => 
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        log.candidateId?.toLowerCase().includes(q)
      );
    }

    // Category match
    if (categoryFilter !== "all") {
      logs = logs.filter(log => {
        const action = log.action.toUpperCase();
        if (categoryFilter === "registration") {
          return action.includes("REGISTER") || action.includes("ONBOARD") || action.includes("INCOMPLETE") || action.includes("CREATE");
        }
        if (categoryFilter === "vetting") {
          return action.includes("VERIFY") || action.includes("VETTING") || action.includes("DHA") || action.includes("SAQA") || action.includes("HANDSHAKE") || action.includes("BIOMETRIC") || action.includes("SWAP");
        }
        if (categoryFilter === "decision") {
          return action.includes("HIRED") || action.includes("SHORTLIST") || action.includes("REJECT") || action.includes("SELECTION") || action.includes("DECISION");
        }
        if (categoryFilter === "system") {
          return action.includes("SYSTEM") || action.includes("LEDGER") || action.includes("HASH") || action.includes("SYNC") || action.includes("RESET");
        }
        return true;
      });
    }

    return logs;
  }, [auditLogs, searchTerm, categoryFilter]);

  // Compute feed summaries
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = auditLogs.filter(l => new Date(l.timestamp).toDateString() === today);
    const criticalLogs = auditLogs.filter(l => {
      const details = l.details.toLowerCase();
      return details.includes("failed") || details.includes("mismatch") || details.includes("discrepancy") || details.includes("override");
    });
    
    return {
      todayCount: todayLogs.length,
      totalCount: auditLogs.length,
      anomalies: criticalLogs.length,
      gatewayHealth: todayLogs.length > 0 ? "99.8%" : "100%"
    };
  }, [auditLogs]);

  const handleRunSimulation = () => {
    if (!selectedSimCandidateId) {
      alert("Please select a candidate profile first to initiate simulation.");
      return;
    }
    const cand = candidatesList.find(c => c.id === selectedSimCandidateId);
    if (!cand) return;

    let details = "";
    if (simActionType === "BIOMETRIC_CHECK") {
      details = `Sovereign Biometric Fingerprint Registry match run for candidate ${cand.firstName} ${cand.lastName}. Active matching handshake confirmed at 100% verification fidelity.`;
    } else if (simActionType === "PERSAL_SYNC") {
      details = `Bilateral Public PERSAL Payroll integration query successfully executed for ID ${cand.nationalId}. Active registration state mapped perfectly to Department of Labour audit anchor.`;
    } else if (simActionType === "POLICE_CLEARANCE") {
      details = `South African Police Service (SAPS) national background criminal record registry queried. Background record status returned: CLEAN / VALIDATED.`;
    } else {
      details = customDetailText.trim() || `Sovereign custom auditing checkpoint logged for ${cand.firstName} ${cand.lastName}. Action marked compliant.`;
    }

    onTriggerSimulation(selectedSimCandidateId, simActionType, details);
    setCustomDetailText("");
    
    // Quick success toast style alert
    const audioObj = new Audio();
    // silent trigger or mock notification
  };

  const getEventBadgeStyles = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("FAIL") || act.includes("MISMATCH") || act.includes("ALERT") || act.includes("ERROR")) {
      return {
        bg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
    if (act.includes("HIRED") || act.includes("DECISION") || act.includes("SUCCESS") || act.includes("VERIFY") || act.includes("OK")) {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        icon: <ShieldCheck className="h-4 w-4" />
      };
    }
    if (act.includes("REGISTER") || act.includes("ONBOARD") || act.includes("CREATE")) {
      return {
        bg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        icon: <UserCheck className="h-4 w-4" />
      };
    }
    if (act.includes("BIOMETRIC") || act.includes("HANDSHAKE") || act.includes("PERSAL") || act.includes("SAPS")) {
      return {
        bg: "bg-amber-500/10 border-amber-500/20 text-amber-500",
        icon: <Fingerprint className="h-4 w-4" />
      };
    }
    return {
      bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      icon: <History className="h-4 w-4" />
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Statistics Widget Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#141418] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest block font-bold text-slate-500">Node Activity Count</span>
            <span className="text-2xl font-serif text-slate-100 font-light tracking-wide mt-1 block">{stats.totalCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Immutable ledger block logs</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#141418] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest block font-bold text-slate-500">Live Handshakes Today</span>
            <span className="text-2xl font-serif text-emerald-400 font-light tracking-wide mt-1 block">{stats.todayCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Automated secure validation queries</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <RefreshCw className="h-5 w-5 animate-spin-slow" />
          </div>
        </div>

        <div className="bg-[#141418] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest block font-bold text-slate-500">Anomalies Detected</span>
            <span className={`text-2xl font-serif ${stats.anomalies > 0 ? "text-amber-500 font-bold" : "text-slate-300 font-light"} tracking-wide mt-1 block`}>{stats.anomalies}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Discrepancies flagged by audit</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#141418] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[9px] font-mono text-slate-550 uppercase tracking-widest block font-bold text-slate-500">Gateway Sync Index</span>
            <span className="text-2xl font-serif text-emerald-400 font-light tracking-wide mt-1 block">{stats.gatewayHealth}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Sovereign API gateway responsiveness</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Server className="h-5 w-5" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left column: Feed list and filters (8 columns) */}
        <div className="lg:col-span-8 bg-[#141418] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-5 flex flex-col">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div className="text-left">
              <h4 className="font-serif font-light text-base text-slate-100 italic tracking-wide">Live Sovereign Ledger Operations Stream</h4>
              <p className="text-xs text-slate-400 mt-1">Real-time chronicle of cryptographically hashed validation procedures and personnel registrations.</p>
            </div>
            
            {/* Quick search input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search ledger blocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded pl-8.5 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-700 outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Filtering Chips bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-900/40 pb-3">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mr-2">Filter category:</span>
            
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all border ${
                categoryFilter === "all" ? "bg-slate-900 text-white border-slate-800" : "text-slate-500 border-transparent hover:text-slate-350"
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setCategoryFilter("registration")}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all border ${
                categoryFilter === "registration" ? "bg-blue-950/40 text-blue-400 border-blue-900/30" : "text-slate-500 border-transparent hover:text-slate-350"
              }`}
            >
              Onboardings
            </button>
            <button
              onClick={() => setCategoryFilter("vetting")}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all border ${
                categoryFilter === "vetting" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30" : "text-slate-500 border-transparent hover:text-slate-350"
              }`}
            >
              DHA / SAQA Vetting
            </button>
            <button
              onClick={() => setCategoryFilter("decision")}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all border ${
                categoryFilter === "decision" ? "bg-amber-950/40 text-amber-500 border-amber-900/30" : "text-slate-500 border-transparent hover:text-slate-350"
              }`}
            >
              Decisions
            </button>
            <button
              onClick={() => setCategoryFilter("system")}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all border ${
                categoryFilter === "system" ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/30" : "text-slate-500 border-transparent hover:text-slate-350"
              }`}
            >
              System / Ledger
            </button>
          </div>

          {/* Activity Events list container */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-500 font-mono text-xs border border-dashed border-slate-850 rounded-xl space-y-2">
                <History className="h-8 w-8 text-slate-700 mx-auto mb-2 animate-pulse" />
                <span>No active ledger blocks found matching constraints.</span>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 text-left border-l border-slate-850 ml-3">
                <AnimatePresence initial={false}>
                  {filteredLogs.map((log) => {
                    const badge = getEventBadgeStyles(log.action);
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="relative group space-y-2 pb-1 border-b border-slate-900/30 last:border-0 pb-4 last:pb-0"
                      >
                        {/* Timeline connector dot */}
                        <div className={`absolute -left-[31px] top-1 h-5 w-5 rounded-full border flex items-center justify-center bg-[#0A0A0C] shadow-sm ${badge.bg}`}>
                          {badge.icon}
                        </div>

                        {/* Top detail log line */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-mono font-bold text-slate-205 text-slate-100 uppercase tracking-wide">
                              {log.action}
                            </span>
                            <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${badge.bg}`}>
                              Block Checked
                            </span>
                          </div>

                          <div className="flex items-center gap-3.5 text-[10px] font-mono text-slate-500">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            <span className="text-slate-600">IP: {log.ipAddress || "127.0.0.1"}</span>
                          </div>
                        </div>

                        {/* Detail text */}
                        <p className="text-xs text-slate-400 font-sans leading-relaxed">
                          {log.details}
                        </p>

                        {/* Bottom technical signatures */}
                        <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-[9px] font-mono text-slate-550 text-slate-500">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-655 font-semibold text-slate-550 uppercase">Operator:</span>
                            <span className="text-slate-400 font-semibold">{log.performedBy || "Auditor-Proxy-Secure"}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 max-w-full">
                            <span className="text-slate-655 uppercase">Cryptographic Signature:</span>
                            <span className="text-slate-450 truncate max-w-[150px] font-bold text-[#E2E8F0]/70" title={log.systemHash}>
                              {log.systemHash}
                            </span>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>

        {/* Right column: Interactive Sandbox Live simulator (4 columns) */}
        <div className="lg:col-span-4 bg-[#141418] border border-slate-800 rounded-xl p-5 shadow-xl space-y-5 text-left relative overflow-hidden">
          {/* Neon background light effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="border-b border-slate-900 pb-3 flex items-center gap-2">
            <div className="h-8 w-8 bg-amber-500/10 rounded border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Flame className="h-4 w-4 animate-pulse text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-150">Vetting Registry Simulation</h4>
              <p className="text-[10px] text-slate-500 block">Inject live verification signals into node ledger</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">
            Simulate secure webhooks and provincial verification channels to test the immediate reactive rendering flow of Department of Labour audit trails.
          </p>

          {/* Form input selection */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Target Candidate Cadet</label>
              <select
                value={selectedSimCandidateId}
                onChange={(e) => setSelectedSimCandidateId(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-slate-850 text-xs text-slate-200 rounded px-3 py-2 font-mono outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
              >
                {candidatesList.length === 0 ? (
                  <option value="">No registered profiles available</option>
                ) : (
                  candidatesList.map(cand => (
                    <option key={cand.id} value={cand.id}>
                      {cand.firstName} {cand.lastName} ({cand.nationalId})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Ledger Action Class</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 px-3 py-2 bg-[#0A0A0C] border border-slate-850 rounded hover:border-slate-800 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="simAction"
                    value="BIOMETRIC_CHECK"
                    checked={simActionType === "BIOMETRIC_CHECK"}
                    onChange={(e) => setSimActionType(e.target.value)}
                    className="accent-amber-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200 font-mono">BIOMETRIC_CHECK_OK</span>
                    <span className="text-[9.5px] text-slate-500">Conduct 1:1 fingerprint face matrix match run</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 px-3 py-2 bg-[#0A0A0C] border border-slate-850 rounded hover:border-slate-800 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="simAction"
                    value="PERSAL_SYNC"
                    checked={simActionType === "PERSAL_SYNC"}
                    onChange={(e) => setSimActionType(e.target.value)}
                    className="accent-amber-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200 font-mono">PERSAL_PAYROLL_SYNC</span>
                    <span className="text-[9.5px] text-slate-500">Query public service employment state codes</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 px-3 py-2 bg-[#0A0A0C] border border-slate-850 rounded hover:border-slate-800 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="simAction"
                    value="POLICE_CLEARANCE"
                    checked={simActionType === "POLICE_CLEARANCE"}
                    onChange={(e) => setSimActionType(e.target.value)}
                    className="accent-amber-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200 font-mono">SAPS_CRIMINAL_VET</span>
                    <span className="text-[9.5px] text-slate-500">Verify clean background national clearance status</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 px-3 py-2 bg-[#0A0A0C] border border-slate-850 rounded hover:border-slate-800 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="simAction"
                    value="CUSTOM_CHECK"
                    checked={simActionType === "CUSTOM_CHECK"}
                    onChange={(e) => setSimActionType(e.target.value)}
                    className="accent-amber-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200 font-mono">CUSTOM_COMPLIANCE_SIGNAL</span>
                    <span className="text-[9.5px] text-slate-500">Write custom auditing parameters</span>
                  </div>
                </label>
              </div>
            </div>

            {simActionType === "CUSTOM_CHECK" && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Custom Auditing Details</label>
                <textarea
                  value={customDetailText}
                  onChange={(e) => setCustomDetailText(e.target.value)}
                  placeholder="e.g. Driver's licence original verification match run with South African National Road Traffic system..."
                  rows={3}
                  className="w-full bg-[#0A0A0C] border border-slate-850 focus:border-amber-500 rounded p-2 text-xs text-slate-200 placeholder-slate-700 outline-none font-mono"
                />
              </div>
            )}

            <button
              onClick={handleRunSimulation}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-sans font-bold uppercase rounded text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
            >
              <Play className="h-4.5 w-4.5 fill-current" />
              <span>Fire Simulation Signal Webhook</span>
            </button>
          </div>

          {/* Secure guidelines warning */}
          <div className="bg-[#1c140d]/40 border border-amber-900/30 rounded-lg p-3 text-[10px] text-slate-400 leading-relaxed font-sans space-y-1.5">
            <span className="text-[9.5px] font-mono font-bold text-amber-500 uppercase tracking-wide block">⚠️ PERSAL & Biometric Privacy Rule</span>
            <p>
              Simulating ledger hits records secure cryptographic checkpoints under mock authority regulations. For official production execution, direct biometric clearance must comply with DPSA and POPIA rules.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
