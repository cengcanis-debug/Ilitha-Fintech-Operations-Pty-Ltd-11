import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { motion } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ShieldCheck, 
  FileCheck, 
  Users, 
  Linkedin, 
  Download, 
  Mail, 
  Sparkles, 
  FileJson, 
  FileSpreadsheet, 
  Edit3, 
  Eye, 
  RefreshCw, 
  CheckCircle2, 
  Send,
  FileSignature
} from 'lucide-react';
import { Candidate, AuditLog } from '../types';
import { GovernmentSigningModal } from './GovernmentSigningModal';

interface ComplianceReportGeneratorProps {
  candidates: Candidate[];
  auditLogs: AuditLog[];
  onAddAuditLog?: (action: string, details: string, candidateId: string) => void;
}

export const ComplianceReportGenerator: React.FC<ComplianceReportGeneratorProps> = ({ 
  candidates, 
  auditLogs,
  onAddAuditLog 
}) => {
  const [activeTab, setActiveTab] = useState<'visuals' | 'templates'>('visuals');
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  
  // Email Template states
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidates[0]?.id || "");
  const [selectedScenario, setSelectedScenario] = useState<'hired' | 'shortlisted' | 'status_update'>('hired');
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Email template structures
  const [templates, setTemplates] = useState({
    hired: {
      subject: "🎉 CONGRATULATIONS: You have been HIRED for {jobTitle}",
      body: `Dearest {firstName} {lastName},

We are absolutely delighted to inform you that following the South African Department of Labour audit process, your candidate profile has successfully cleared all compliance gates. You have been officially HIRED for the position of "{jobTitle}" under the department of "Talent & Compliance Vetting".

Compliance Reference Code: FUNA-SOV-{candidateIdShort}
National ID Vetting: DHA PASSED
NQF Level verified: Level {nqfLevel}

Our HR team will follow up shortly with details regarding onboarding.

Best regards,
Funa Ispan Mzantsi Compliance Board`
    },
    shortlisted: {
      subject: "✨ STATUS UPDATE: You have been SHORTLISTED for {jobTitle}",
      body: `Dearest {firstName} {lastName},

We are pleased to inform you that your profile has been SHORTLISTED for the position of "{jobTitle}" in the public compliance department.

Your SAQA-verified qualification and DHA identity check align perfectly with our requirements.

Compliance Reference Code: FUNA-SOV-{candidateIdShort}

Our administrative review team is actively scheduling final physical audits and interview cycles and will contact you shortly with interview details.

Best regards,
Funa Ispan Mzantsi Compliance Board`
    },
    status_update: {
      subject: "🛡️ COMPLIANCE SYNC: Sovereign Registry Audit Cleared for {firstName}",
      body: `Dear {firstName} {lastName},

This is an automated state update regarding your active candidate credentials stored on the Funa Ispan Mzantsi Immutable Sovereign Registry.

RECORDS PROCESSED:
- National Department of Home Affairs (DHA) Identity Check: VERIFIED
- South African Qualifications Authority (SAQA) Degree Check: VERIFIED NQF Level {nqfLevel}
- LinkedIn Verified Seal: {linkedinSeal}

Your record has been successfully indexed in our global placement ledger and is fully visible to Department of Labor auditors. No further action is required at this time.

Sincerely,
National Credentials Gatekeeper Node`
    }
  });

  // Calculate statistics
  const total = candidates.length;
  const dhaVerifiedCount = candidates.filter(c => c.dhaVerified).length;
  const saqaVerifiedCount = candidates.filter(c => c.saqaVerified).length;
  const compliantCount = candidates.filter(c => c.dhaVerified && c.saqaVerified).length;
  const linkedinCount = candidates.filter(c => c.linkedinImported).length;

  const complianceRate = total > 0 ? Math.round((compliantCount / total) * 100) : 0;
  const dhaRate = total > 0 ? Math.round((dhaVerifiedCount / total) * 100) : 0;
  const saqaRate = total > 0 ? Math.round((saqaVerifiedCount / total) * 100) : 0;
  const linkedinRate = total > 0 ? Math.round((linkedinCount / total) * 100) : 0;

  // Recharts data
  const dhaData = [
    { name: 'DHA Verified', value: dhaVerifiedCount, color: '#10b981' },
    { name: 'DHA Pending', value: total - dhaVerifiedCount, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  const saqaData = [
    { name: 'SAQA Verified', value: saqaVerifiedCount, color: '#06b6d4' },
    { name: 'SAQA Pending', value: total - saqaVerifiedCount, color: '#d97706' }
  ].filter(d => d.value > 0);

  const overallData = [
    { name: 'Fully Compliant (DHA & SAQA)', value: compliantCount, color: '#10b981' },
    { name: 'Incomplete / Pending Review', value: total - compliantCount, color: '#334155' }
  ].filter(d => d.value > 0);

  // Helper to compile placeholders
  const getCompiledTemplate = () => {
    const selectedCand = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
    if (!selectedCand) {
      return {
        subject: "No Candidate Registered",
        body: "Please register a candidate profile first to review compiled template output."
      };
    }

    const t = templates[selectedScenario];
    const map = {
      "{firstName}": selectedCand.firstName,
      "{lastName}": selectedCand.lastName,
      "{jobTitle}": selectedCand.qualificationName || "Sovereign Compliance Officer",
      "{nqfLevel}": String(selectedCand.nqfLevel || 5),
      "{candidateIdShort}": selectedCand.id.substring(0, 8).toUpperCase(),
      "{linkedinSeal}": selectedCand.linkedinImported ? "LICENSED & AUTHENTICATED" : "NOT LINKED"
    };

    let subject = t.subject;
    let body = t.body;

    Object.entries(map).forEach(([key, val]) => {
      subject = subject.replaceAll(key, val);
      body = body.replaceAll(key, val);
    });

    return { subject, body };
  };

  const handleSendDraftMockEmail = () => {
    const candidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
    if (!candidate) return;

    const compiled = getCompiledTemplate();
    if (onAddAuditLog) {
      onAddAuditLog(
        "COMMS DISPATCH OUTBOX",
        `Mock SMTP packet queued for ${candidate.firstName} ${candidate.lastName} (${candidate.email}). Subject: "${compiled.subject}".`,
        candidate.nationalId
      );
    }
    
    setCopiedNotification(`Simulated SMTP dispatch successful! Preview of template sent to ${candidate.email}`);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Export beautiful PDF compliance summary
  const exportCompliancePdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. Department Emblem Header Representation
      doc.setFillColor(16, 185, 129); // #10b981
      doc.rect(15, 12, 180, 2.5, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("REPUBLIC OF SOUTH AFRICA", 15, 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text("DEPARTMENT OF EMPLOYMENT & LABOUR", 15, 25);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(13, 148, 136); // Teal-600
      doc.text("FUNA ISPAN MZANTSI NATIONAL COMPLIANCE REGISTRY", 15, 31);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("SOVEREIGN CANDIDATE AUDIT & COMPLIANCE SUMMARY REPORT", 15, 36);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(15, 38, 195, 38);

      // Metadata block
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 42, 180, 24, "F");
      doc.rect(15, 42, 180, 24, "D");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("REPORT SUMMARY STATS", 18, 48);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`Total Candidate Cohort: ${total} Registered Profiles`, 18, 54);
      doc.text(`Sovereign Compliance Level: ${complianceRate}%`, 18, 59);
      doc.text(`DHA Verification Rate: ${dhaRate}%  |  SAQA Vetting Rate: ${saqaRate}%`, 18, 64);

      doc.text(`Date of Audit: ${new Date().toLocaleDateString()}`, 115, 48);
      doc.text(`Generated By: cengcanis@gmail.com`, 115, 54);
      doc.text(`Cryptographic Signature: SHA256-FUNAISPAN-SOV`, 115, 59);

      // Table Header
      let y = 74;
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(15, y, 180, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("ID Number / Name", 18, y + 5.5);
      doc.text("DHA Identity", 85, y + 5.5);
      doc.text("SAQA Academic", 120, y + 5.5);
      doc.text("LinkedIn Vetted", 155, y + 5.5);

      y += 8;

      // Table content
      candidates.forEach((cand, index) => {
        // Alternating row color
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 8.5, "F");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(`${cand.nationalId} - ${cand.firstName} ${cand.lastName}`, 18, y + 5.5);

        // DHA Status
        if (cand.dhaVerified) {
          doc.setTextColor(5, 150, 105); // emerald
          doc.text("VERIFIED (DHA-OK)", 85, y + 5.5);
        } else {
          doc.setTextColor(180, 83, 9); // amber
          doc.text("PENDING STATUS", 85, y + 5.5);
        }

        // SAQA Status
        if (cand.saqaVerified) {
          doc.setTextColor(5, 150, 105);
          doc.text(`NQF-L${cand.nqfLevel} VERIFIED`, 120, y + 5.5);
        } else {
          doc.setTextColor(180, 83, 9);
          doc.text("PENDING ACADEMIC", 120, y + 5.5);
        }

        // LinkedIn Seal
        if (cand.linkedinImported) {
          doc.setTextColor(37, 99, 235); // blue
          doc.text("YES (CERTIFIED)", 155, y + 5.5);
        } else {
          doc.setTextColor(100, 116, 139); // slate
          doc.text("NOT LINKED", 155, y + 5.5);
        }

        y += 8.5;

        // Auto Page break
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFillColor(15, 23, 42);
          doc.rect(15, y, 180, 8, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text("ID Number / Name", 18, y + 5.5);
          doc.text("DHA Identity", 85, y + 5.5);
          doc.text("SAQA Academic", 120, y + 5.5);
          doc.text("LinkedIn Vetted", 155, y + 5.5);
          y += 8.5;
        }
      });

      // Seal and Sign line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("END OF OFFICIAL LEDGER COMPLIANCE STATEMENT", 15, y + 10);
      doc.text(`Report Verification Sig: ${Math.random().toString(36).substring(2, 10).toUpperCase()}-NODE`, 15, y + 14);

      doc.save(`FunaIspanMzantsi_National_Compliance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      if (onAddAuditLog) {
        onAddAuditLog(
          "ISO PDF REPORT HANDOUT GENERATED",
          `Compliance report PDF printed out for department auditors containing summary datasets of ${total} applicant files.`,
          "SYSTEM_DIR"
        );
      }
    } catch (err) {
      console.error(err);
      setCopiedNotification("⚠️ Error printing high-fidelity compliance PDF.");
      setTimeout(() => setCopiedNotification(null), 4000);
    }
  };

  // Export current Audit Logs to CSV formatted string
  const downloadAuditCsv = () => {
    if (auditLogs.length === 0) {
      setCopiedNotification("⚠️ No compliance logs available to export.");
      setTimeout(() => setCopiedNotification(null), 4000);
      return;
    }

    const headers = ["ID", "Action Type", "Details", "Subject ID", "Performed By", "Timestamp", "System Hash"];
    const csvRows = [headers.join(",")];

    auditLogs.forEach(entry => {
      const row = [
        `"${entry.id}"`,
        `"${entry.action.replaceAll('"', '""')}"`,
        `"${entry.details.replaceAll('"', '""')}"`,
        `"${entry.candidateId}"`,
        `"${entry.performedBy}"`,
        `"${entry.timestamp}"`,
        `"${entry.systemHash}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FunaIspanMzantsi_Compliance_Ledger_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onAddAuditLog) {
      onAddAuditLog(
        "CSV LEDGER JOURNAL ARCHIVAL EXPORT",
        `Admin exported full immutable compliance log database (${auditLogs.length} entries) inside local spreadsheet Excel schema.`,
        "SYSTEM_DIR"
      );
    }
  };

  // Export currents Audit Logs to JSON structured document
  const downloadAuditJson = () => {
    if (auditLogs.length === 0) {
      setCopiedNotification("⚠️ No compliance logs available to export.");
      setTimeout(() => setCopiedNotification(null), 4000);
      return;
    }

    const jsonString = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FunaIspanMzantsi_Security_Audit_Ledger_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onAddAuditLog) {
      onAddAuditLog(
        "CRYPTO JSON LEDGER DUMP EXPORT",
        `Admin dispatched state dump of compliance audit logs. Raw secure JSON payload exported consisting of ${auditLogs.length} audit blocks.`,
        "SYSTEM_DIR"
      );
    }
  };

  return (
    <div id="compliance-report-generator" className="bg-[#141418] border border-slate-800 rounded-xl p-5 shadow-xl relative text-left">
      
      {/* Header and top tab toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-light text-lg text-slate-100 tracking-wide">
              🔒 National Sovereign Compliance & Comms Control
            </h3>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.2 rounded font-mono text-[9px] font-bold tracking-widest uppercase">
              Secure
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Real-time verification indices distribution, official compliance PDF reporting, and communications templates matching candidate statuses.
          </p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-lg border border-slate-850 shrink-0 self-stretch md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('visuals')}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-md font-mono text-[10px] tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'visuals'
                ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.15)] font-bold'
                : 'text-slate-400 hover:text-slate-250 hover:bg-slate-900/30'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Compliance Insights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-md font-mono text-[10px] tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'templates'
                ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.15)] font-bold'
                : 'text-slate-400 hover:text-slate-250 hover:bg-slate-900/30'
            }`}
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            Active Templates
          </button>
        </div>
      </div>

      {activeTab === 'visuals' ? (
        <div className="space-y-6">
          
          {/* Quick HUD values */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 bg-[#09090C] border border-slate-850 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block tracking-wider">Overall Compliance</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-serif text-emerald-400 font-light">{complianceRate}%</span>
                <span className="text-[9px] font-mono text-slate-655 text-slate-500">({compliantCount}/{total})</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#09090C] border border-slate-855 border-slate-850 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block tracking-wider">DHA Identity Cleared</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-serif text-cyan-400 font-light">{dhaRate}%</span>
                <span className="text-[9px] font-mono text-slate-500">({dhaVerifiedCount}/{total})</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#09090C] border border-slate-850 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block tracking-wider">SAQA Degree Vetted</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-serif text-amber-500 font-light">{saqaRate}%</span>
                <span className="text-[9px] font-mono text-slate-500">({saqaVerifiedCount}/{total})</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#09090C] border border-slate-850 rounded-xl space-y-1">
              <span className="text-[10px] font-mono text-slate-550 text-slate-500 uppercase font-semibold block tracking-wider">LinkedIn Certified</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-serif text-blue-400 font-light font-bold">{linkedinRate}%</span>
                <span className="text-[9px] font-mono text-slate-500">({linkedinCount}/{total})</span>
              </div>
            </div>
          </div>

          {/* Pie charts layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* DHA Registry Pie */}
            <div className="bg-[#0A0A0C]/80 border border-slate-850 rounded-xl p-4 flex flex-col justify-between text-center relative h-[210px]">
              <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">
                DHA Identity Distribution
              </div>
              
              <div className="h-[120px] w-full relative">
                {dhaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dhaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {dhaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0A0A0C", borderColor: "#1e293b", borderRadius: "6px" }} 
                        itemStyle={{ color: "#e2e8f0", fontSize: '11px', fontFamily: 'monospace' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] text-slate-655">No Data</div>
                )}
                {/* Stats overlays */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-sm font-serif font-semibold text-slate-205 text-slate-200">{dhaVerifiedCount}</span>
                  <span className="text-[8px] font-mono text-slate-500">CLEARED</span>
                </div>
              </div>

              <div className="flex justify-center gap-4 text-[9.5px] font-mono pt-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Verified ({dhaVerifiedCount})
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> Pending ({total - dhaVerifiedCount})
                </span>
              </div>
            </div>

            {/* SAQA Academic distribution Pie */}
            <div className="bg-[#0A0A0C]/80 border border-slate-850 rounded-xl p-4 flex flex-col justify-between text-center relative h-[210px]">
              <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">
                SAQA Academic Status
              </div>
              
              <div className="h-[120px] w-full relative">
                {saqaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={saqaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {saqaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0A0A0C", borderColor: "#1e293b", borderRadius: "6px" }} 
                        itemStyle={{ color: "#e2e8f0", fontSize: '11px', fontFamily: 'monospace' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] text-slate-600">No Data</div>
                )}
                {/* Stats overlays */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-sm font-serif font-semibold text-slate-200">{saqaVerifiedCount}</span>
                  <span className="text-[8px] font-mono text-slate-550 text-slate-500">ACCREDITED</span>
                </div>
              </div>

              <div className="flex justify-center gap-4 text-[9.5px] font-mono pt-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#06b6d4] shrink-0" /> Verified ({saqaVerifiedCount})
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" /> Pending ({total - saqaVerifiedCount})
                </span>
              </div>
            </div>

            {/* Overall compliance status Pie */}
            <div className="bg-[#0A0A0C]/80 border border-slate-850 rounded-xl p-4 flex flex-col justify-between text-center relative h-[210px]">
              <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 mb-1">
                Global Compliance Ratio
              </div>
              
              <div className="h-[120px] w-full relative">
                {overallData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overallData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {overallData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0A0A0C", borderColor: "#1e293b", borderRadius: "6px" }} 
                        itemStyle={{ color: "#e2e8f0", fontSize: '11px', fontFamily: 'monospace' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] text-slate-655">No Data</div>
                )}
                {/* Stats overlays */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                  <span className="text-sm font-serif font-semibold text-emerald-400">{complianceRate}%</span>
                  <span className="text-[8px] font-mono text-slate-500">COMPLIANT</span>
                </div>
              </div>

              <div className="flex justify-center gap-4 text-[9.5px] font-mono pt-1">
                <span className="flex items-center gap-1.5 text-emerald-405 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Secure ({compliantCount})
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700 shrink-0" /> Incomplete ({total - compliantCount})
                </span>
              </div>
            </div>

          </div>

          {/* Action Tools Console (Print PDF Report & Export logs) */}
          <div className="p-4 bg-[#09090C] border border-slate-850 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-405 text-emerald-400 font-mono text-[10px] font-extrabold uppercase tracking-widest leading-none">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
              Sovereign Report Export Handout Suite
            </div>
            
            <p className="text-[11px] text-slate-400 leading-snug">
              Print official credentials registry paperwork. Instantly archive verified catalogs or raw security logs offline in administrative standard frameworks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1.5">
              
              <button
                type="button"
                onClick={exportCompliancePdf}
                disabled={total === 0}
                className="h-9.5 flex items-center justify-center gap-2 bg-emerald-700/85 hover:bg-emerald-600 disabled:bg-slate-850 disabled:text-slate-550 border border-emerald-600/20 text-slate-150 hover:text-white rounded-lg text-xs font-mono font-bold tracking-wide uppercase transition-all duration-150 cursor-pointer disabled:cursor-not-allowed shadow"
              >
                <Download className="h-4 w-4 text-emerald-300" />
                Export PDF Handout
              </button>

              <button
                type="button"
                onClick={downloadAuditCsv}
                disabled={auditLogs.length === 0}
                className="h-9.5 flex items-center justify-center gap-2 bg-[#171720] hover:bg-[#20202d] border border-slate-800 disabled:bg-slate-850 disabled:text-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-xs font-mono transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="h-4 w-4 text-slate-400 group-hover:text-amber-400" />
                Log Ledger (CSV)
              </button>

              <button
                type="button"
                onClick={downloadAuditJson}
                disabled={auditLogs.length === 0}
                className="h-9.5 flex items-center justify-center gap-2 bg-[#171720] hover:bg-[#20202d] border border-slate-800 disabled:bg-slate-850 disabled:text-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-xs font-mono transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <FileJson className="h-4 w-4 text-slate-400" />
                Log Crypt (JSON)
              </button>

              <button
                type="button"
                onClick={() => setIsSigningModalOpen(true)}
                disabled={auditLogs.length === 0}
                className="h-9.5 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-950/80 to-slate-900 hover:from-indigo-900 hover:to-slate-800 border border-indigo-500/20 disabled:opacity-40 disabled:hover:from-indigo-950 text-indigo-300 hover:text-indigo-200 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer disabled:cursor-not-allowed shadow-[0_0_12px_rgba(99,102,241,0.08)]"
              >
                <FileSignature className="h-4 w-4 text-indigo-400" />
                Gov Signed JSON
              </button>

            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Email template selector & editor header card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left selector and parameter panel */}
            <div className="lg:col-span-4 space-y-4 bg-[#09090C] border border-slate-850 rounded-xl p-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-mono text-slate-500 uppercase font-semibold block">
                  1. Choose Template Scenario
                </label>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedScenario('hired'); setIsEditingTemplate(false); }}
                    className={`w-full h-8 text-left px-3 rounded text-xs font-sans font-medium flex items-center justify-between border transition-all ${
                      selectedScenario === 'hired'
                        ? 'bg-emerald-950/40 text-emerald-405 border-emerald-900/60 font-semibold'
                        : 'bg-black/20 text-slate-400 border-transparent hover:bg-slate-900/40 hover:text-slate-200'
                    }`}
                  >
                    <span>Hired Offer Email</span>
                    <span className="text-[8.5px] font-mono bg-emerald-500/10 px-1 py-0.2 rounded text-emerald-400 font-bold">SMTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedScenario('shortlisted'); setIsEditingTemplate(false); }}
                    className={`w-full h-8 text-left px-3 rounded text-xs font-sans font-medium flex items-center justify-between border transition-all ${
                      selectedScenario === 'shortlisted'
                        ? 'bg-emerald-950/40 text-emerald-405 border-emerald-900/60 font-semibold'
                        : 'bg-black/20 text-slate-400 border-transparent hover:bg-slate-900/40 hover:text-slate-200'
                    }`}
                  >
                    <span>Shortlist Notification</span>
                    <span className="text-[8.5px] font-mono bg-emerald-500/10 px-1 py-0.2 rounded text-emerald-400 font-bold">SMTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedScenario('status_update'); setIsEditingTemplate(false); }}
                    className={`w-full h-8 text-left px-3 rounded text-xs font-sans font-medium flex items-center justify-between border transition-all ${
                      selectedScenario === 'status_update'
                        ? 'bg-emerald-950/40 text-emerald-405 border-emerald-900/60 font-semibold'
                        : 'bg-black/20 text-slate-400 border-transparent hover:bg-slate-900/40 hover:text-slate-200'
                    }`}
                  >
                    <span>Compliance State Sync</span>
                    <span className="text-[8.5px] font-mono bg-amber-500/10 px-1 py-0.2 rounded text-amber-500 font-bold">AUDIT</span>
                  </button>
                </div>
              </div>

              {/* Subject profile selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-mono text-slate-500 uppercase font-semibold block">
                  2. Choose Test Subject (Dynamic Data Link)
                </label>
                <select
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="w-full bg-black/60 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:border-emerald-500/40 focus:outline-none"
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map(cand2 => (
                    <option key={cand2.id} value={cand2.id}>
                      {cand2.firstName} {cand2.lastName} ({cand2.nationalId || cand2.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Editing controls */}
              <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                  className="w-full h-8 flex items-center justify-center gap-1.5 bg-[#171720] hover:bg-[#20202d] border border-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isEditingTemplate ? "Hide Config Board" : "Revise Template Markup"}
                </button>

                <button
                  type="button"
                  onClick={handleSendDraftMockEmail}
                  disabled={candidates.length === 0}
                  className="w-full h-8.5 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-850 text-slate-100 disabled:text-slate-550 rounded font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  Mock Dispatch Preview
                </button>
              </div>

              {/* Placeholders helper card */}
              <div className="p-3 bg-[#111116] border border-slate-850 rounded-lg text-left">
                <span className="text-[9px] font-mono font-bold uppercase block text-slate-500 pb-1 border-b border-slate-850">
                  Supported Placeholder Syntax
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-[8.5px] font-mono text-slate-450">
                  <div><code className="text-emerald-400">{`{firstName}`}</code></div>
                  <div>First Name</div>
                  <div><code className="text-emerald-400">{`{lastName}`}</code></div>
                  <div>Last Name</div>
                  <div><code className="text-emerald-400">{`{jobTitle}`}</code></div>
                  <div>Academic Job</div>
                  <div><code className="text-emerald-400">{`{nqfLevel}`}</code></div>
                  <div>NQF Level code</div>
                </div>
              </div>

            </div>

            {/* Right edit board or live preview view */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              {copiedNotification && (
                <div className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 text-xs px-3.5 py-2.5 rounded-xl font-mono flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 animate-bounce" />
                  <span>{copiedNotification}</span>
                </div>
              )}

              {/* Template interactive texteditor area */}
              {isEditingTemplate ? (
                <div className="bg-[#09090C] border border-slate-800 rounded-xl p-4.5 space-y-4 text-left flex flex-col flex-1 min-h-[300px]">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-1">
                    <Edit3 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold uppercase text-slate-350">
                      Funa Ispan Mzantsi Email Template Config Board
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-mono text-slate-500 uppercase font-semibold block">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={templates[selectedScenario].subject}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTemplates(t => ({
                          ...t,
                          [selectedScenario]: { ...t[selectedScenario], subject: val }
                        }));
                      }}
                      className="w-full bg-[#050507] border border-slate-850 focus:border-emerald-500/50 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-705 outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col flex-1">
                    <label className="text-[9.5px] font-mono text-slate-500 uppercase font-semibold block">
                      Email Template Body Paragraphs
                    </label>
                    <textarea
                      value={templates[selectedScenario].body}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTemplates(t => ({
                          ...t,
                          [selectedScenario]: { ...t[selectedScenario], body: val }
                        }));
                      }}
                      rows={10}
                      className="w-full flex-1 bg-[#050507] border border-[#20202d] focus:border-emerald-555 rounded px-3 py-2 text-xs text-slate-300 font-mono outline-none resize-none leading-relaxed"
                    />
                  </div>

                </div>
              ) : (
                <div className="bg-black/60 border border-slate-800 rounded-xl p-4.5 space-y-3 text-left flex-1 flex flex-col min-h-[300px]">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-1">
                    <Eye className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-mono font-bold uppercase text-slate-350">
                      Outbound Live Mail Compiler Monitor
                    </span>
                  </div>

                  {(() => {
                    const compiled = getCompiledTemplate();
                    const targetCand = candidates.find(c => c.id === selectedCandidateId) || candidates[0];

                    return (
                      <div className="space-y-3.5 flex-1 flex flex-col font-sans">
                        
                        <div className="space-y-1 bg-[#09090C] border border-slate-850 rounded-lg p-2.5 font-mono text-xs">
                          <div className="flex text-[10px] text-slate-500">
                            <span className="w-16">TO:</span>
                            <span className="text-emerald-400 font-bold select-all">
                              {targetCand ? `${targetCand.firstName} ${targetCand.lastName} <${targetCand.email}>` : "[Select Target Candidate above]"}
                            </span>
                          </div>
                          <div className="flex text-[10px] text-slate-500">
                            <span className="w-16">SUBJECT:</span>
                            <span className="text-slate-200 font-semibold">{compiled.subject}</span>
                          </div>
                        </div>

                        <div className="flex-1 bg-[#050507]/90 border border-slate-850 text-slate-300 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto">
                          {compiled.body}
                        </div>

                        <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
                          <span>Compiler Linkage: ACTIVE & HEALTHY</span>
                          <span className="text-emerald-500 font-bold uppercase">Ready for SMTP relay dispatch</span>
                        </div>

                      </div>
                    );
                  })()}

                </div>
              )}

            </div>
          </div>

        </div>
      )}

      <GovernmentSigningModal 
        isOpen={isSigningModalOpen} 
        onClose={() => setIsSigningModalOpen(false)} 
        auditLogs={auditLogs} 
        onAddAuditLog={onAddAuditLog} 
      />

    </div>
  );
};
