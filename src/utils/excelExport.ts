import * as XLSX from 'xlsx';
import type { InvoiceRow } from '../types/invoice';
import { buildExcelWorkbookRows } from './invoiceLogic';

export function exportInvoicesToExcel(rows: InvoiceRow[], customFileName?: string): string {
  const worksheetRows = buildExcelWorkbookRows(rows);
  const worksheet = XLSX.utils.json_to_sheet(worksheetRows);

  // Set readable column widths
  worksheet['!cols'] = [
    { wch: 14 }, // Data
    { wch: 34 }, // Fornitore
    { wch: 22 }, // Numero Documento
    { wch: 15 }, // Imponibile
    { wch: 14 }, // IVA
    { wch: 15 }, // Totale
    { wch: 30 }, // File Origine
    { wch: 15 }, // Stato
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fatture');

  const today = new Date().toISOString().slice(0, 10);
  const fileName = customFileName || `InvoiceLens_Fatture_${today}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}
