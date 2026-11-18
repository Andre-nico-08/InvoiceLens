export interface InvoiceFields {
  data: string | null;
  fornitore: string | null;
  numero_documento: string | null;
  imponibile: number | null;
  iva: number | null;
  totale: number | null;
}

export interface InvoiceRow extends InvoiceFields {
  id: string;
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
  status: 'extracted' | 'verified' | 'manual';
  createdAt: number;
}

export interface PendingUpload {
  tempId: string;
  fileName: string;
  mimeType: string;
}

export interface InvoiceSummary {
  count: number;
  totaleImponibile: number;
  totaleIva: number;
  totaleGenerale: number;
  missingFieldCount: number;
  mismatchCount: number;
}

export type MathCheckStatus = 'match' | 'mismatch' | 'incomplete';
