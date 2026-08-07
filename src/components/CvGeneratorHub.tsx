import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Sparkles, CheckCircle, Download, Copy, RefreshCw, 
  ShieldCheck, Award, Briefcase, User, Layers, ArrowRight, Check, AlertCircle
} from 'lucide-react';
import { Candidate, Job } from '../types';

interface CvGeneratorHubProps {
  candidates: Candidate[];
  jobs: Job[];
  activeCandidate: Candidate;
  showToast: (msg: string, type?: 'success' | 'info' | 'warn') => void;
}

const SAMPLE_JOB_PRESETS = [
  { title: "Senior Civil Infrastructure Engineer", desc: "Require ECSA registered professional with NQF Level 8 engineering degree, project management experience, and knowledge of BCEA and environmental compliance." },
  { title: "General Operations Worker", desc: "Reliable worker needed for logistics and warehousing. Must maintain strict safety compliance (OHSA), 100% attendance, and manual handling proficiency." },
  { title: "Administrative & Compliance Clerk", desc: "Office administration role handling POPIA compliance, record management, MS Excel, and client correspondence. NQF Level 5 Higher Certificate required." },
  { title: "Financial Accountant (SAICA)", desc: "CA(SA) or equivalent NQF Level 8/9 financial qualification. Responsible for ledger auditing, SARS tax compliance, and financial reporting." }
];

