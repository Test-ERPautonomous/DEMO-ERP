/**
 * Universal Printing Utility for Uniqon Workshop ERP
 * Provides 100% functional printing across:
 * - Native browser print dialog
 * - Embedded / Sandboxed iframe environments (with graceful new-tab fallback)
 * - Standalone HTML document export / download
 */

export interface PrintOptions {
  title?: string;
  filename?: string;
  targetElementId?: string;
  extraStyles?: string;
}

/**
 * Generate a complete standalone HTML document string from an element or HTML content
 */
export function generatePrintableHtml(
  contentHtml: string,
  options: { title?: string; extraStyles?: string } = {}
): string {
  const { title = 'Document', extraStyles = '' } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      padding: 24px;
      font-size: 12px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }

    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
      .page-break-inside-avoid {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }

    /* Standard Utilities */
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-black { font-weight: 900; }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }

    .uppercase { text-transform: uppercase; }
    .italic { font-style: italic; }

    /* Colors */
    .text-slate-900 { color: #0f172a; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-700 { color: #334155; }
    .text-slate-600 { color: #475569; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    .text-blue-900 { color: #1e3a8a; }
    .text-blue-950 { color: #172554; }
    .text-emerald-700 { color: #047857; }
    .text-emerald-800 { color: #065f46; }
    .text-rose-600 { color: #e11d48; }
    .text-rose-700 { color: #be123c; }

    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .bg-slate-800 { background-color: #1e293b; }
    .bg-slate-900 { background-color: #0f172a; }
    .bg-blue-50 { background-color: #eff6ff; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-amber-50 { background-color: #fffbeb; }

    /* Layout & Flex */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .items-end { align-items: flex-end; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .justify-end { justify-content: flex-end; }
    .gap-1 { gap: 4px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .gap-6 { gap: 24px; }
    .gap-8 { gap: 32px; }

    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

    /* Borders */
    .border { border: 1px solid #e2e8f0; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .border-slate-200 { border-color: #e2e8f0; }
    .border-slate-300 { border-color: #cbd5e1; }
    .border-slate-400 { border-color: #94a3b8; }
    .border-slate-900 { border-color: #0f172a; }

    .rounded-xs { border-radius: 2px; }
    .rounded { border-radius: 4px; }
    .rounded-lg { border-radius: 8px; }
    .rounded-xl { border-radius: 12px; }

    /* Spacing */
    .p-2 { padding: 8px; }
    .p-3 { padding: 12px; }
    .p-4 { padding: 16px; }
    .p-5 { padding: 20px; }
    .p-6 { padding: 24px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .px-2 { padding-left: 8px; padding-right: 8px; }
    .px-3 { padding-left: 12px; padding-right: 12px; }
    .px-4 { padding-left: 16px; padding-right: 16px; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .space-y-1 > * + * { margin-top: 4px; }
    .space-y-2 > * + * { margin-top: 8px; }
    .space-y-3 > * + * { margin-top: 12px; }
    .space-y-4 > * + * { margin-top: 16px; }

    /* Tables & A4 Print Formatting */
    table, .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th, td {
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      word-wrap: break-word;
    }
    thead tr, th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.02em;
    }

    .print-totals-box {
      border: 1px solid #cbd5e1;
      background-color: #f8fafc;
      padding: 10px 12px;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .print-footer-signatures {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .print-signature-box {
      width: 45%;
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      text-align: center;
      font-size: 10px;
      color: #475569;
    }

    .print-break-before, .page-break-before {
      page-break-before: always;
      break-before: page;
    }

    .print-break-after, .page-break-after {
      page-break-after: always;
      break-after: page;
    }

    .print-avoid-break, .page-break-inside-avoid {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Print instruction bar for standalone tab view */
    .print-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #1e293b;
      color: #ffffff;
      margin: -24px -24px 24px -24px;
      font-size: 13px;
    }
    .print-banner button {
      background: #059669;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 12px;
    }
    .print-banner button:hover {
      background: #047857;
    }

    ${extraStyles}
  </style>
</head>
<body>
  <div class="print-banner no-print">
    <span><strong>Official Document Ready</strong> &bull; ${title}</span>
    <div style="display:flex;gap:8px;">
      <button onclick="window.print()">🖨️ Print Document</button>
      <button onclick="window.close()" style="background:#475569;">Close Window</button>
    </div>
  </div>

  <div id="print-content" class="page-break-inside-avoid">
    ${contentHtml}
  </div>

  <script>
    // Automatically open print dialog once page is fully rendered
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print was prevented by browser:', e);
        }
      }, 400);
    });
  </script>
</body>
</html>`;
}

/**
 * Open the document directly in a clean new top-level browser tab and trigger print
 * This guarantees 100% functionality regardless of iframe sandbox restrictions.
 */
export function openPrintInNewTab(contentHtml: string, title: string = 'Document'): boolean {
  try {
    const fullHtml = generatePrintableHtml(contentHtml, { title });
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
      return true;
    } else {
      // Fallback: create temporary anchor
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }
  } catch (err) {
    console.error('Failed to open print in new tab:', err);
    return false;
  }
}

/**
 * Download document as standalone HTML file (which can be opened in any browser and saved as PDF)
 */
export function downloadPrintableDocument(
  contentHtml: string,
  filename: string = 'document.html',
  title: string = 'Document'
): void {
  try {
    const fullHtml = generatePrintableHtml(contentHtml, { title });
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Failed to download document:', err);
  }
}

/**
 * Execute a reliable print on a DOM element (by element ID or direct HTMLElement)
 * 1. Tries hidden iframe print inside current document.
 * 2. If browser blocks iframe printing (e.g. sandboxed iframe), automatically opens in a new tab.
 */
export function printElement(
  elementOrId: string | HTMLElement,
  options: PrintOptions = {}
): void {
  const element: HTMLElement | null =
    typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) {
    console.warn(`Print target "${elementOrId}" not found in DOM, falling back to window.print()`);
    try {
      window.print();
    } catch {
      // ignore
    }
    return;
  }

  const title = options.title || document.title || 'Uniqon Workshop Document';
  const contentHtml = element.innerHTML;

  // Check if we are inside a restricted iframe
  const isInsideIframe = window.self !== window.top;

  // Create or reuse hidden printing iframe
  let printFrame = document.getElementById('app-print-frame') as HTMLIFrameElement;
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'app-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (!frameDoc) {
    // Direct fallback
    openPrintInNewTab(contentHtml, title);
    return;
  }

  try {
    frameDoc.open();
    frameDoc.write(generatePrintableHtml(contentHtml, { title, extraStyles: options.extraStyles }));
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (printErr) {
        console.warn('Direct frame print was restricted by browser/iframe:', printErr);
        // Fallback to top-level tab
        openPrintInNewTab(contentHtml, title);
      }
    }, 350);
  } catch (err) {
    console.warn('Frame write failed, opening in new tab:', err);
    openPrintInNewTab(contentHtml, title);
  }
}

/**
 * Universal print trigger for raw HTML strings
 */
export function triggerPrint(contentHtml: string, options: string | PrintOptions = 'Document'): void {
  const docTitle = typeof options === 'string' ? options : (options.title || 'Document');
  openPrintInNewTab(contentHtml, docTitle);
}

/**
 * Universal HTML document exporter / downloader
 */
export function downloadHtmlDocument(
  contentHtml: string,
  filename: string = 'document.html',
  options: { title?: string; extraStyles?: string } = {}
): void {
  const fullHtml = generatePrintableHtml(contentHtml, options);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


