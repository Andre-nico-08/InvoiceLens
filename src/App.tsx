import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Header } from './components/Header';
import { UploadDropzone } from './components/UploadDropzone';
import { VerificationTable } from './components/VerificationTable';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { HowItWorks } from './components/HowItWorks';
import type { InvoiceFields, InvoiceRow, PendingUpload } from './types/invoice';
import {
  calculateSummaryTotals,
  createDemoInvoices,
  isSupportedInvoiceFile,
  normalizeExtractedInvoice,
} from './utils/invoiceLogic';
import { exportInvoicesToExcel } from './utils/excelExport';

interface BannerNotice {
  type: 'error' | 'success';
  message: string;
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [notice, setNotice] = useState<BannerNotice | null>(null);
  const [previewRow, setPreviewRow] = useState<InvoiceRow | null>(null);

  // Clean up object URLs on unmount
  const objectUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const summary = useMemo(() => calculateSummaryTotals(rows), [rows]);

  function handleQuickUploadClick() {
    fileInputRef.current?.click();
  }

  async function processSingleFile(file: File) {
    const validation = isSupportedInvoiceFile(file);
    if (!validation.valid) {
      setNotice({
        type: 'error',
        message: validation.error || 'File non valido.',
      });
      return;
    }

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPendingUploads((prev) => [
      ...prev,
      { tempId, fileName: file.name, mimeType: file.type },
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-invoice', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        fileName?: string;
        mimeType?: string;
        fields?: unknown;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Estrazione non riuscita.');
      }

      const fields = normalizeExtractedInvoice(payload.fields);
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl);

      const newRow: InvoiceRow = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: payload.fileName || file.name,
        mimeType: payload.mimeType || file.type,
        previewUrl,
        ...fields,
        status: 'extracted',
        createdAt: Date.now(),
      };

      setRows((prev) => [newRow, ...prev]);
      setNotice({
        type: 'success',
        message: `Fattura "${file.name}" estratta correttamente. Verifica i campi in tabella prima di esportare.`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : `Errore durante l'estrazione di "${file.name}".`;
      setNotice({ type: 'error', message: msg });
    } finally {
      setPendingUploads((prev) => prev.filter((item) => item.tempId !== tempId));
    }
  }

  function handleFilesSelected(fileList: FileList | File[]) {
    setNotice(null);
    const files = Array.from(fileList);
    for (const file of files) {
      void processSingleFile(file);
    }
  }

  function handleUpdateField<K extends keyof InvoiceFields>(
    id: string,
    field: K,
    value: InvoiceFields[K]
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          [field]: value,
        };
      })
    );
  }

  function handleToggleVerified(id: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          status: row.status === 'verified' ? 'extracted' : 'verified',
        };
      })
    );
  }

  function handleDeleteRow(id: string) {
    setRows((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((r) => r.id !== id);
    });
    if (previewRow?.id === id) {
      setPreviewRow(null);
    }
  }

  function handleAddManualRow() {
    const newRow: InvoiceRow = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: 'Inserimento manuale',
      mimeType: 'text/plain',
      previewUrl: null,
      data: null,
      fornitore: null,
      numero_documento: null,
      imponibile: null,
      iva: null,
      totale: null,
      status: 'manual',
      createdAt: Date.now(),
    };
    setRows((prev) => [newRow, ...prev]);
  }

  function handleClearAll() {
    for (const row of rows) {
      if (row.previewUrl) {
        URL.revokeObjectURL(row.previewUrl);
      }
    }
    setRows([]);
    setPreviewRow(null);
    setNotice(null);
  }

  function handleLoadDemo() {
    const demoRows = createDemoInvoices();
    setRows((prev) => [...demoRows, ...prev]);
    setNotice({
      type: 'success',
      message:
        'Caricate 3 fatture di esempio. Modifica qualsiasi campo in tabella o clicca "Esporta Excel".',
    });
  }

  function handleExportExcel() {
    if (rows.length === 0) return;
    const fileName = exportInvoicesToExcel(rows);
    setNotice({
      type: 'success',
      message: `File Excel "${fileName}" scaricato con ${rows.length} ${
        rows.length === 1 ? 'fattura' : 'fatture'
      }.`,
    });
  }

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      <Header onQuickUploadClick={handleQuickUploadClick} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <UploadDropzone
          fileInputRef={fileInputRef}
          isProcessing={pendingUploads.length > 0}
          pendingCount={pendingUploads.length}
          hasRows={rows.length > 0}
          onFilesSelected={handleFilesSelected}
          onLoadDemo={handleLoadDemo}
        />

        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mb-2 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
              notice.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {notice.type === 'error' ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              ) : (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
              )}
              <span>{notice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Chiudi avviso"
              className="rounded p-1 opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <VerificationTable
          rows={rows}
          pendingUploads={pendingUploads}
          summary={summary}
          onUpdateField={handleUpdateField}
          onToggleVerified={handleToggleVerified}
          onDeleteRow={handleDeleteRow}
          onAddManualRow={handleAddManualRow}
          onClearAll={handleClearAll}
          onExportExcel={handleExportExcel}
          onPreviewRow={setPreviewRow}
          onLoadDemo={handleLoadDemo}
        />

        <HowItWorks />
      </main>

      <DocumentPreviewModal row={previewRow} onClose={() => setPreviewRow(null)} />
    </div>
  );
}
