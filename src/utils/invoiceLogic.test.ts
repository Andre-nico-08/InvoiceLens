import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExcelWorkbookRows,
  calculateSummaryTotals,
  checkMathConsistency,
  createDemoInvoices,
  isSupportedInvoiceFile,
  normalizeExtractedInvoice,
  parseCurrencyInput,
} from './invoiceLogic';

test('normalizeExtractedInvoice preserves valid fields and converts missing/empty fields to null', () => {
  const result = normalizeExtractedInvoice({
    data: '2026-10-15',
    fornitore: 'Acme Italia S.r.l.',
    numero_documento: '',
    imponibile: '1.200,50',
    iva: null,
    totale: 1464.61,
  });

  assert.deepEqual(result, {
    data: '2026-10-15',
    fornitore: 'Acme Italia S.r.l.',
    numero_documento: null,
    imponibile: 1200.5,
    iva: null,
    totale: 1464.61,
  });
});

test('parseCurrencyInput handles Italian and English decimal formats cleanly', () => {
  assert.equal(parseCurrencyInput('1.234,56 €'), 1234.56);
  assert.equal(parseCurrencyInput('1,234.56'), 1234.56);
  assert.equal(parseCurrencyInput('450,5'), 450.5);
  assert.equal(parseCurrencyInput('450.50'), 450.5);
  assert.equal(parseCurrencyInput(''), null);
  assert.equal(parseCurrencyInput('null'), null);
  assert.equal(parseCurrencyInput('abc'), null);
});

test('checkMathConsistency detects matching, mismatched, and incomplete totals', () => {
  assert.equal(
    checkMathConsistency({
      data: '2026-11-01',
      fornitore: 'Test',
      numero_documento: '1',
      imponibile: 100,
      iva: 22,
      totale: 122,
    }),
    'match'
  );

  assert.equal(
    checkMathConsistency({
      data: '2026-11-01',
      fornitore: 'Test',
      numero_documento: '1',
      imponibile: 100,
      iva: 22,
      totale: 125,
    }),
    'mismatch'
  );

  assert.equal(
    checkMathConsistency({
      data: '2026-11-01',
      fornitore: 'Test',
      numero_documento: '1',
      imponibile: 100,
      iva: null,
      totale: 122,
    }),
    'incomplete'
  );
});

test('calculateSummaryTotals aggregates rows, missing fields, and mismatches', () => {
  const demo = createDemoInvoices();
  const summary = calculateSummaryTotals(demo);

  assert.equal(summary.count, 3);
  assert.equal(summary.totaleImponibile, 1988.5);
  assert.equal(summary.totaleIva, 367.07);
  assert.equal(summary.totaleGenerale, 2425.97);
  assert.equal(summary.missingFieldCount, 2); // numero_documento & iva in demo-3
  assert.equal(summary.mismatchCount, 0);
});

test('isSupportedInvoiceFile validates JPG, PNG, PDF and file size limit', () => {
  assert.equal(isSupportedInvoiceFile({ name: 'doc.pdf', type: 'application/pdf', size: 1024 }).valid, true);
  assert.equal(isSupportedInvoiceFile({ name: 'img.jpg', type: 'image/jpeg', size: 1024 }).valid, true);
  assert.equal(isSupportedInvoiceFile({ name: 'scan.png', type: 'image/png', size: 1024 }).valid, true);
  assert.equal(isSupportedInvoiceFile({ name: 'doc.docx', type: 'application/msword', size: 1024 }).valid, false);
  assert.equal(
    isSupportedInvoiceFile({ name: 'huge.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 }).valid,
    false
  );
});

test('buildExcelWorkbookRows maps rows with exact requested columns and null preservation', () => {
  const demo = createDemoInvoices();
  const exportRows = buildExcelWorkbookRows(demo);

  assert.equal(exportRows.length, 3);
  assert.deepEqual(exportRows[2], {
    Data: '2026-11-15',
    Fornitore: 'Tipografia Moderna Milano',
    'Numero Documento': null,
    Imponibile: 320,
    IVA: null,
    Totale: 390.4,
    'File Origine': 'fattura_scansione_parziale.png',
    Stato: 'Da verificare',
  });
});
