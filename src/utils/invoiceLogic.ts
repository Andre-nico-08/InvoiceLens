import type { InvoiceFields, InvoiceRow, InvoiceSummary, MathCheckStatus } from '../types/invoice';

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

export const ALLOWED_EXTENSIONS_LABEL = 'JPG, PNG, PDF';
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export function isSupportedInvoiceFile(file: { type: string; name: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const hasAllowedMime = ALLOWED_MIME_TYPES.has(file.type.toLowerCase());
  const hasAllowedExt = ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'pdf';

  if (!hasAllowedMime && !hasAllowedExt) {
    return {
      valid: false,
      error: `Formato non supportato per "${file.name}". Carica solo file JPG, PNG o PDF.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Il file "${file.name}" supera il limite massimo di 15 MB.`,
    };
  }

  return { valid: true };
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    const str = String(value).trim();
    return str.length > 0 && str.toLowerCase() !== 'null' ? str : null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed === 'N/A' || trimmed === '-') {
    return null;
  }
  return trimmed;
}

export function parseCurrencyInput(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  }
  if (typeof value !== 'string') return null;

  let cleaned = value.trim().replace(/[€$£\s]/g, '');
  if (!cleaned || cleaned.toLowerCase() === 'null') return null;

  // Handle European format like "1.234,56" vs standard "1234.56"
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 -> 1234.56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // 1234,56 -> 1234.56
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

export function normalizeExtractedInvoice(raw: unknown): InvoiceFields {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  return {
    data: normalizeNullableString(obj.data),
    fornitore: normalizeNullableString(obj.fornitore),
    numero_documento: normalizeNullableString(obj.numero_documento),
    imponibile: parseCurrencyInput(obj.imponibile),
    iva: parseCurrencyInput(obj.iva),
    totale: parseCurrencyInput(obj.totale),
  };
}

export function formatCurrencyIT(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumberInputValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  return value.toFixed(2);
}

export function checkMathConsistency(fields: InvoiceFields): MathCheckStatus {
  if (fields.imponibile === null || fields.iva === null || fields.totale === null) {
    return 'incomplete';
  }
  const diff = Math.abs(fields.imponibile + fields.iva - fields.totale);
  return diff <= 0.02 ? 'match' : 'mismatch';
}

export function countMissingFields(fields: InvoiceFields): number {
  let missing = 0;
  if (fields.data === null) missing += 1;
  if (fields.fornitore === null) missing += 1;
  if (fields.numero_documento === null) missing += 1;
  if (fields.imponibile === null) missing += 1;
  if (fields.iva === null) missing += 1;
  if (fields.totale === null) missing += 1;
  return missing;
}

export function calculateSummaryTotals(rows: InvoiceRow[]): InvoiceSummary {
  let totaleImponibile = 0;
  let totaleIva = 0;
  let totaleGenerale = 0;
  let missingFieldCount = 0;
  let mismatchCount = 0;

  for (const row of rows) {
    if (row.imponibile !== null) totaleImponibile += row.imponibile;
    if (row.iva !== null) totaleIva += row.iva;
    if (row.totale !== null) totaleGenerale += row.totale;
    missingFieldCount += countMissingFields(row);
    if (checkMathConsistency(row) === 'mismatch') {
      mismatchCount += 1;
    }
  }

  return {
    count: rows.length,
    totaleImponibile: Math.round(totaleImponibile * 100) / 100,
    totaleIva: Math.round(totaleIva * 100) / 100,
    totaleGenerale: Math.round(totaleGenerale * 100) / 100,
    missingFieldCount,
    mismatchCount,
  };
}

export interface ExcelExportRow {
  Data: string | null;
  Fornitore: string | null;
  'Numero Documento': string | null;
  Imponibile: number | null;
  IVA: number | null;
  Totale: number | null;
  'File Origine': string;
  Stato: string;
}

export function buildExcelWorkbookRows(rows: InvoiceRow[]): ExcelExportRow[] {
  return rows.map((row) => ({
    Data: row.data,
    Fornitore: row.fornitore,
    'Numero Documento': row.numero_documento,
    Imponibile: row.imponibile,
    IVA: row.iva,
    Totale: row.totale,
    'File Origine': row.fileName,
    Stato: row.status === 'verified' ? 'Verificata' : row.status === 'manual' ? 'Manuale' : 'Da verificare',
  }));
}

export function createDemoInvoices(): InvoiceRow[] {
  return [
    {
      id: 'demo-1',
      fileName: 'fattura_studio_rossi_2026.pdf',
      mimeType: 'application/pdf',
      previewUrl: null,
      data: '2026-11-04',
      fornitore: 'Studio Associato Rossi & Partners S.r.l.',
      numero_documento: 'FT-2026/0841',
      imponibile: 1250.0,
      iva: 275.0,
      totale: 1525.0,
      status: 'verified',
      createdAt: Date.now() - 180000,
    },
    {
      id: 'demo-2',
      fileName: 'ricevuta_nord_energia.jpg',
      mimeType: 'image/jpeg',
      previewUrl: null,
      data: '2026-11-12',
      fornitore: 'Nord Energia Forniture S.p.A.',
      numero_documento: '2026-99412-E',
      imponibile: 418.5,
      iva: 92.07,
      totale: 510.57,
      status: 'extracted',
      createdAt: Date.now() - 90000,
    },
    {
      id: 'demo-3',
      fileName: 'fattura_scansione_parziale.png',
      mimeType: 'image/png',
      previewUrl: null,
      data: '2026-11-15',
      fornitore: 'Tipografia Moderna Milano',
      numero_documento: null,
      imponibile: 320.0,
      iva: null,
      totale: 390.4,
      status: 'extracted',
      createdAt: Date.now() - 30000,
    },
  ];
}
