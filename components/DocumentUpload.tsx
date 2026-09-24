'use client';

import { useState, useCallback, useRef } from 'react';
import { setDocumentContent, clearDocumentContent } from '@/lib/tools';

interface DocumentUploadProps {
  onDocumentReady?: (name: string, type: 'image' | 'pdf') => void;
  onOpenPdfViewer?: (src: string, fileName: string) => void;
}

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function DocumentUpload({ onDocumentReady, onOpenPdfViewer }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return 'Unsupported file type. Please upload PNG, JPEG, WebP, GIF, or PDF.';
    }
    if (f.size > MAX_SIZE) {
      return 'File too large. Maximum size is 10MB.';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      setPreview(null);
      return;
    }

    setError(null);
    setFile(selected);
    setSuccess(false);

    const url = URL.createObjectURL(selected);
    setPreview(url);

    // For PDFs, open the viewer automatically
    if (selected.type === 'application/pdf' && onOpenPdfViewer) {
      onOpenPdfViewer(url, selected.name);
    }
  }, [validateFile, onOpenPdfViewer]);

  const removeFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError(null);
    setSuccess(false);
    clearDocumentContent();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [preview]);

  const processFile = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const isPdf = file.type === 'application/pdf';

      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          mimeType: file.type,
          fileName: file.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      const { text, type } = data.result;
      setDocumentContent(text, type, file.name);
      setSuccess(true);
      onDocumentReady?.(file.name, type);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document');
      clearDocumentContent();
    } finally {
      setProcessing(false);
    }
  }, [file, onDocumentReady]);

  if (!file) {
    return (
      <div className="card p-4">
        <div className="flex flex-col items-center justify-center gap-3">
          <label className="flex flex-col items-center gap-3 cursor-pointer p-6 border-2 border-dashed border-terminal-border rounded-xl hover:border-terminal-accent transition-colors w-full max-w-md">
            <div className="flex flex-col items-center gap-2 text-terminal-muted">
              <UploadIcon />
              <span className="font-mono text-sm">Drag & drop or click to upload</span>
              <span className="text-xs">PNG, JPG, WebP, GIF, PDF (max 10MB)</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileSelect}
              className="sr-only"
              id="document-upload"
            />
          </label>
        </div>
      </div>
    );
  }

  const isPdf = file.type === 'application/pdf';

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-terminal-bg border border-terminal-border flex items-center justify-center">
          {isPdf ? <FileIcon /> : <UploadIcon />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm text-terminal-text truncate">{file.name}</p>
              <p className="text-xs text-terminal-muted mt-0.5">
                {(file.size / 1024).toFixed(1)} KB • {isPdf ? 'PDF' : 'Image'}
              </p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              disabled={processing}
              className="flex-shrink-0 p-1 text-terminal-muted hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label="Remove file"
            >
              <XIcon />
            </button>
          </div>

          {!isPdf && preview && (
            <div className="mt-3 relative aspect-video rounded-lg overflow-hidden bg-terminal-bg">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {isPdf && (
            <div className="mt-3 p-3 bg-terminal-bg rounded-lg border border-terminal-border">
              <p className="text-xs text-terminal-muted font-mono">PDF document — preview not available</p>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            {processing ? (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-border text-terminal-muted font-mono text-sm cursor-not-allowed"
              >
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </button>
            ) : success ? (
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm">
                <CheckIcon />
                <span>Ready for tutor</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={processFile}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terminal-accent text-terminal-bg font-mono text-sm font-semibold hover:bg-terminal-accentDim transition-colors focus-visible:ring-2 focus-visible:ring-terminal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg"
              >
                <FileIcon />
                Process for Tutor
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}