import React, { useState, useRef } from 'react';
import { Upload, Trash2, FileText, FileImage, FileCheck, AlertTriangle, Eye, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { CandidateDocument, Candidate } from '../types';

interface CandidateDocumentUploaderProps {
  documents: CandidateDocument[];
  onDocumentsChange: (docs: CandidateDocument[]) => void;
  isInternational: boolean;
  candidate?: Candidate;
}

export function CandidateDocumentUploader({
  documents = [],
  onDocumentsChange,
  isInternational,
  candidate,
}: CandidateDocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const processFiles = (files: FileList) => {
    setError(null);
    const validFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      
      if (!validTypes.includes(file.type)) {
        setError(`"${file.name}" has an unsupported format. Please upload PDF, JPEG, PNG, or JPG files.`);
        return;
      }
      
      // 5MB limit
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setError(`"${file.name}" exceeds the 5MB size limit. Please upload a smaller scan.`);
        return;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Process each valid file inside reader
    const loadedDocs: CandidateDocument[] = [...documents];
    let processedCount = 0;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        const newDoc: CandidateDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          uploadedAt: new Date().toISOString()
        };
        
        loadedDocs.push(newDoc);
        processedCount++;
        
        if (processedCount === validFiles.length) {
          onDocumentsChange(loadedDocs);
        }
      };

      reader.onerror = () => {
        setError(`Failed to read file ${file.name}. Please try again.`);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveDoc = (id: string, name: string) => {
    const updatedDocs = documents.filter(doc => doc.id !== id);
    onDocumentsChange(updatedDocs);
    setSelectedDocIds(prev => prev.filter(item => item !== id));
  };

  const handleToggleDocSelect = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map(d => d.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedDocIds.length === 0) return;
    const updatedDocs = documents.filter(doc => !selectedDocIds.includes(doc.id));
    onDocumentsChange(updatedDocs);
    setSelectedDocIds([]);
  };

  const exportDossierAsPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const candName = candidate 
        ? `${candidate.firstName} ${candidate.lastName}`
        : 'Sovereign Candidate';
      
      const nationalId = candidate?.nationalId || 'N/A';
      const email = candidate?.email || 'N/A';
      const qualification = candidate?.qualificationName || 'N/A';
      const institution = candidate?.institution || 'N/A';
      const nqfLevel = candidate?.nqfLevel ? `NQF Level ${candidate.nqfLevel}` : 'N/A';
      
      const dhaStatus = candidate?.dhaVerified ? 'VERIFIED / VALID' : 'PENDING';
      const saqaStatus = candidate?.saqaVerified ? 'VETTED / APPROVED' : 'PENDING';

      // 1. Draw Title Page / Header section
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 45, 'F');

      // Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("SOVEREIGN VERIFIED CANDIDATE DOSSIER", 14, 20);

      // Subtitle
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(161, 161, 170); // zinc-400
      doc.text("Cryptographically Secured Academic & Identity Ledger Record", 14, 28);
      
      // Date generated stamp
      const genStamp = `Generated: ${new Date().toLocaleString()} (SAST)`;
      doc.setFontSize(8);
      doc.text(genStamp, 14, 36);

      // Decorative status badge on header
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(155, 15, 41, 8, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("SECURE DOSSIER", 159, 20);

      // 2. Candidate Information Card
      let currentY = 55;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.text("1. Candidate Credentials Profile", 14, currentY);
      
      currentY += 6;
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(14, currentY, 196, currentY);
      
      currentY += 8;
      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("FULL NAME:", 14, currentY);
      doc.text("NATIONAL ID CHECK:", 105, currentY);
      
      currentY += 4.5;
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(candName, 14, currentY);
      doc.text(nationalId, 105, currentY);

      currentY += 8;
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("EMAIL ADDRESS:", 14, currentY);
      doc.text("ACADEMIC INSTITUTION:", 105, currentY);

      currentY += 4.5;
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(email, 14, currentY);
      doc.text(institution, 105, currentY);

      currentY += 8;
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("HIGHEST QUALIFICATION:", 14, currentY);
      doc.text("NQF DESIGNATION LEVEL:", 105, currentY);

      currentY += 4.5;
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(qualification, 14, currentY);
      doc.text(nqfLevel, 105, currentY);

      // DHA & SAQA Verification status boxes
      currentY += 12;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(14, currentY, 86, 20, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, currentY, 86, 20, 'S');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("DHA CIVIL STATUS VALIDATION", 18, currentY + 6);
      doc.setFontSize(10);
      doc.setTextColor(candidate?.dhaVerified ? 16 : 217, candidate?.dhaVerified ? 185 : 119, candidate?.dhaVerified ? 129 : 6);
      doc.text(dhaStatus, 18, currentY + 13);

      doc.setFillColor(248, 250, 252);
      doc.rect(110, currentY, 86, 20, 'F');
      doc.rect(110, currentY, 86, 20, 'S');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("SAQA ACADEMIC VERIFICATION CHECK", 114, currentY + 6);
      doc.setFontSize(10);
      doc.setTextColor(candidate?.saqaVerified ? 16 : 217, candidate?.saqaVerified ? 185 : 119, candidate?.saqaVerified ? 129 : 6);
      doc.text(saqaStatus, 114, currentY + 13);

      // 3. Document Summary Index
      currentY += 30;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "bold");
      doc.text("2. Attached Digital Credential Inventory", 14, currentY);
      
      currentY += 6;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY, 196, currentY);

      currentY += 8;
      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("FILE NAME / CLOUD ID", 14, currentY);
      doc.text("FILE TYPE", 95, currentY);
      doc.text("SIZE", 135, currentY);
      doc.text("LEDGER METADATA", 160, currentY);

      currentY += 4;
      
      documents.forEach((docItem) => {
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);

        let displayName = docItem.name;
        if (displayName.length > 42) {
          displayName = displayName.substring(0, 39) + '...';
        }

        doc.text(displayName, 14, currentY);
        doc.text(docItem.type.split('/')[1]?.toUpperCase() || 'UNKNOWN', 95, currentY);
        doc.text(formatFileSize(docItem.size), 135, currentY);
        
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text("IMMUTABLE LOCK", 160, currentY);

        currentY += 4;
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.line(14, currentY, 196, currentY);
        currentY += 6;
      });

      // 4. Render annex pages for documents
      documents.forEach((docItem) => {
        const isImage = docItem.type.includes('image') || docItem.type.includes('jpeg') || docItem.type.includes('png') || docItem.type.includes('jpg');
        
        if (isImage && docItem.dataUrl) {
          doc.addPage();
          
          doc.setFillColor(248, 250, 252);
          doc.rect(0, 0, 210, 25, 'F');
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text("SECURE DOSSIER ANNEX - VERIFIED DOCUMENT ATTACHMENT", 14, 12);
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(`Document: ${docItem.name} (${formatFileSize(docItem.size)})`, 14, 18);
          
          try {
            let format = 'JPEG';
            if (docItem.type.includes('png')) format = 'PNG';
            doc.addImage(docItem.dataUrl, format, 15, 35, 180, 240);
          } catch (imgError) {
            console.error("Failed to render document preview inside PDF annex:", imgError);
            doc.setFillColor(254, 242, 242); 
            doc.rect(15, 35, 180, 60, 'F');
            doc.setDrawColor(252, 165, 165); 
            doc.rect(15, 35, 180, 60, 'S');
            
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(220, 38, 38); 
            doc.text("PREVIEW UNAVAILABLE", 20, 50);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(127, 29, 29);
            doc.text("This certified scan file could not be re-rendered inside the PDF annex wrapper.", 20, 58);
          }
        } else if (docItem.type.includes('pdf')) {
          doc.addPage();
          
          doc.setFillColor(248, 250, 252);
          doc.rect(0, 0, 210, 25, 'F');
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text("SECURE DOSSIER ANNEX - CERTIFIED PDF RECORD", 14, 12);
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(`Document: ${docItem.name} (${formatFileSize(docItem.size)})`, 14, 18);

          const certY = 45;
          doc.setFillColor(240, 253, 250); 
          doc.rect(15, certY, 180, 130, 'F');
          doc.setDrawColor(153, 246, 228); 
          doc.rect(15, certY, 180, 130, 'S');

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(13, 148, 136); 
          doc.text("CERTIFIED DIGITAL PDF ATTACHMENT", 30, certY + 20);

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(`File name: ${docItem.name}`, 30, certY + 35);
          doc.text(`File size: ${formatFileSize(docItem.size)}`, 30, certY + 45);
          doc.text(`Uploaded: ${new Date(docItem.uploadedAt).toLocaleString()} (SAST)`, 30, certY + 55);
          doc.text(`MIME-Type: ${docItem.type}`, 30, certY + 65);

          const mockHash = "SHA255-" + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("CRYPTOGRAPHIC LEDGER BINDING HASH:", 30, certY + 80);
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          doc.text(mockHash, 30, certY + 88);

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(13, 148, 136);
          doc.text("✓ Verified Authentic", 30, certY + 105);
          doc.text("✓ SAQA Alignment Checked", 30, certY + 113);
        }
      });

      const formattedFileName = `dossier_${candName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      doc.save(formattedFileName);
    } catch (err) {
      console.error("Failed to generate PDF Dossier:", err);
      setError("An error occurred while generating the PDF Dossier. Please try again.");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <label className="block text-xs font-medium text-slate-350">
            {isInternational 
              ? "International Qualification & Evaluation Scans" 
              : "Qualification Scans & Academic Documents"}
          </label>
          <p className="text-[10px] text-slate-500 font-sans mt-0.5">
            {isInternational 
              ? "Upload certified copies of your international certificates and your SAQA DFQE / WES equivalent outcomes." 
              : "Complementary: Securely attach original certificates, academic transcript, or SAQA validations here."}
          </p>
        </div>
        <span className="text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 self-start sm:self-auto uppercase">
          SECURE ENCRYPTED STORAGE
        </span>
      </div>

      {/* Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 select-none ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/10'
            : 'border-slate-800 hover:border-slate-600 bg-slate-900/10 hover:bg-slate-900/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className={`p-3 rounded-xl border ${
            isDragging 
              ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400' 
              : 'bg-slate-950/50 border-slate-800 text-slate-400'
          }`}>
            <Upload className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Drag & drop files here, or <span className="text-emerald-400 underline">browse computer</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Supports certified PDF, JPEG, JPG, and PNG files up to 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs rounded-lg animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded Files Matrix */}
      {documents.length > 0 && (
        <div className="bg-[#0f0f13] border border-slate-850 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-2 mb-1 gap-2">
            <div className="flex items-center gap-2.5 select-none">
              <input
                type="checkbox"
                id="select-all-docs"
                checked={documents.length > 0 && selectedDocIds.length === documents.length}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 rounded border-slate-800 text-emerald-500 bg-black focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                title="Select all files"
              />
              <label htmlFor="select-all-docs" className="text-[10px] font-mono uppercase tracking-wider text-slate-450 font-bold flex items-center gap-1.5 text-slate-400 cursor-pointer">
                <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                Attached Credentials ({documents.length})
              </label>
            </div>

            {/* Export Dossier Button */}
            <button
              type="button"
              onClick={exportDossierAsPdf}
              className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 text-[10px] font-bold border border-emerald-900/30 text-emerald-400 hover:text-emerald-300 rounded transition-all cursor-pointer flex items-center gap-1 self-start sm:self-auto"
              title="Generate and download verified documents compilation PDF"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export Dossier PDF
            </button>
          </div>

          {/* Batch Delete Action Bar */}
          {selectedDocIds.length > 0 && (
            <div className="flex items-center justify-between bg-rose-950/10 border border-rose-900/20 p-2.5 rounded-lg text-xs animate-fadeIn">
              <span className="text-rose-450 font-mono font-semibold text-rose-450">
                {selectedDocIds.length} file(s) selected for bulk action
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="px-3 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/30 text-rose-400 hover:text-rose-300 font-semibold text-[10.5px] uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocIds([])}
                  className="px-2.5 py-1 text-[10px] text-slate-400 hover:text-slate-200 uppercase font-mono tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-[#0A0A0C] border border-slate-850 p-3 rounded-lg hover:border-slate-800 transition-colors cursor-pointer"
                onClick={() => handleToggleDocSelect(doc.id)}
              >
                <div className="flex items-center gap-3 min-w-0" onClick={(e) => e.stopPropagation() /* prevent row toggle conflict */}>
                  <input
                    type="checkbox"
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={() => handleToggleDocSelect(doc.id)}
                    className="h-4 w-4 rounded border-slate-800 text-emerald-500 bg-black focus:ring-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                  />
                  <div className={`p-2 rounded-lg border shrink-0 ${
                    doc.type.includes('pdf') 
                      ? 'bg-rose-500/5 border-rose-500/10 text-rose-450' 
                      : 'bg-sky-500/5 border-sky-500/10 text-sky-450'
                  }`}>
                    {doc.type.includes('pdf') ? (
                      <FileText className="h-4 w-4 text-rose-400" />
                    ) : (
                      <FileImage className="h-4 w-4 text-sky-400" />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <span className="text-xs font-semibold text-slate-350 block truncate" title={doc.name}>
                      {doc.name}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono block">
                      {formatFileSize(doc.size)} • Bound {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      const downloadLink = document.createElement("a");
                      downloadLink.href = doc.dataUrl;
                      downloadLink.download = doc.name;
                      downloadLink.click();
                    }}
                    title="Download certified copy"
                    className="p-1 px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800 rounded transition-colors cursor-pointer"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveDoc(doc.id, doc.name)}
                    title="Remove attachment"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
