import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  Plus,
  Search,
  Trash2,
  FileText,
} from 'lucide-react';
import type { InvoiceFields, InvoiceRow, InvoiceSummary, PendingUpload } from '../types/invoice';
import {
  checkMathConsistency,
  countMissingFields,
  formatCurrencyIT,
  parseCurrencyInput,
} from '../utils/invoiceLogic';

interface VerificationTableProps {
  rows: InvoiceRow[];
  pendingUploads: PendingUpload[];
  summary: InvoiceSummary;
  onUpdateField: <K extends keyof InvoiceFields>(
    id: string,
    field: K,
    value: InvoiceFields[K]
  ) => void;
  onToggleVerified: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onAddManualRow: () => void;
  onClearAll: () => void;
  onExportExcel: () => void;
  onPreviewRow: (row: InvoiceRow) => void;
  onLoadDemo: () => void;
}

interface NumericCellInputProps {
  value: number | null;
  ariaLabel: string;
  onCommit: (next: number | null) => void;
}

function NumericCellInput({ value, ariaLabel, onCommit }: NumericCellInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft !== null ? draft : value !== null ? value.toFixed(2) : '';
  const isNull = value === null;

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={displayValue}
      placeholder="null"
      onFocus={() => setDraft(value !== null ? value.toFixed(2) : '')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          onCommit(parseCurrencyInput(draft));
          setDraft(null);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={`w-full rounded-md border px-2.5 py-1.5 text-right font-mono text-sm tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/20 ${
        isNull
          ? 'border-amber-300 bg-amber-50/40 text-slate-900 placeholder:text-amber-700/70 focus:border-blue-700'
          : 'border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-blue-700 focus:bg-white'
      }`}
    />
  );
}

