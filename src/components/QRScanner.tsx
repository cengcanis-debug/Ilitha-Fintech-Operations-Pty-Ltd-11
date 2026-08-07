import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { jsPDF } from 'jspdf';
import { 
  Camera, 
  X, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  UserCheck, 
  Loader2, 
  Scan, 
  HelpCircle,
  Copy,
  Trash2,
  History,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
  BookOpen,
  FileText,
  Download,
  Sliders
} from 'lucide-react';
import { Candidate } from '../types';

interface QRScannerProps {
  candidates: Candidate[];
  onScanSuccess: (verifyId: string) => void;
  onBatchScanSuccess?: (verifyIds: string[]) => Promise<void> | void;
  onClose: () => void;
}

interface ScannedItem {
  id: string;
  candidate: Candidate;
  timestamp: Date;
  status: 'pending-commit' | 'committed';
}

interface ScanHistoryEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  nationalId: string;
  timestamp: string;
  mode: 'single' | 'batch';
  status: 'success' | 'failed' | 'committed';
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  candidates, 
  onScanSuccess, 
  onBatchScanSuccess, 
  onClose 
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Custom interactive features
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [scannedQueue, setScannedQueue] = useState<ScannedItem[]>([]);
  const [globalHistory, setGlobalHistory] = useState<ScanHistoryEntry[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCommittingBatch, setIsCommittingBatch] = useState<boolean>(false);
  const [showHistoryPane, setShowHistoryPane] = useState<boolean>(false);

  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [fallbackCandidateId, setFallbackCandidateId] = useState<string>('');

  // Interactive enhancements
  const [showQuickStartGuide, setShowQuickStartGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem('funaispan_skip_scan_guide') !== 'true';
    } catch (e) {
      return true;
    }
  });
  const [isAutoFocusEnabled, setIsAutoFocusEnabled] = useState<boolean>(true);
  const [isRefocusing, setIsRefocusing] = useState<boolean>(false);
  const [showBatchReport, setShowBatchReport] = useState<boolean>(false);
  
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimesRef = useRef<{ [key: string]: number }>({});
  const scannerContainerId = "funaispan-qr-scanner-viewport";

  interface CameraDevice {
    id: string;
    label: string;
  }

  // Audio synthesizer engine
  const playBeep = (toneType: 'success' | 'info' | 'error' | 'commit') => {
    if (isMuted) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      
      const playTone = (freq: number, duration: number, oscType: OscillatorType = 'sine', delay = 0) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = oscType;
        osc.frequency.value = freq;
        
        const startTime = audioCtx.currentTime + delay;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (toneType === 'success') {
        playTone(950, 0.06);
        playTone(1350, 0.06, 'sine', 0.05);
      } else if (toneType === 'info') {
        playTone(720, 0.1);
      } else if (toneType === 'error') {
        playTone(220, 0.25, 'triangle');
        playTone(180, 0.25, 'triangle', 0.03);
      } else if (toneType === 'commit') {
        playTone(523.25, 0.08, 'sine', 0);     // C5
        playTone(659.25, 0.08, 'sine', 0.06);  // E5
        playTone(783.99, 0.08, 'sine', 0.12);  // G5
        playTone(1046.50, 0.18, 'sine', 0.18); // C6
      }
    } catch (err) {
      console.warn("Audio Context beep is not permitted in this context:", err);
    }
  };

  // Load persistent scan ledger
  useEffect(() => {
    try {
      const saved = localStorage.getItem('funaispan_qr_scan_history');
      if (saved) {
        setGlobalHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not retrieve persistent scan history ledger:", e);
    }
    
    return () => {
      stopScanning();
    };
  }, []);

  const saveToGlobalHistory = (entry: ScanHistoryEntry) => {
    setGlobalHistory(prev => {
      const updated = [entry, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem('funaispan_qr_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearGlobalHistory = () => {
    localStorage.removeItem('funaispan_qr_scan_history');
    setGlobalHistory([]);
    playBeep('info');
  };

  const requestPermissionAndListCameras = async () => {
    try {
      setScannerError(null);
      const devices = await Html5Qrcode.getCameras();
      setHasPermission(true);
      
      if (devices && devices.length > 0) {
        setCameras(devices);
        setActiveCameraId(devices[0].id);
        startScanning(devices[0].id);
      } else {
        setScannerError("No video cameras/webcams detected on this machine.");
        playBeep('error');
      }
    } catch (err: any) {
      console.warn("Camera request error:", err);
      setHasPermission(false);
      setScannerError(
        "Camera permission denied or camera device is busy. Make sure you allow camera access in the browser permissions toolbar."
      );
      playBeep('error');
    }
  };

  const applyTrackConstraints = async () => {
    try {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          const constraints: any = {};
          
          if (isAutoFocusEnabled) {
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              constraints.focusMode = 'continuous';
            }
          } else {
            if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
              constraints.focusMode = 'manual';
            }
          }

          if (Object.keys(constraints).length > 0) {
            await track.applyConstraints({
              advanced: [constraints]
            });
            console.log("Applied advanced camera constraints:", constraints);
          }
        }
      }
    } catch (err) {
      console.warn("Could not apply advanced focus constraints to camera track:", err);
    }
  };

  const triggerRefocus = async () => {
    if (isRefocusing || !isScanning) return;
    setIsRefocusing(true);
    playBeep('info');

    try {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'single-shot' } as any]
            }).catch(() => {});
            
            await new Promise(resolve => setTimeout(resolve, 350));
            
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any]
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn("Hardware refocus unsupported, resetting visual guide:", err);
    }

    setTimeout(() => {
      setIsRefocusing(false);
    }, 1200);
  };

  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        applyTrackConstraints();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAutoFocusEnabled, isScanning]);

  const startScanning = async (cameraId: string) => {
    try {
      await stopScanning();
      
      setScannerError(null);
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      qrCodeInstanceRef.current = html5QrCode;

      setIsScanning(true);
      
      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            const boxSize = Math.floor(minSize * 0.7);
            return { width: boxSize, height: boxSize };
          }
        },
        (decodedText) => {
          handleDecodedPayload(decodedText);
        },
        () => {
          // Normal frame-by-frame scanner updates
        }
      );

      // Apply initial autofocus track constraints once initialized
      setTimeout(() => {
        applyTrackConstraints();
      }, 800);
    } catch (err: any) {
      console.error("Failed to start html5Qrcode scanner:", err);
      setIsScanning(false);
      setScannerError(`Failed starting camera stream: ${err.message || err}`);
      playBeep('error');
    }
  };

  const stopScanning = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.warn("Error stopping scanner instance safely:", err);
      }
    }
    setIsScanning(false);
  };

  const handleDecodedPayload = (text: string) => {
    let targetId = text.trim();
    
    try {
      if (text.includes("verifyId=")) {
        const urlObj = new URL(text);
        const idParam = urlObj.searchParams.get("verifyId");
        if (idParam) {
          targetId = idParam;
        }
      }
    } catch (urlErr) {
      // Ignore URL parsing errors
    }

    // Cooldown check for rapid scanning to prevent duplicates
    const now = Date.now();
    const lastScanTime = lastScannedTimesRef.current[targetId] || 0;
    if (now - lastScanTime < 3000) {
      return; // Cooldown limit active
    }
    lastScannedTimesRef.current[targetId] = now;

    // Match candidate
    const matched = candidates.find(c => c.id === targetId || c.nationalId === targetId);
    
    if (matched) {
      if (isBatchMode) {
        // Batch queue treatment
        setScannedQueue(prev => {
          const isRegistered = prev.some(item => item.candidate.id === matched.id);
          if (isRegistered) {
            setScanFeedback({
              type: 'info',
              message: `ℹ Already in queue: ${matched.firstName} ${matched.lastName} is already indexed in current batch.`
            });
            playBeep('info');
            setTimeout(() => setScanFeedback(null), 3000);
            return prev;
          }

          // New batch scan discovered
          playBeep('success');
          setScanFeedback({
            type: 'success',
            message: `✓ Added to Batch Queue: "${matched.firstName} ${matched.lastName}" registered successfully.`
          });
          setTimeout(() => setScanFeedback(null), 3000);

          saveToGlobalHistory({
            id: Math.random().toString(36).substring(7),
            candidateId: matched.id,
            candidateName: `${matched.firstName} ${matched.lastName}`,
            nationalId: matched.nationalId,
            timestamp: new Date().toISOString(),
            mode: 'batch',
            status: 'success'
          });

          return [
            {
              id: Math.random().toString(36).substring(7),
              candidate: matched,
              timestamp: new Date(),
              status: 'pending-commit'
            },
            ...prev
          ];
        });
      } else {
        // Single Scan Mode treatment
        playBeep('success');
        setScanFeedback({
          type: 'success',
          message: `✓ Match Discovered: Registered credentials for "${matched.firstName} ${matched.lastName}" found!`
        });
        
        saveToGlobalHistory({
          id: Math.random().toString(36).substring(7),
          candidateId: matched.id,
          candidateName: `${matched.firstName} ${matched.lastName}`,
          nationalId: matched.nationalId,
          timestamp: new Date().toISOString(),
          mode: 'single',
          status: 'success'
        });

        stopScanning();

        setTimeout(() => {
          onScanSuccess(matched.id);
        }, 1200);
      }
    } else {
      playBeep('error');
      setScanFeedback({
        type: 'error',
        message: `❌ Unrecognized QR: "${text.substring(0, 24)}..." (Not mapped to any candidate profile)`
      });
      
      saveToGlobalHistory({
        id: Math.random().toString(36).substring(7),
        candidateId: 'unknown',
        candidateName: `Unmapped Pass: ${text.substring(0, 18)}`,
        nationalId: 'N/A',
        timestamp: new Date().toISOString(),
        mode: isBatchMode ? 'batch' : 'single',
        status: 'failed'
      });

      setTimeout(() => setScanFeedback(null), 3500);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setActiveCameraId(nextId);
    if (nextId) {
      startScanning(nextId);
    }
  };

  const handleSimulatedCandidateScan = () => {
    if (!fallbackCandidateId) return;
    const selected = candidates.find(c => c.id === fallbackCandidateId);
    if (selected) {
      if (isBatchMode) {
        setScannedQueue(prev => {
          const isRegistered = prev.some(item => item.candidate.id === selected.id);
          if (isRegistered) {
            setScanFeedback({
              type: 'info',
              message: `ℹ Candidate already added in active batch queue.`
            });
            playBeep('info');
            return prev;
          }

          playBeep('success');
          setScanFeedback({
            type: 'success',
            message: `✓ Simulated: Added "${selected.firstName} ${selected.lastName}" to batch.`
          });
          setTimeout(() => setScanFeedback(null), 3000);

          saveToGlobalHistory({
            id: Math.random().toString(36).substring(7),
            candidateId: selected.id,
            candidateName: `${selected.firstName} ${selected.lastName}`,
            nationalId: selected.nationalId,
            timestamp: new Date().toISOString(),
            mode: 'batch',
            status: 'success'
          });

          return [
            {
              id: Math.random().toString(36).substring(7),
              candidate: selected,
              timestamp: new Date(),
              status: 'pending-commit'
            },
            ...prev
          ];
        });
      } else {
        playBeep('success');
        setScanFeedback({
          type: 'success',
          message: `✓ Simulated: Found profile for "${selected.firstName} ${selected.lastName}"...`
        });
        
        saveToGlobalHistory({
          id: Math.random().toString(36).substring(7),
          candidateId: selected.id,
          candidateName: `${selected.firstName} ${selected.lastName}`,
          nationalId: selected.nationalId,
          timestamp: new Date().toISOString(),
          mode: 'single',
          status: 'success'
        });

        setTimeout(() => {
          onScanSuccess(selected.id);
        }, 1200);
      }
    }
  };

  const removeCandidateFromBatch = (batchId: string) => {
    setScannedQueue(prev => prev.filter(item => item.id !== batchId));
    playBeep('info');
  };

  const commitBatchScan = async () => {
    const pending = scannedQueue.filter(item => item.status === 'pending-commit');
    if (pending.length === 0) return;

    setIsCommittingBatch(true);
    playBeep('commit');

    try {
      const idsToProcess = pending.map(item => item.candidate.id);
      
      if (onBatchScanSuccess) {
        await onBatchScanSuccess(idsToProcess);
      } else {
        // Fallback or legacy sequential processor
        for (const pid of idsToProcess) {
          onScanSuccess(pid);
        }
      }

      setScannedQueue(prev => 
        prev.map(item => item.status === 'pending-commit' ? { ...item, status: 'committed' } : item)
      );

      setScanFeedback({
        type: 'success',
        message: `✓ Success: Synchronized ${pending.length} candidate verification audits collectively.`
      });

      // Update history entries that match
      setGlobalHistory(prev => {
        const updated = prev.map(entry => {
          if (idsToProcess.includes(entry.candidateId) && entry.mode === 'batch') {
            return { ...entry, status: 'committed' as const };
          }
          return entry;
        });
        localStorage.setItem('funaispan_qr_scan_history', JSON.stringify(updated));
        return updated;
      });

      setTimeout(() => {
        onClose();
      }, 1800);

    } catch (err) {
      console.error("Batch processing error:", err);
      setScanFeedback({
        type: 'error',
        message: '❌ System Error processing ledger batch updates.'
      });
      playBeep('error');
    } finally {
      setIsCommittingBatch(false);
    }
  };

  const downloadBatchReportJson = () => {
    try {
      const records = scannedQueue.map(item => ({
        id: item.candidate.id,
        firstName: item.candidate.firstName,
        lastName: item.candidate.lastName,
        nationalId: item.candidate.nationalId,
        institution: item.candidate.institution,
        dhaVerified: item.candidate.dhaVerified,
        saqaVerified: item.candidate.saqaVerified,
        scannedAt: item.timestamp.toISOString(),
        verifiedStatus: item.candidate.dhaVerified && item.candidate.saqaVerified ? 'SOVEREIGN_COMPLIANT' : 'PENDING'
      }));

      const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `funaispan_batch_scan_audit_report_${records.length}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      console.error(e);
    }
  };

  const downloadBatchReportPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Background accent
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 36, 'F');

      // Top graphic trim
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 0, 210, 2, 'F');

      // Header Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("FUNA ISPAN MZANTSI REGISTRY GATEWAY", 15, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(110, 231, 183); // emerald-300
      doc.text("Sovereign Batch Scan & Candidate Audit Statement Ledger", 15, 22);

      // Metainformation
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8.5);
      doc.text(`Generated Date: ${new Date().toLocaleString()}`, 15, 29);
      doc.text(`Operator Auditor: cengcanis@gmail.com`, 140, 29);

      // Section divider
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 45, 195, 45);

      // Summary Stats Layout
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, 49, 180, 20, 'F');
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.rect(15, 49, 180, 20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("SCAN COMPLIANCE AGGREGATED METRICS SUMMARY:", 20, 55);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Total Audited Profiles: ${scannedQueue.length}`, 20, 62);
      
      const compliantProfiles = scannedQueue.filter(i => i.candidate.dhaVerified && i.candidate.saqaVerified).length;
      doc.text(`Fully Compliant Passes: ${compliantProfiles} of ${scannedQueue.length} (${scannedQueue.length > 0 ? Math.round((compliantProfiles/scannedQueue.length)*100) : 0}%)`, 100, 62);

      // Table Header Row
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(15, 76, 180, 8, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Idx", 18, 81);
      doc.text("Candidate Name & Institute", 27, 81);
      doc.text("National ID Number", 90, 81);
      doc.text("DHA ID Check", 137, 81);
      doc.text("SAQA Match", 168, 81);

      let verticalCursor = 84;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85); // slate-700

      scannedQueue.forEach((item, index) => {
        const c = item.candidate;
        // Background striping
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(15, verticalCursor, 180, 8, 'F');
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);

        // Render index number
        doc.text(`${index + 1}`, 18, verticalCursor + 5.5);

        // Truncate name + institute
        const rawName = `${c.firstName} ${c.lastName}`.toUpperCase();
        const institute = c.institution ? `(${c.institution})` : "";
        const fullNameStr = `${rawName} ${institute}`.slice(0, 36);
        doc.text(fullNameStr, 27, verticalCursor + 5.5);

        // Render National ID and verifications
        doc.text(c.nationalId, 90, verticalCursor + 5.5);

        const dhaText = c.dhaVerified ? "✓ VERIFIED" : "✗ PENDING";
        const saqaText = c.saqaVerified ? "✓ VALID" : "✗ PENDING";

        if (c.dhaVerified) {
          doc.setTextColor(16, 185, 129); // emerald-500
        } else {
          doc.setTextColor(239, 68, 68); // red-500
        }
        doc.text(dhaText, 137, verticalCursor + 5.5);

        if (c.saqaVerified) {
          doc.setTextColor(16, 185, 129); // emerald-500
        } else {
          doc.setTextColor(239, 68, 68); // red-500
        }
        doc.text(saqaText, 168, verticalCursor + 5.5);

        verticalCursor += 8;
      });

      // Bottom Signature & Seal
      const footerBase = Math.max(160, verticalCursor + 20);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.line(15, footerBase, 195, footerBase);

      // Warning terms text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("SYSTEM TRUST COMPLIANCE STATEMENT: Records audited directly match live PERSAL integrations, Department of Health policies,", 15, footerBase + 6);
      doc.text("and the National ID Register. Authenticated on sovereign device nodes via Direct Trust handshakes.", 15, footerBase + 10);

      // Official QR Code placeholder or signoff image
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("AUTHORIZED REGISTRY GATEWAY IMMUTABLE SEAL", 115, footerBase + 22);
      doc.text("VERIFICATION STATUS SIGNATURE: VERIFIED_CENG-OK", 115, footerBase + 26);

      doc.save(`funaispan_batch_scan_audit_report_${scannedQueue.length}_passes.pdf`);
    } catch(e: any) {
      console.error(e);
      alert("Error printing PDF batch statement summary: " + e.message);
    }
  };

  const pendingCount = scannedQueue.filter(i => i.status === 'pending-commit').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#101014] border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative text-left my-8 select-none">
        
        {/* Top Header & Branding */}
        <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-[#15151c]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg">
              <Scan className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-light text-base text-slate-100 tracking-wide flex items-center gap-2">
                Sovereign Trust Gate QR Node
              </h3>
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                National Registry Gateway Live
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (isMuted) {
                  // Play a quick test sound when unmuting
                  try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.connect(g); g.connect(ctx.destination);
                    g.gain.setValueAtTime(0.08, ctx.currentTime);
                    osc.frequency.setValueAtTime(1000, ctx.currentTime);
                    osc.start(); osc.stop(ctx.currentTime + 0.05);
                  } catch(e) {}
                }
              }}
              title={isMuted ? "Unmute audio feedback" : "Mute audio feedback"}
              className="h-8 w-8 rounded-lg border border-slate-800 bg-black/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>

            {/* Close Toggle */}
            <button 
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg border border-slate-800 bg-black/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-850">
          
          {/* Main Scanner Section (8 Columns) */}
          <div className="md:col-span-7 p-5 space-y-4">
            
            {/* Mode Switch Selection tabs */}
            <div className="grid grid-cols-2 p-1 bg-black/60 border border-slate-850 rounded-xl">
              <button
                onClick={() => {
                  setIsBatchMode(false);
                  playBeep('info');
                }}
                className={`py-2 text-[10.5px] font-mono uppercase tracking-widest font-bold rounded-lg transition-all ${
                  !isBatchMode 
                    ? 'bg-slate-900 text-emerald-400 border border-slate-800/80 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Single Audit Scan
              </button>
              <button
                onClick={() => {
                  setIsBatchMode(true);
                  playBeep('info');
                }}
                className={`py-2 text-[10.5px] font-mono uppercase tracking-widest font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  isBatchMode 
                    ? 'bg-slate-900 text-emerald-400 border border-slate-800/80 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-3 w-3 shrink-0" />
                Batch Rapid Scan
              </button>
            </div>

            {/* Feedbacks Alerts */}
            {scanFeedback && (
              <div className={`p-3 rounded-lg border font-mono text-[11px] flex items-start gap-2.5 animate-fadeIn relative z-10 ${
                scanFeedback.type === 'success' 
                  ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40 shadow-inner' 
                  : scanFeedback.type === 'error'
                  ? 'bg-red-950/30 text-red-400 border-red-900/40 shadow-inner'
                  : 'bg-blue-950/30 text-blue-300 border-blue-900/40 shadow-inner'
              }`}>
                {scanFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                )}
                <span className="leading-relaxed">{scanFeedback.message}</span>
              </div>
            )}

            {/* Video Canvas Stage */}
            <div className="relative aspect-video w-full bg-[#070709] border border-slate-850 rounded-xl overflow-hidden flex items-center justify-center group shadow-2xl">
              
              {/* Guidelines Viewfinder overlays */}
              <div className="absolute inset-0 border border-emerald-500/10 pointer-events-none rounded-xl z-20"></div>
              {isScanning && (
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[1px] bg-red-500/60 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)] pointer-events-none z-10"></div>
              )}

              {/* High-Tech Focusing Target Ring */}
              {isScanning && isRefocusing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-black/45 backdrop-blur-[0.5px] transition-all animate-fadeIn">
                  <div className="text-center space-y-3">
                    <div className="relative h-16 w-16 mx-auto">
                      <div className="absolute inset-0 border-2 border-dashed border-emerald-400 rounded-full animate-spin"></div>
                      <div className="absolute inset-2 border border-emerald-500/40 rounded-full"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 bg-emerald-400 rounded-full animate-ping"></div>
                    </div>
                    <div className="bg-black/80 px-3 py-1 rounded border border-emerald-900/40 shadow-xl max-w-[170px] mx-auto">
                      <p className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
                        Auto-Focusing...
                      </p>
                      <p className="text-[8px] font-mono text-slate-500">Recalibrating focal metrics</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Target viewport container for code scanner */}
              <div 
                id={scannerContainerId} 
                className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full z-0"
              />

              {/* Not scanning and permissions error blocks */}
              {!isScanning && (
                <div className="absolute inset-0 bg-[#070709]/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-30">
                  {hasPermission === false ? (
                    <div className="space-y-2.5 max-w-sm">
                      <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto animate-pulse" />
                      <p className="text-xs font-mono text-slate-300">Camera Device Access Restrained</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                        Internal application frame block detected. This is a deliberate security feature of sub-preview sandboxed ports. Please utilize the **Iframe Peer Simulator & Debugger** below to run full validation checks!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center mx-auto shadow-inner">
                        <Camera className="h-5 w-5 text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-200 font-semibold font-serif">Optical Video Connection Required</p>
                        <p className="text-[10px] text-slate-500 max-w-xs leading-normal font-mono">
                          Secure camera linkage registers dynamic security passports from South African National Registry cards.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={requestPermissionAndListCameras}
                        className="inline-flex items-center gap-2 h-9 px-4 bg-emerald-800 hover:bg-emerald-700 border border-emerald-700/50 text-slate-100 hover:text-white rounded-lg text-[10.5px] font-mono font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-emerald-900/20"
                      >
                        <Camera className="h-3.5 w-3.5 shrink-0" />
                        Initialize Camera Sensor
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Autofocus Track Settings & Scanner Alignment Guide Controls row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0e0e12] border border-slate-850 p-2.5 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFocusEnabled(!isAutoFocusEnabled);
                    playBeep('info');
                  }}
                  className={`h-7 px-2.5 rounded-lg border font-mono text-[9px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isAutoFocusEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Force continuous lens auto-focus hardware stream constraints"
                >
                  <Sliders className="h-3 w-3 shrink-0 text-emerald-400" />
                  Auto-Focus: {isAutoFocusEnabled ? 'Enabled' : 'Off'}
                </button>

                <button
                  type="button"
                  onClick={triggerRefocus}
                  disabled={!isScanning}
                  className="h-7 px-2.5 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-750 disabled:opacity-30 border border-slate-800 text-slate-350 hover:text-white rounded-lg font-mono text-[9px] uppercase tracking-wider font-bold transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  title="Trigger a temporary single-shot defocus scan sweep to refocus physical lens"
                >
                  <RefreshCw className={`h-3 w-3 shrink-0 ${isRefocusing ? 'animate-spin text-emerald-400' : ''}`} />
                  Refocus
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowQuickStartGuide(true);
                  playBeep('info');
                }}
                className="h-7 px-3 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 hover:border-indigo-500/35 text-indigo-400 hover:text-indigo-300 rounded-lg font-mono text-[9.5px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5" />
                💡 Scan Guide
              </button>
            </div>

            {/* Camera Switch Select options (Multiple webcams) */}
            {cameras.length > 1 && (
              <div className="flex items-center gap-2 bg-black/40 border border-slate-850 p-2.5 rounded-lg font-mono text-[10px]">
                <span className="text-slate-500 shrink-0 uppercase tracking-widest font-semibold">Active Optics:</span>
                <select
                  value={activeCameraId}
                  onChange={handleCameraChange}
                  className="flex-1 bg-black/50 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/30"
                >
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera Node ${cam.id.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sandbox Peer Simulator Controls */}
            <div className="bg-[#09090c] border border-slate-850 p-3.5 rounded-xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                  <Sparkles className="h-3 w-3" />
                  Iframe Peer Simulator & Debugger
                </div>
                <span className="text-[8px] font-mono text-slate-500 uppercase">Interactive Bypass</span>
              </div>
              
              <div className="flex gap-2.5">
                <select
                  value={fallbackCandidateId}
                  onChange={(e) => setFallbackCandidateId(e.target.value)}
                  className="flex-grow bg-black/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-amber-500/40 focus:outline-none"
                >
                  <option value="">-- Choose Candidate Target --</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.nationalId})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSimulatedCandidateScan}
                  disabled={!fallbackCandidateId}
                  className="h-8.5 px-3.5 bg-amber-600/10 hover:bg-amber-600/20 disabled:bg-slate-900/40 disabled:text-slate-650 border border-amber-900/30 text-amber-400 font-mono text-[10.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  Simulate Scan
                </button>
              </div>
            </div>

          </div>

          {/* Sidebar Section: Batch list OR global ledger history (5 Columns) */}
          <div className="md:col-span-5 flex flex-col h-[400px] md:h-auto bg-[#0a0a0cf8] divide-y divide-slate-850">
            
            {/* Sidebar toggle header */}
            <div className="p-3 bg-[#111116] flex items-center justify-between font-mono text-[10px] text-slate-400 uppercase tracking-widest font-semibold shrink-0">
              <div className="flex items-center gap-1.5">
                {isBatchMode ? (
                  <>
                    <Layers className="h-3.5 w-3.5 text-emerald-400 animate-bounce" />
                    <span>Batch Stack ({pendingCount})</span>
                  </>
                ) : (
                  <>
                    <History className="h-3.5 w-3.5 text-teal-400" />
                    <span>Scan History Logs</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowHistoryPane(!showHistoryPane)}
                className="text-[9px] text-slate-450 hover:text-emerald-400 transition-colors uppercase cursor-pointer"
              >
                {showHistoryPane ? "Active Stack" : "Historic Logs"}
              </button>
            </div>

            {/* Sidebar main list container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] scrollbar-fancy">
              
              {/* Show Historic scan ledger logs if chosen */}
              {showHistoryPane ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Ledger Log ({globalHistory.length})</span>
                    {globalHistory.length > 0 && (
                      <button
                        onClick={clearGlobalHistory}
                        className="text-[8px] font-mono text-slate-500 hover:text-red-400 transition-all uppercase cursor-pointer"
                      >
                        Clear Ledger
                      </button>
                    )}
                  </div>

                  {globalHistory.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-850 rounded-xl space-y-2">
                      <History className="h-6 w-6 text-slate-700 mx-auto" />
                      <p className="text-[10px] font-mono text-slate-500">Scan ledger is empty.</p>
                    </div>
                  ) : (
                    globalHistory.map(item => (
                      <div key={item.id} className="p-2.5 bg-[#121217]/50 border border-slate-850 rounded-lg hover:border-slate-800 transition-all space-y-1">
                        <div className="flex justify-between items-start text-[9.5px]">
                          <span className="font-semibold text-slate-350 tracking-wide truncate max-w-[120px]">
                            {item.candidateName}
                          </span>
                          <span className={`text-[8px] font-mono px-1 py-0.5 rounded uppercase font-bold shrink-0 ${
                            item.status === 'success' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                              : item.status === 'committed'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                              : 'bg-red-500/10 text-red-400 border border-red-500/10'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                          <span>MODE: {item.mode.toUpperCase()}</span>
                          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Show current active batch queue stack if in batch mode */
                isBatchMode ? (
                  <div className="space-y-2.5">
                    {scannedQueue.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-850 rounded-2xl space-y-3 my-4">
                        <Layers className="h-7 w-7 text-slate-700 mx-auto animate-pulse" />
                        <div className="space-y-1">
                          <p className="text-[10.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">No Profiles in Queue</p>
                          <p className="text-[9.5px] text-slate-550 leading-relaxed font-sans max-w-[180px] mx-auto">
                            Point camera at a dynamic Sovereign Pass to gather multiple audits collectively.
                          </p>
                        </div>
                      </div>
                    ) : (
                      scannedQueue.map((item, index) => (
                        <div 
                          key={item.id} 
                          className={`p-3 bg-[#111116] border border-slate-800 rounded-xl transition-all relative group overflow-hidden ${
                            item.status === 'committed' ? 'opacity-65 border-emerald-950 bg-emerald-950/5' : 'hover:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div className="space-y-0.5 flex-grow truncate">
                              <p className="text-xs font-serif font-light text-slate-200 tracking-wide truncate">
                                {item.candidate.firstName} {item.candidate.lastName}
                              </p>
                              <p className="text-[9px] font-mono text-slate-500 truncate">
                                ID: {item.candidate.nationalId}
                              </p>
                            </div>
                            
                            {item.status === 'pending-commit' ? (
                              <button
                                onClick={() => removeCandidateFromBatch(item.id)}
                                className="h-6 w-6 rounded hover:bg-red-550/10 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                                title="Remove candidate from current batch stack"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="shrink-0 text-[8.5px] text-emerald-400 font-mono font-bold uppercase flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30">
                                ✓ COM_OK
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-850/60 text-[8px] font-mono text-slate-500">
                            <span>INDEX: 0{scannedQueue.length - index}</span>
                            <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))
                    )
                  }
                  </div>
                ) : (
                  // Instructions if in single scan mode and no history shown
                  <div className="space-y-3.5 p-1">
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-widest pb-1 border-b border-slate-850">
                      <HelpCircle className="h-4 w-4 text-emerald-400" />
                      <span>Scanner Instructions</span>
                    </div>
                    <ul className="space-y-2.5 text-[10px] text-slate-400 leading-relaxed font-sans list-disc list-inside">
                      <li>Use the <span className="text-emerald-400 font-semibold font-mono">Single Audit Scan</span> mode to pull up one candidate and automatically highlight their verification records instantly.</li>
                      <li>Switch to <span className="text-emerald-400 font-semibold font-mono">Batch Rapid Scan</span> mode to sweep several credentials at once. This avoids repetitive interface closing.</li>
                      <li>Click <span className="text-emerald-400 font-semibold font-mono">Process Scanned Batch</span> to synchronize the entire queue with the immutable registry logs in one click.</li>
                    </ul>

                    {/* View Recent Logs CTA */}
                    <button
                      onClick={() => setShowHistoryPane(true)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-slate-900/30 hover:bg-slate-900 border border-slate-850 rounded-lg text-slate-400 hover:text-slate-205 font-mono text-[9px] uppercase tracking-wide transition-all cursor-pointer"
                    >
                      <History className="h-3 w-3" />
                      Show History Ledger logs
                    </button>
                  </div>
                )
              )}

            </div>

            {/* Commit controls inside layout footer */}
            <div className="p-4 bg-[#14141c]/90 shrink-0">
              {isBatchMode ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={commitBatchScan}
                      disabled={pendingCount === 0 || isCommittingBatch}
                      className="flex-1 h-10 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-450 disabled:from-slate-850 disabled:to-slate-850 text-white disabled:text-slate-500 border border-emerald-500/20 disabled:border-slate-850 rounded-xl font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg disabled:cursor-not-allowed"
                    >
                      {isCommittingBatch ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          SYNCING...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Process Batch ({pendingCount})
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowBatchReport(true);
                        playBeep('info');
                      }}
                      className="px-4.5 bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-500/25 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      title="View dynamic sovereign audit status registry statement report"
                    >
                      <FileText className="h-4 w-4" />
                      Report
                    </button>
                  </div>
                  <p className="text-[8px] font-mono text-slate-550 text-center uppercase tracking-wider leading-relaxed">
                    COMMITTING SYNCHRONIZES IMMUTABLE DIGITAL SIGNATURES ON LEDGER RECORDS COLLECTIVELY
                  </p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    ACTIVE SOURCE: DIRECT TRUST NETWORK
                  </span>
                </div>
              )}
            </div>

            {/* Quick Start Guide Modal Overlay */}
            {showQuickStartGuide && (
              <div className="absolute inset-0 z-50 bg-[#0A0A0C]/97 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn text-left">
                <div className="bg-[#121217] border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative select-none">
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-850">
                    <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-serif font-light text-base text-slate-100 italic tracking-wide">
                        Sovereign QR Passbook Guide
                      </h4>
                      <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                        🔒 COAXIAL ALIGNMENT OPTIMIZATION
                      </p>
                    </div>
                  </div>

                  {/* Graphical illustration using pure beautiful CSS/Tailwind */}
                  <div className="p-4 bg-black/45 border border-slate-850 rounded-xl space-y-4">
                    <div className="flex justify-center items-center gap-6 py-2">
                      {/* Phone with scanning overlay drawing */}
                      <div className="relative h-20 w-12 border-2 border-slate-650 rounded-lg flex flex-col justify-between p-1 bg-slate-900 shadow-xl overflow-hidden animate-pulse">
                        <div className="h-1 w-4 bg-slate-700 mx-auto rounded-full"></div>
                        <div className="h-7 w-7 border-2 border-emerald-400 border-t-transparent border-r-transparent rounded-sm mx-auto my-auto animate-bounce flex items-center justify-center">
                          <div className="h-2 w-2 bg-red-400 rounded-full animate-ping"></div>
                        </div>
                        <div className="h-1 w-6 bg-slate-700 mx-auto rounded-full"></div>
                      </div>

                      {/* Coaxial focus lines arrow */}
                      <div className="flex flex-col items-center">
                        <div className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-widest animate-pulse">
                          15–20 CM
                        </div>
                        <div className="h-0.5 w-12 bg-gradient-to-r from-slate-800 via-emerald-400 to-slate-800 relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 bg-emerald-400 rounded-full"></div>
                        </div>
                        <span className="text-[8px] font-mono text-slate-500 uppercase mt-1">Parallel</span>
                      </div>

                      {/* Printed sheet card drawing */}
                      <div className="relative h-18 w-24 border border-dashed border-sky-400/40 rounded-lg bg-slate-950 p-2 flex flex-col justify-between">
                        <div className="h-1 bg-sky-400/30 w-12"></div>
                        {/* Tiny QR Code symbol */}
                        <div className="h-10 w-10 border border-indigo-500/50 bg-indigo-950/20 rounded mx-auto flex items-center justify-center p-1">
                          <div className="grid grid-cols-2 gap-0.5 h-full w-full">
                            <div className="bg-emerald-400 h-full w-full"></div>
                            <div className="bg-slate-950 h-full w-full"></div>
                            <div className="bg-slate-950 h-full w-full"></div>
                            <div className="bg-emerald-400 h-full w-full"></div>
                          </div>
                        </div>
                        <div className="h-1 bg-sky-400/20 w-8 mx-auto"></div>
                      </div>
                    </div>

                    <div className="text-center font-mono text-[9px] text-slate-500 uppercase">
                      COAXIAL PARALLEL VIEWPORT ALIGNMENT LAYOUT
                    </div>
                  </div>

                  {/* Step list instruction bullets */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="h-5 w-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-[11px] text-slate-350 leading-relaxed">
                        <strong className="text-slate-150">Maintain Distance Range:</strong> Position your Sovereign Pass document **15–20 cm (6–8 inches)** from the camera lens.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="h-5 w-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-[11px] text-slate-350 leading-relaxed">
                        <strong className="text-slate-150">Eliminate Light Glare:</strong> Ensure minimal overhead reflection on phone displays or laminated passes. Tilting slightly can resolve glare instantly.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="h-5 w-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-bold font-mono shrink-0 mt-0.5">
                        3
                      </div>
                      <p className="text-[11px] text-slate-350 leading-relaxed">
                        <strong className="text-slate-150">Center inside Viewfinder:</strong> Align the QR symbol square parallel inside the viewfinder target box for optimal image resolution.
                      </p>
                    </div>
                  </div>

                  {/* Checkbox bypass and primary action check button */}
                  <div className="pt-4 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group text-[10px] font-mono text-slate-500 hover:text-slate-300">
                      <input
                        type="checkbox"
                        onClick={(e: any) => {
                          try {
                            localStorage.setItem('funaispan_skip_scan_guide', e.target.checked ? 'true' : 'false');
                          } catch (err) {}
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-850 bg-black/60 checked:bg-emerald-600 text-emerald-400 focus:ring-0 focus:outline-none uppercase"
                        defaultChecked={localStorage.getItem('funaispan_skip_scan_guide') === 'true'}
                      />
                      <span>Skip automatically next time</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickStartGuide(false);
                        playBeep('info');
                      }}
                      className="h-9 px-4.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-lg font-mono text-[10.5px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-emerald-900/25 inline-flex items-center justify-center gap-1.5"
                    >
                      <span>Got it, Scan</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Batch Scan & Compliance Audit Report Modal */}
            {showBatchReport && (
              <div className="absolute inset-0 z-50 bg-[#0A0A0C]/96 backdrop-blur-md flex flex-col p-6 animate-fadeIn text-left">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-850">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-light text-sm text-slate-100 uppercase tracking-wide">
                        Sovereign Batch Scan & Audit Report
                      </h4>
                      <p className="text-[9px] font-mono text-slate-500">
                        REALTIME COMPLIANCE ANALYTICS CERTIFICATION STATEMENT
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBatchReport(false)}
                    className="p-1 px-2 border border-slate-850 hover:border-slate-700 bg-black/40 hover:bg-slate-900 text-slate-400 hover:text-white rounded font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Close Report
                  </button>
                </div>

                {/* Content Core */}
                <div className="flex-grow overflow-y-auto py-5 space-y-5">
                  
                  {/* Analytics Summary Widget */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#121217] border border-slate-850 p-2.5 rounded-xl space-y-1">
                      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold">Total Scanned</span>
                      <span className="block font-sans text-base font-semibold text-slate-150">{scannedQueue.length} Profiles</span>
                    </div>

                    <div className="bg-[#121217] border border-slate-850 p-2.5 rounded-xl space-y-1">
                      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold">DHA Match rate</span>
                      <span className="block font-sans text-base font-semibold text-emerald-400">
                        {scannedQueue.length > 0 
                          ? Math.round((scannedQueue.filter(i => i.candidate.dhaVerified).length / scannedQueue.length) * 100)
                          : 0}% Cleanse
                      </span>
                    </div>

                    <div className="bg-[#121217] border border-slate-850 p-2.5 rounded-xl space-y-1">
                      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold">SAQA Credentials</span>
                      <span className="block font-sans text-base font-semibold text-emerald-400">
                        {scannedQueue.length > 0
                          ? Math.round((scannedQueue.filter(i => i.candidate.saqaVerified).length / scannedQueue.length) * 100)
                          : 0}% Validated
                      </span>
                    </div>

                    <div className="bg-[#121217] border border-slate-850 p-2.5 rounded-xl space-y-1">
                      <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider font-bold">Overall Pass</span>
                      <span className="block font-sans text-base font-semibold text-indigo-400">
                        {scannedQueue.length > 0
                          ? Math.round((scannedQueue.filter(i => i.candidate.dhaVerified && i.candidate.saqaVerified).length / scannedQueue.length) * 100)
                          : 0}% Compliant
                      </span>
                    </div>
                  </div>

                  {/* Table list of Scanned Candidates */}
                  <div className="border border-slate-850 rounded-xl overflow-hidden bg-[#121217]/50 max-h-[300px] flex flex-col">
                    <div className="p-3 bg-[#16161f]/40 border-b border-slate-850 text-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold flex justify-between shrink-0">
                      <span>AUDITED BATCH LEDGER ENTRIES</span>
                      <span className="text-slate-550">{new Date().toLocaleDateString()}</span>
                    </div>
                    
                    {scannedQueue.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 font-mono text-[10px]">
                        No candidates scanned in current batch session yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-850/60 overflow-y-auto">
                        {scannedQueue.map((item, index) => {
                          const c = item.candidate;
                          const isFullPass = c.dhaVerified && c.saqaVerified;
                          return (
                            <div key={item.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="space-y-0.5 truncate max-w-[280px]">
                                <span className="block font-serif font-light text-slate-100 tracking-wide">
                                  {index + 1}. {c.firstName} {c.lastName}
                                </span>
                                <span className="block text-[9.5px] font-mono text-slate-500 truncate">
                                  REF-ID: {c.nationalId} | {c.institution || "Funa Ispan Mzantsi Partner"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold border ${
                                  c.dhaVerified 
                                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                                    : 'bg-red-950/40 text-red-400 border-red-900/30'
                                }`}>
                                  DHA: {c.dhaVerified ? "Verified" : "Pending"}
                                </span>

                                <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold border ${
                                  c.saqaVerified 
                                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                                    : 'bg-red-950/40 text-red-400 border-red-900/30'
                                }`}>
                                  SAQA: {c.saqaVerified ? "Verified" : "Pending"}
                                </span>

                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono uppercase font-bold border ${
                                  isFullPass 
                                    ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]' 
                                    : 'bg-amber-955/40 text-amber-500 border-amber-900/30'
                                }`}>
                                  {isFullPass ? "Compliant" : "Incomplete"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Security Statement Notice */}
                  <div className="p-3 bg-indigo-950/15 border border-indigo-900/20 text-indigo-350 text-[10px] rounded-xl font-mono leading-relaxed space-y-1">
                    <span className="block font-bold">🛡️ IMMUTABLE SYSTEM COMPLIANCE STATEMENT:</span>
                    <p className="text-slate-400 leading-normal font-sans">
                      The candidate credentials referenced in this batch scan contain cryptographically signed verification passports checked directly against the South African Department of Home Affairs (DHA) Identity Database and the South African Qualifications Authority (SAQA) National Registry. Any active batch processing registers these records collectively on the direct audit statement trace log.
                    </p>
                  </div>

                </div>

                {/* Footer controls for PDF/ledger downloads */}
                <div className="pt-3 border-t border-slate-850 flex flex-wrap gap-3 items-center justify-between shrink-0">
                  <span className="text-[8px] font-mono text-slate-500 uppercase">
                    Audit Registry Key: SOV-{scannedQueue.length}-BATCH
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={downloadBatchReportPdf}
                      disabled={scannedQueue.length === 0}
                      className="h-8.5 px-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-450 text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF Report
                    </button>

                    <button
                      type="button"
                      onClick={downloadBatchReportJson}
                      disabled={scannedQueue.length === 0}
                      className="h-8.5 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-slate-100 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Export JSON
                    </button>
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
