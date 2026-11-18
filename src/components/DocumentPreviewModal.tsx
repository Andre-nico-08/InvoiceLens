import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { InvoiceRow } from '../types/invoice';

interface DocumentPreviewModalProps {
  row: InvoiceRow | null;
  onClose: () => void;
}

export function DocumentPreviewModal({ row, onClose }: DocumentPreviewModalProps) {
  useEffect(() => {
    if (!row) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [row, onClose]);

  if (!row || !row.previewUrl) return null;

  const isPdf = row.mimeType === 'application/pdf';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            <h3
              id="preview-modal-title"
              className="truncate text-base font-semibold text-slate-900"
            >
              {row.fileName}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {row.fornitore ?? 'Fornitore non rilevato'}
              {row.numero_documento ? ` · Doc. ${row.numero_documento}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi anteprima documento"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          {isPdf ? (
            <iframe
              src={row.previewUrl}
              title={`Anteprima PDF ${row.fileName}`}
              className="h-[72vh] w-full rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <img
              src={row.previewUrl}
              alt={`Anteprima fattura ${row.fileName}`}
              referrerPolicy="no-referrer"
              className="mx-auto max-h-[72vh] w-auto rounded-lg border border-slate-200 bg-white object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