export function VerificationTable({
  rows,
  pendingUploads,
  summary,
  onUpdateField,
  onToggleVerified,
  onDeleteRow,
  onAddManualRow,
  onClearAll,
  onExportExcel,
  onPreviewRow,
  onLoadDemo,
}: VerificationTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRows = normalizedQuery
    ? rows.filter((r) => {
        const supplier = (r.fornitore ?? '').toLowerCase();
        const docNum = (r.numero_documento ?? '').toLowerCase();
        const date = (r.data ?? '').toLowerCase();
        const fileName = r.fileName.toLowerCase();
        return (
          supplier.includes(normalizedQuery) ||
          docNum.includes(normalizedQuery) ||
          date.includes(normalizedQuery) ||
          fileName.includes(normalizedQuery)
        );
      })
    : rows;

  const hasContent = rows.length > 0 || pendingUploads.length > 0;

  return (
    <section
      id="tabella-verifica"
      aria-labelledby="verification-heading"
      className="py-6"
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2
            id="verification-heading"
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            Tabella di verifica
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
            <span className="tabular-nums">
              {summary.count} {summary.count === 1 ? 'fattura' : 'fatture'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {summary.missingFieldCount}{' '}
              {summary.missingFieldCount === 1 ? 'campo mancante (null)' : 'campi mancanti (null)'}
            </span>
            {summary.mismatchCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  {summary.mismatchCount}{' '}
                  {summary.mismatchCount === 1 ? 'anomalia importi' : 'anomalie importi'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {rows.length > 0 && (
            <div className="relative min-w-52 flex-1 sm:flex-initial">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtra fornitore o n. doc..."
                aria-label="Filtra righe della tabella"
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
              />
            </div>
          )}

          <button
            type="button"
            onClick={onAddManualRow}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            <Plus className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Aggiungi riga
          </button>

          {rows.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
            >
              Svuota
            </button>
          )}

          <button
            type="button"
            onClick={onExportExcel}
            disabled={rows.length === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 cursor-pointer"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Esporta Excel
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!hasContent ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Nessuna fattura caricata
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
              Carica un file JPG, PNG o PDF nell’area superiore per estrarre automaticamente i dati
              contabili, oppure prova subito con un set di esempio.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onLoadDemo}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Carica fatture di esempio
              </button>
              <button
                type="button"
                onClick={onAddManualRow}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Inserisci riga manuale
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-2 text-xs text-slate-500 md:hidden">
              Scorri orizzontalmente la tabella per visualizzare e modificare tutti i campi.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th scope="col" className="w-32 px-3.5 py-3">
                      Data
                    </th>
                    <th scope="col" className="min-w-72 px-3.5 py-3">
                      Fornitore
                    </th>
                    <th scope="col" className="w-36 px-3.5 py-3">
                      Numero documento
                    </th>
                    <th scope="col" className="w-28 px-3.5 py-3 text-right">
                      Imponibile (€)
                    </th>
                    <th scope="col" className="w-24 px-3.5 py-3 text-right">
                      IVA (€)
                    </th>
                    <th scope="col" className="w-28 px-3.5 py-3 text-right">
                      Totale (€)
                    </th>
                    <th scope="col" className="w-32 px-3.5 py-3">
                      Verifica
                    </th>
                    <th scope="col" className="w-20 px-3.5 py-3 text-right">
                      Azioni
                    </th>
                  </tr>
                </thead>

              <tbody className="divide-y divide-slate-200">
                {pendingUploads.map((pending) => (
                  <tr key={pending.tempId} className="bg-blue-50/20">
                    <td className="px-3.5 py-3">
                      <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="text-xs font-medium text-blue-700 truncate max-w-56">
                        Analisi di {pending.fileName}...
                      </div>
                      <div className="mt-1 h-4 w-40 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="ml-auto h-7 w-20 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="ml-auto h-7 w-16 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="ml-auto h-7 w-20 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-3.5 py-3 text-xs text-slate-500">Estrazione...</td>
                    <td className="px-3.5 py-3" />
                  </tr>
                ))}

                {filteredRows.length === 0 && pendingUploads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                      Nessuna fattura corrisponde al filtro "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    const rowLabel = row.fornitore || row.fileName || `riga ${index + 1}`;
                    const mathStatus = checkMathConsistency(row);
                    const missingCount = countMissingFields(row);
                    const isVerified = row.status === 'verified';

                    return (
                      <tr
                        key={row.id}
                        className="group transition-colors hover:bg-slate-50/70"
                      >
                        {/* Data */}
                        <td className="px-2.5 py-2 align-middle">
                          <input
                            type="text"
                            aria-label={`Data per ${rowLabel}`}
                            value={row.data ?? ''}
                            placeholder="null"
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              onUpdateField(row.id, 'data', val.length > 0 ? val : null);
                            }}
                            className={`w-full rounded-md border px-2.5 py-1.5 font-mono text-sm tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/20 ${
                              row.data === null
                                ? 'border-amber-300 bg-amber-50/40 text-slate-900 placeholder:text-amber-700/70 focus:border-blue-700'
                                : 'border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-blue-700 focus:bg-white'
                            }`}
                          />
                        </td>

                        {/* Fornitore */}
                        <td className="px-2.5 py-2 align-middle">
                          <input
                            type="text"
                            aria-label={`Fornitore per ${rowLabel}`}
                            value={row.fornitore ?? ''}
                            placeholder="null — inserisci fornitore"
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateField(
                                row.id,
                                'fornitore',
                                val.trim().length > 0 ? val : null
                              );
                            }}
                            className={`w-full rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/20 ${
                              row.fornitore === null
                                ? 'border-amber-300 bg-amber-50/40 text-slate-900 placeholder:text-amber-700/70 focus:border-blue-700'
                                : 'border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-blue-700 focus:bg-white'
                            }`}
                          />
                          <div className="px-2.5 text-xs text-slate-400 truncate max-w-64">
                            {row.fileName}
                          </div>
                        </td>

                        {/* Numero Documento */}
                        <td className="px-2.5 py-2 align-middle">
                          <input
                            type="text"
                            aria-label={`Numero documento per ${rowLabel}`}
                            value={row.numero_documento ?? ''}
                            placeholder="null"
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateField(
                                row.id,
                                'numero_documento',
                                val.trim().length > 0 ? val : null
                              );
                            }}
                            className={`w-full rounded-md border px-2.5 py-1.5 font-mono text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700/20 ${
                              row.numero_documento === null
                                ? 'border-amber-300 bg-amber-50/40 text-slate-900 placeholder:text-amber-700/70 focus:border-blue-700'
                                : 'border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-blue-700 focus:bg-white'
                            }`}
                          />
                        </td>

                        {/* Imponibile */}
                        <td className="px-2.5 py-2 align-middle">
                          <NumericCellInput
                            value={row.imponibile}
                            ariaLabel={`Imponibile per ${rowLabel}`}
                            onCommit={(next) => onUpdateField(row.id, 'imponibile', next)}
                          />
                        </td>

                        {/* IVA */}
                        <td className="px-2.5 py-2 align-middle">
                          <NumericCellInput
                            value={row.iva}
                            ariaLabel={`IVA per ${rowLabel}`}
                            onCommit={(next) => onUpdateField(row.id, 'iva', next)}
                          />
                        </td>

                        {/* Totale */}
                        <td className="px-2.5 py-2 align-middle">
                          <NumericCellInput
                            value={row.totale}
                            ariaLabel={`Totale per ${rowLabel}`}
                            onCommit={(next) => onUpdateField(row.id, 'totale', next)}
                          />
                        </td>

                        {/* Stato & Controllo */}
                        <td className="px-3.5 py-2 align-middle">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <button
                              type="button"
                              onClick={() => onToggleVerified(row.id)}
                              className={`inline-flex items-center gap-1.5 text-left font-medium transition-colors cursor-pointer ${
                                isVerified
                                  ? 'text-emerald-700 hover:text-emerald-800'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="whitespace-nowrap">
                                {isVerified ? 'Verificata' : 'Conferma dati'}
                              </span>
                            </button>

                            {mathStatus === 'mismatch' && (
                              <span className="inline-flex items-center gap-1 text-red-700">
                                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span>Somma non torna</span>
                              </span>
                            )}
                            {mathStatus !== 'mismatch' && missingCount > 0 && (
                              <span className="text-amber-800">
                                {missingCount} {missingCount === 1 ? 'campo null' : 'campi null'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Azioni */}
                        <td className="px-3 py-2 text-right align-middle">
                          <div className="inline-flex items-center justify-end gap-1">
                            {row.previewUrl && (
                              <button
                                type="button"
                                onClick={() => onPreviewRow(row)}
                                aria-label={`Anteprima documento ${rowLabel}`}
                                title="Apri anteprima documento"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteRow(row.id)}
                              aria-label={`Elimina fattura ${rowLabel}`}
                              title="Elimina riga"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-blue-700 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Summary Footer Row */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:grid-cols-4 sm:px-6">
            <div>
              <div className="text-xs font-medium text-slate-500">Documenti</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                {summary.count}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Totale Imponibile</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                {formatCurrencyIT(summary.totaleImponibile)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Totale IVA</div>
              <div className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                {formatCurrencyIT(summary.totaleIva)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Totale Complessivo</div>
              <div className="mt-0.5 font-mono text-base font-bold text-slate-900 tabular-nums">
                {formatCurrencyIT(summary.totaleGenerale)}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