export const CvGeneratorHub: React.FC<CvGeneratorHubProps> = ({
  candidates,
  jobs,
  activeCandidate,
  showToast
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(activeCandidate.id || candidates[0]?.id || '');
  const [targetJobTitle, setTargetJobTitle] = useState<string>('Senior Civil Infrastructure Engineer');
  const [targetJobDescription, setTargetJobDescription] = useState<string>(SAMPLE_JOB_PRESETS[0].desc);
  const [customTier, setCustomTier] = useState<string>('auto');
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationResult, setGenerationResult] = useState<{
    tier: number;
    tierName: string;
    atsScore: number;
    complianceKeywords: string[];
    markdownCv: string;
    recommendations: string[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'preview' | 'markdown' | 'ats'>('preview');
  const [copied, setCopied] = useState<boolean>(false);

  const currentCandidate = candidates.find(c => c.id === selectedCandidateId) || activeCandidate;

  const handleGenerateCv = async () => {
    if (!currentCandidate || !targetJobTitle) {
      showToast("Please select a candidate and specify a target job title.", "warn");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/cv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: currentCandidate,
          targetJobTitle,
          targetJobDescription,
          customTier: customTier === 'auto' ? undefined : Number(customTier)
        })
      });
      const data = await res.json();
      if (data.success) {
        setGenerationResult({
          tier: data.tier,
          tierName: data.tierName,
          atsScore: data.atsScore,
          complianceKeywords: data.complianceKeywords || [],
          markdownCv: data.markdownCv,
          recommendations: data.recommendations || []
        });
        showToast("Elite ATS-Optimized CV Generated successfully!", "success");
      } else {
        showToast(data.error || "Failed to generate CV.", "warn");
      }
    } catch (err: any) {
      showToast("Network error while generating CV.", "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!generationResult) return;
    navigator.clipboard.writeText(generationResult.markdownCv);
    setCopied(true);
    showToast("CV Copied to clipboard in Markdown format!", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadMd = () => {
    if (!generationResult) return;
    const blob = new Blob([generationResult.markdownCv], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentCandidate.lastName || 'Candidate'}-Elite-CV-Tier${generationResult.tier}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("CV downloaded as Markdown (.md)", "success");
  };

  return (
    <div className="space-y-8 text-left">
      
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-black border border-emerald-900/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase font-bold tracking-widest">
              InterviewCoach SA Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-mono text-[10px] uppercase font-bold tracking-widest">
              ATS Optimized
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            Elite South African CV Generator & Tiering Optimizer
          </h3>
          <p className="text-xs font-sans text-slate-400 max-w-2xl leading-relaxed">
            Transform raw candidate profiles into high-impact, compliant CVs tailored for South African ATS filters. Automatically applies Tier-specific tone (Foundational, Technical, or Executive), South African spelling conventions, and NQF accreditation anchors.
          </p>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form Panel */}
        <div className="lg:col-span-5 p-6 bg-[#090b0e] border border-slate-850 rounded-2xl space-y-6">
          <div className="flex items-center gap-2.5 border-b border-slate-900 pb-4">
            <User className="h-4.5 w-4.5 text-emerald-400" />
            <h4 className="text-sm font-display font-semibold text-white uppercase tracking-wider">1. Candidate & Target Job Setup</h4>
          </div>

          <div className="space-y-4">
            {/* Candidate Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Select Candidate Profile
              </label>
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-black border border-slate-800 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
              >
                {candidates.length === 0 ? (
                  <option value={activeCandidate.id}>{activeCandidate.firstName} {activeCandidate.lastName} (Active Draft)</option>
                ) : (
                  candidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} - NQF {c.nqfLevel} ({c.qualificationName || 'General'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Target Job Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Quick Job Presets
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {SAMPLE_JOB_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTargetJobTitle(preset.title);
                      setTargetJobDescription(preset.desc);
                    }}
                    className="p-2.5 rounded-xl bg-black/60 hover:bg-black border border-slate-850 text-left transition-all text-xs group cursor-pointer"
                  >
                    <div className="font-semibold text-slate-300 group-hover:text-emerald-400 flex items-center justify-between">
                      <span>{preset.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Job Title Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Target Job Title
              </label>
              <input
                type="text"
                value={targetJobTitle}
                onChange={(e) => setTargetJobTitle(e.target.value)}
                placeholder="e.g. Senior Civil Engineer"
                className="w-full h-11 px-3.5 rounded-xl bg-black border border-slate-800 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Target Job Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Target Job Description & Requirements
              </label>
              <textarea
                rows={4}
                value={targetJobDescription}
                onChange={(e) => setTargetJobDescription(e.target.value)}
                placeholder="Paste job description here..."
                className="w-full p-3.5 rounded-xl bg-black border border-slate-800 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Dynamic Tier Override */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Dynamic Drafting Tier
              </label>
              <select
                value={customTier}
                onChange={(e) => setCustomTier(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-black border border-slate-800 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
              >
                <option value="auto">Auto-Detect based on NQF Level</option>
                <option value="1">Tier 1: Foundational / Labor / Support (Clear, dependable)</option>
                <option value="2">Tier 2: Mid-Level / Technical / Trades (Specialized tools)</option>
                <option value="3">Tier 3: Professional / Corporate / Executive (Metric-driven X-Y-Z)</option>
              </select>
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateCv}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Elite CV...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Elite ATS CV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-7 p-6 bg-[#090b0e] border border-slate-850 rounded-2xl flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald-400" />
              <div>
                <h4 className="text-sm font-display font-semibold text-white uppercase tracking-wider">Generated Elite CV Output</h4>
                {generationResult && (
                  <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                    {generationResult.tierName} • ATS Score: {generationResult.atsScore}/100
                  </p>
                )}
              </div>
            </div>

            {generationResult && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-3 py-1.5 rounded-lg bg-black hover:bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy MD'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMd}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .md</span>
                </button>
              </div>
            )}
          </div>

          {/* Output Sub-Tabs */}
          {generationResult && (
            <div className="flex gap-2 border-b border-slate-900 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider cursor-pointer ${
                  activeTab === 'preview' ? 'bg-emerald-600 text-white' : 'bg-black text-slate-400 hover:text-white'
                }`}
              >
                Formatted Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('markdown')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider cursor-pointer ${
                  activeTab === 'markdown' ? 'bg-emerald-600 text-white' : 'bg-black text-slate-400 hover:text-white'
                }`}
              >
                Raw Markdown
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ats')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider cursor-pointer ${
                  activeTab === 'ats' ? 'bg-emerald-600 text-white' : 'bg-black text-slate-400 hover:text-white'
                }`}
              >
                ATS & Compliance Report
              </button>
            </div>
          )}

          {/* Content Box */}
          <div className="flex-1 min-h-[400px] bg-black/60 border border-slate-900 rounded-xl p-5 overflow-y-auto max-h-[600px] text-left">
            {!generationResult ? (
              <div className="flex flex-col items-center justify-center h-full py-24 space-y-3 text-center">
                <FileText className="h-10 w-10 text-slate-700 animate-pulse" />
                <div className="space-y-1">
                  <span className="text-xs font-mono text-slate-400 font-bold block">No CV Synthesized Yet</span>
                  <p className="text-[11px] font-sans text-slate-500 max-w-sm">
                    Select a candidate profile and target job, then click "Generate Elite ATS CV" to produce a professionally tailored South African CV.
                  </p>
                </div>
              </div>
            ) : activeTab === 'preview' ? (
              <div className="prose prose-invert prose-sm max-w-none font-sans text-slate-300 space-y-4 whitespace-pre-wrap leading-relaxed">
                {generationResult.markdownCv}
              </div>
            ) : activeTab === 'markdown' ? (
              <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                {generationResult.markdownCv}
              </pre>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase">ATS Compatibility Rating</span>
                    <span className="text-lg font-display font-black text-emerald-300">{generationResult.atsScore}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${generationResult.atsScore}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-mono font-bold text-slate-400 uppercase">Extracted Compliance Keywords</h5>
                  <div className="flex flex-wrap gap-2">
                    {generationResult.complianceKeywords.map((kw, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-black border border-slate-800 text-xs font-mono text-emerald-400">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-mono font-bold text-slate-400 uppercase">Optimization Recommendations</h5>
                  <div className="space-y-2">
                    {generationResult.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-slate-900">
                        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
