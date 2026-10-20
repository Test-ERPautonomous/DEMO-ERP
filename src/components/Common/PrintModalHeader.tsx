import React, { useState } from 'react';
import { Printer, ExternalLink, Download, X, Check } from 'lucide-react';
import { printElement, openPrintInNewTab, downloadPrintableDocument } from '../../utils/printUtils';

interface PrintModalHeaderProps {
  title: string;
  subtitle?: string;
  documentId?: string;
  targetElementId: string;
  onClose: () => void;
  accentColor?: string;
}

export const PrintModalHeader: React.FC<PrintModalHeaderProps> = ({
  title,
  subtitle,
  documentId,
  targetElementId,
  onClose,
  accentColor = '#1e4e79',
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const handlePrint = () => {
    printElement(targetElementId, {
      title: `${title}${documentId ? ` - ${documentId}` : ''}`,
      filename: `${title.toLowerCase().replace(/\s+/g, '_')}_${documentId || 'doc'}`,
    });
  };

  const handleOpenNewTab = () => {
    const el = document.getElementById(targetElementId);
    if (el) {
      openPrintInNewTab(el.innerHTML, `${title}${documentId ? ` - ${documentId}` : ''}`);
    }
  };

  const handleDownload = () => {
    const el = document.getElementById(targetElementId);
    if (el) {
      downloadPrintableDocument(
        el.innerHTML,
        `${title.toLowerCase().replace(/\s+/g, '_')}_${documentId || 'doc'}.html`,
        `${title}${documentId ? ` - ${documentId}` : ''}`
      );
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    }
  };

  return (
    <div
      style={{ backgroundColor: accentColor }}
      className="text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs border-b border-slate-700 select-none"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center border border-white/20">
          <Printer className="w-4 h-4 text-emerald-300" />
        </div>
        <div>
          <div className="font-bold text-xs flex items-center gap-2">
            <span>{title}</span>
            {documentId && (
              <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white/20 rounded font-semibold text-emerald-200">
                {documentId}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-white/70">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        {/* Primary Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          title="Print this document immediately"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>

        {/* Open in New Tab Button (Guaranteed to bypass iframe sandbox restrictions) */}
        <button
          type="button"
          onClick={handleOpenNewTab}
          className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors border border-white/20"
          title="Open document in a dedicated browser tab to print or save as PDF"
        >
          <ExternalLink className="w-3.5 h-3.5 text-sky-200" />
          <span>New Tab</span>
        </button>

        {/* Download Standalone File */}
        <button
          type="button"
          onClick={handleDownload}
          className="px-2.5 py-1 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-semibold rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors border border-white/20"
          title="Download printable HTML document"
        >
          {downloaded ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-amber-200" />
              <span>Save</span>
            </>
          )}
        </button>

        {/* Close Modal */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded text-white/80 hover:text-white transition-colors cursor-pointer ml-1"
          title="Close preview"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
