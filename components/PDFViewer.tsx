'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { extractPdfContent } from '@/lib/vision';
import { setDocumentContent } from '@/lib/tools';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  src: string;
  fileName: string;
  onClose: () => void;
  onProcessComplete?: () => void;
}

function ChevronLeftIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function XIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FileIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function SparklesIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M5 21v-4M3 19h4M21 3v4m0-4h-4m4 16v4m0-4h-4M11 8a4 4 0 118 0 4 4 0 01-8 0z" />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function PDFViewer({ src, fileName, onClose, onProcessComplete }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageCanvases, setPageCanvases] = useState<(HTMLCanvasElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const handleDocumentLoad = useCallback((doc: { numPages: number }) => {
    setNumPages(doc.numPages);
    canvasRefs.current = new Array(doc.numPages).fill(null);
  }, []);

  const handlePageRender = useCallback((pageIndex: number, canvas: HTMLCanvasElement) => {
    canvasRefs.current[pageIndex] = canvas;
    const newCanvases = [...canvasRefs.current];
    setPageCanvases(newCanvases);
  }, []);

  const goToPage = (page: number) => {
    setPageNumber(page);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  const processForTutor = async () => {
    if (processing || processed) return;
    if (!pageCanvases.length || pageCanvases.some((c) => !c)) {
      setError('Pages not fully rendered yet');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const base64Pages = pageCanvases.map((canvas) => {
        if (!canvas) return '';
        return canvas.toDataURL('image/png').split(',')[1];
      }).filter(Boolean);

      const result = await extractPdfContent(base64Pages, 'application/pdf', fileName);
      setDocumentContent(result.text, 'pdf', fileName);
      setProcessed(true);
      onProcessComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-terminal-bg">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-terminal-border bg-terminal-surface">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-terminal-muted hover:text-terminal-accent transition-colors rounded-lg hover:bg-terminal-bg"
            aria-label="Close PDF viewer"
          >
            <XIcon />
          </button>
          <div className="flex items-center gap-2">
            <FileIcon className="text-terminal-accent" />
            <div>
              <p className="font-mono text-sm text-terminal-text truncate max-w-[200px]">{fileName}</p>
              {numPages && (
                <p className="text-xs text-terminal-muted">Page {pageNumber} of {numPages}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-terminal-bg rounded-lg border border-terminal-border p-1">
            <button
              type="button"
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 text-terminal-muted hover:text-terminal-accent disabled:opacity-50 rounded transition-colors"
              aria-label="Zoom out"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            <span className="px-2 text-xs font-mono text-terminal-text w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-1.5 text-terminal-muted hover:text-terminal-accent disabled:opacity-50 rounded transition-colors"
              aria-label="Zoom in"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <Document
          file={src}
          onLoadSuccess={handleDocumentLoad}
          className="max-w-3xl w-full"
        >
          <div className="space-y-4">
            {[...Array(numPages || 0)].map((_, index) => (
              <div key={index} className="relative">
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  onRenderSuccess={() => {
                    const canvas = canvasRefs.current[index];
                    if (canvas) handlePageRender(index, canvas);
                  }}
                  canvasRef={(el) => { canvasRefs.current[index] = el; }}
                  className="shadow-lg shadow-black/50 bg-white"
                />
                {numPages && numPages > 1 && (
                  <div className="absolute bottom-2 right-2 bg-terminal-bg/90 text-terminal-text text-xs font-mono px-2 py-1 rounded">
                    {index + 1} / {numPages}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Document>
      </div>

      {/* Navigation & Actions */}
      <footer className="p-4 border-t border-terminal-border bg-terminal-surface">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={pageNumber === 1}
              className="p-2 text-terminal-muted hover:text-terminal-accent disabled:opacity-50 rounded-lg hover:bg-terminal-bg transition-colors"
              aria-label="First page"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber === 1}
              className="p-2 text-terminal-muted hover:text-terminal-accent disabled:opacity-50 rounded-lg hover:bg-terminal-bg transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>
            <span className="font-mono text-sm text-terminal-text min-w-[80px] text-center">
              Page {pageNumber} of {numPages || '—'}
            </span>
            <button
              type="button"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={numPages !== null && pageNumber === numPages}
              className="p-2 text-terminal-muted hover:text-terminal-accent disabled:opacity-50 rounded-lg hover:bg-terminal-bg transition-colors"
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>
            <button
              type="button"
              onClick={() => numPages !== null && goToPage(numPages)}
              disabled={numPages !== null && pageNumber === numPages}
              className="p-2 text-terminal-muted hover:text-terminal-accent disabled:opacity-50 rounded-lg hover:bg-terminal-bg transition-colors"
              aria-label="Last page"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {processed ? (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-sm cursor-not-allowed"
              >
                <CheckIcon />
                <span>Ready for tutor</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={processForTutor}
                disabled={processing || numPages === null || pageCanvases.length !== numPages}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-accent text-terminal-bg font-mono text-sm font-semibold hover:bg-terminal-accentDim transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon />
                    <span>Process for Tutor</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono" role="alert">
            {error}
          </div>
        )}
      </footer>
    </div>
  );
}