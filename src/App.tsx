// FICA & COMPLIANCE GATEKEEPER - SAFE VERSION
// Product Owner & IP: S Cengcani | Ilitha Fintech Operations (Pty) Ltd - Owned & Managed by Children of S Cengcani
// SAFE: Directive8SafeRegister Tracker ONLY - No live SAPS AFIS / SAQA / Bureau integration

import React, { useState } from 'react';
import { Directive8SafeRegister } from './components/Directive8SafeRegister';
import { FatfSafeTracker } from './components/FatfSafeTracker';

type Tab = "fica" | "directive8" | "fatf" | "sec28a" | "sec22";

export default function App() {
  const [tab, setTab] = useState<Tab>("fica");
  const utcNow = new Date().toISOString().slice(0,19) + " UTC";

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-mono">

      {/* CLEAN HEADER - NO <img> TAG - CODE ONLY SHIELD */}
      <header className="bg-black text-[#D4AF37] border-b-4 border-[#D4AF37] p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          {/* CSS SHIELD - NO IMAGE FILE */}
          <div className="w-11 h-11 rounded-[8px] bg-[#D4AF37] text-black font-black flex items-center justify-center text-[22px] leading-none border-2 border-white">
            §
          </div>
          <div className="flex-1">
            <h1 className="font-black text-[13px] md:text-[15px] uppercase tracking-[0.15em]">FICA & COMPLIANCE GATEKEEPER</h1>
            <p className="text-[7.5px] md:text-[8.5px] text-white/70 leading-[10px] mt-0.5">
              Product Owner & IP: S Cengcani | Ilitha Fintech Operations (Pty) Ltd - Owned & Managed by Children of S Cengcani |
              Sec 42(2)(o) RMCP Host | Sec 22 Vault 5yr (7yr Recommended) | {utcNow}
            </p>
          </div>
          <div className="text-[8px] border border-[#D4AF37] px-2 py-1 text-white">
            SECURE<br/>HTTPS<br/>TLS 1.3
          </div>
        </div>
      </header>

      {/* NAV - NO IMAGES */}
      <nav className="bg-white border-b-2 border-black max-w-7xl mx-auto flex flex-wrap gap-1 p-2 text-[10px] font-bold">
        <button onClick={()=>setTab("fica")} className={`px-3 py-2 border-2 border-black ${tab==="fica"?"bg-black text-white":"bg-white"}`}>FICA KYC</button>
        <button onClick={()=>setTab("directive8")} className={`px-3 py-2 border-2 border-black ${tab==="directive8"?"bg-black text-white":"bg-white"}`}>DIRECTIVE 8 REGISTER</button>
        <button onClick={()=>setTab("fatf")} className={`px-3 py-2 border-2 border-black ${tab==="fatf"?"bg-black text-white":"bg-white"}`}>FATF TRACKER</button>
        <button onClick={()=>setTab("sec28a")} className={`px-3 py-2 border-2 border-black ${tab==="sec28a"?"bg-black text-white":"bg-white"}`}>Sec 28A / 26A FREEZE</button>
        <button onClick={()=>setTab("sec22")} className={`px-3 py-2 border-2 border-black ${tab==="sec22"?"bg-black text-white":"bg-white"}`}>Sec 22 VAULT</button>
      </nav>

      {/* CONTENT - NO IMAGES */}
      <main className="max-w-7xl mx-auto p-3 md:p-6">
        {tab==="fica" && (
          <div className="bg-white border-2 border-black p-4">
            <h2 className="font-black text-[12px]">FICA VERIFICATION MODULE</h2>
            <p className="text-[10px] mt-2">Simulation / Training RMCP Flow - POPIA Sec 11 Consent Logged - No live DHA/HO.</p>
            {/* YOUR EXISTING FICA FORM COMPONENTS HERE - ENSURE NO <img> INSIDE THEM */}
          </div>
        )}

        {tab==="directive8" && <Directive8SafeRegister />}
        {tab==="fatf" && <FatfSafeTracker />}

        {tab==="sec28a" && (
          <div className="bg-white border-2 border-black p-4">
            <h2 className="font-black text-[12px]">Sec 26A / 28A TPR & FREEZE TEMPLATE</h2>
            <p className="text-[9px] bg-yellow-100 border border-black p-2 mt-2">
              Manual Template Workflow Only - No live goAML integration - Officer must file via official goAML portal.
              Sec 28A TPR clock 24hr / 72hr tracking.
            </p>
          </div>
        )}

        {tab==="sec22" && (
          <div className="bg-white border-2 border-black p-4">
            <h2 className="font-black text-[12px]">Sec 22 IMMUTABLE VAULT - 5 YEAR (7 RECOMMENDED)</h2>
            <p className="text-[10px]">AES-256 archive of all Sec 21 IDD + Sec 21C re-vetting + Directive 8 PCC tracker uploads + TFS screenshots.</p>
          </div>
        )}

        {/* LEGAL FOOTER - NO IMAGE */}
        <div className="mt-8 border-t-2 border-black pt-3 text-[7px] text-center uppercase leading-[9px]">
          Product Owner & IP: S Cengcani | Family IP | Group Operator: Ilitha Fintech Operations (Pty) Ltd - Owned & Managed by Children of S Cengcani |
          Directive 8 Readiness Tracker & FATF Readiness Tracker Only - No Live SAPS / Hawks / NPA / SIU / CIPC BO / SAQA Integration |
          POPIA Sec 11 Consent | Sec 14 Retention | Sec 22 5yr Archive | ©2026 All Rights Reserved | Secure HTTPS TLS-1.3 | {utcNow}
        </div>
      </main>
    </div>
  );
}
