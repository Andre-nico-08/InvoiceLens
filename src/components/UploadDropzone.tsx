import { useRef, useState, type ChangeEvent, type DragEvent, type RefObject } from 'react';
import { FileUp, FileSpreadsheet, Loader2 } from 'lucide-react';

interface UploadDropzoneProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isProcessing: boolean;
  pendingCount: number;
  hasRows: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadDemo: () => void;
}

export function UploadDropzone({
  fileInputRef,
  isProcessing,
  pendingCount,
  onFilesSelected,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  }

  return (
    <section id="caricamento" aria-labelledby="upload-heading" className="pt-8 pb-6 sm:pt-10">
      <div className="mb-6">
        <h1
          id="upload-heading"
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-balance"
        >
          Estrai e verifica i dati delle tue fatture
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
          Carica immagini JPG, PNG o documenti PDF. I campi contabili vengono estratti in JSON,
          controllati nella tabella modificabile ed esportati in formato Excel.
        </p>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative rounded-xl border border-dashed bg-white p-6 transition-colors duration-150 sm:p-8 ${
          isDragging
            ? 'border-blue-700 bg-blue-50/40'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          id="invoice-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          multiple
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Seleziona file fatture JPG, PNG o PDF"
        />

        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${
                isDragging
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-700" aria-hidden="true" />
              ) : (
                <FileUp className="h-5 w-5" aria-hidden="true" />
              )}
            </div>

            <div>
              <p className="text-base font-semibold text-slate-900">
                {isProcessing
                  ? `Analisi in corso (${pendingCount} ${
                      pendingCount === 1 ? 'documento' : 'documenti'
                    })...`
                  : 'Trascina qui le fatture oppure seleziona i file dal computer'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                <span>Formati supportati: JPG, PNG, PDF</span>
                <span aria-hidden="true">·</span>
                <span>Dimensione massima: 15 MB per file</span>
                <span aria-hidden="true">·</span>
                <span>Caricamento multiplo consentito</span>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-3 sm:w-auto sm:shrink-0">
            <label
              htmlFor="invoice-file-input"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-700 sm:w-auto"
            >
              Seleziona file
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
