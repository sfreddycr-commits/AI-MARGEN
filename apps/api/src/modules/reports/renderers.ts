import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { formatDecimal, formatMoney, formatPercent, currencySymbol } from '@aimargen/types';

/**
 * Renderizado de reportes tabulares a CSV, XLSX y PDF (SOP §19).
 * Los valores llegan como strings decimales ya calculados por el motor.
 */
export type ColumnType = 'text' | 'money' | 'percent' | 'number' | 'date';
export interface Column {
  key: string;
  label: string;
  type: ColumnType;
  /** Ancho relativo en PDF. */
  width?: number;
}
export interface TabularReport {
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: Array<Record<string, string | number | null>>;
  notes?: string[];
}
export interface ReportMeta {
  businessName: string;
  currency: string;
  scale: number;
  generatedAt: Date;
}

function display(v: string | number | null, type: ColumnType, meta: ReportMeta): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  switch (type) {
    case 'money':
      return formatMoney(s, meta.currency, meta.scale);
    case 'percent':
      return formatPercent(s);
    case 'number':
      return formatDecimal(s, s.includes('.') ? Math.min(3, s.split('.')[1]!.length) : 0);
    case 'date':
      return s.slice(0, 10).split('-').reverse().join('/');
    default:
      return s;
  }
}

// ---------------------------------------------------------------------------
// CSV (UTF-8 con BOM, separador coma, decimales con punto: legible por cualquier sistema)
// ---------------------------------------------------------------------------
export function toCsv(r: TabularReport): Buffer {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [r.columns.map((c) => esc(c.label)).join(',')];
  for (const row of r.rows) lines.push(r.columns.map((c) => esc(row[c.key])).join(','));
  return Buffer.from('﻿' + lines.join('\r\n') + '\r\n', 'utf8');
}

// ---------------------------------------------------------------------------
// XLSX (celdas numéricas con formato de moneda y porcentaje)
// ---------------------------------------------------------------------------
export async function toXlsx(r: TabularReport, meta: ReportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AImargen';
  wb.created = meta.generatedAt;
  const ws = wb.addWorksheet(r.title.slice(0, 31));
  ws.addRow([r.title]).font = { bold: true, size: 14 };
  ws.addRow([`${meta.businessName} · Generado el ${meta.generatedAt.toLocaleString('es-CR')}`]);
  if (r.subtitle) ws.addRow([r.subtitle]);
  ws.addRow([]);
  const header = ws.addRow(r.columns.map((c) => c.label));
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1A3F' } };
  });
  const sym = currencySymbol(meta.currency).trim();
  const zeros = meta.scale > 0 ? '.' + '0'.repeat(meta.scale) : '';
  for (const row of r.rows) {
    const values = r.columns.map((c) => {
      const v = row[c.key];
      if (v === null || v === undefined || v === '') return null;
      if (c.type === 'money' || c.type === 'percent' || c.type === 'number') return Number(v);
      if (c.type === 'date') return new Date(String(v).slice(0, 10) + 'T12:00:00Z');
      return String(v);
    });
    const added = ws.addRow(values);
    r.columns.forEach((c, i) => {
      const cell = added.getCell(i + 1);
      if (c.type === 'money') cell.numFmt = `"${sym}"#,##0${zeros}`;
      if (c.type === 'percent') cell.numFmt = '0.0%';
      if (c.type === 'date') cell.numFmt = 'dd/mm/yyyy';
    });
  }
  r.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(12, Math.min(40, c.label.length + 6, (c.width ?? 1) * 14));
  });
  for (const n of r.notes ?? []) ws.addRow([n]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
function fontPath(file: string): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const p = join(dir, 'assets', 'fonts', file);
    if (existsSync(p)) return p;
    dir = dirname(dir);
  }
  throw new Error(`No se encontró la fuente ${file}`);
}

const COLORS = {
  deep: '#0A1A3F',
  primary: '#1F5EFF',
  muted: '#5A667A',
  border: '#E2E8F1',
  zebra: '#F3F6FB',
};

export function createPdf(meta: ReportMeta, title: string, landscape = false): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'LETTER',
    layout: landscape ? 'landscape' : 'portrait',
    margins: { top: 48, bottom: 56, left: 44, right: 44 },
    bufferPages: true,
    info: { Title: title, Author: meta.businessName, Creator: 'AImargen' },
  });
  doc.registerFont('regular', fontPath('inter-400.ttf'));
  doc.registerFont('bold', fontPath('inter-700.ttf'));
  doc
    .font('bold')
    .fontSize(9)
    .fillColor(COLORS.primary)
    .text('AImargen', { continued: true })
    .fillColor(COLORS.muted)
    .font('regular')
    .text(`  ·  ${meta.businessName}`);
  doc.moveDown(0.6);
  doc.font('bold').fontSize(18).fillColor(COLORS.deep).text(title);
  doc
    .font('regular')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(
      `Generado el ${meta.generatedAt.toLocaleString('es-CR', { dateStyle: 'long', timeStyle: 'short' })}`,
    );
  doc.moveDown(0.8);
  return doc;
}

export function finishPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - 36;
    doc
      .font('regular')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Página ${i + 1} de ${range.count}`, doc.page.margins.left, y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'right',
        lineBreak: false,
      });
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export function drawTable(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  rows: TabularReport['rows'],
  meta: ReportMeta,
): void {
  const left = doc.page.margins.left;
  const totalWidth = doc.page.width - left - doc.page.margins.right;
  const weights = columns.map((c) => c.width ?? 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / sum) * totalWidth);
  const padX = 5;
  const align = (c: Column) => (c.type === 'text' || c.type === 'date' ? 'left' : 'right');

  const header = () => {
    const y = doc.y;
    doc.rect(left, y, totalWidth, 20).fill(COLORS.deep);
    let x = left;
    doc.font('bold').fontSize(8).fillColor('#FFFFFF');
    columns.forEach((c, i) => {
      doc.text(c.label, x + padX, y + 6, {
        width: widths[i]! - padX * 2,
        align: align(c),
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[i]!;
    });
    doc.y = y + 20;
  };

  header();
  rows.forEach((row, idx) => {
    doc.font('regular').fontSize(8.5);
    const texts = columns.map((c) => display(row[c.key] ?? null, c.type, meta));
    const height = Math.max(
      18,
      ...texts.map((t, i) => doc.heightOfString(t, { width: widths[i]! - padX * 2 }) + 8),
    );
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      header();
    }
    const y = doc.y;
    if (idx % 2 === 1) doc.rect(left, y, totalWidth, height).fill(COLORS.zebra);
    let x = left;
    doc.fillColor('#0F172A');
    texts.forEach((t, i) => {
      const c = columns[i]!;
      doc
        .font(i === 0 ? 'bold' : 'regular')
        .text(t, x + padX, y + 4, { width: widths[i]! - padX * 2, align: align(c) });
      x += widths[i]!;
    });
    doc.y = y + height;
  });
  doc
    .moveTo(left, doc.y)
    .lineTo(left + totalWidth, doc.y)
    .strokeColor(COLORS.border)
    .stroke();
  doc.x = left;
}

export async function toPdf(r: TabularReport, meta: ReportMeta): Promise<Buffer> {
  const doc = createPdf(meta, r.title, r.columns.length > 6);
  if (r.subtitle) {
    doc.font('regular').fontSize(10).fillColor(COLORS.muted).text(r.subtitle);
    doc.moveDown(0.6);
  }
  if (r.rows.length === 0) {
    doc.font('regular').fontSize(11).fillColor('#0F172A').text('No hay datos para este reporte.');
  } else {
    drawTable(doc, r.columns, r.rows, meta);
  }
  if (r.notes?.length) {
    doc.moveDown(1);
    doc.font('regular').fontSize(8.5).fillColor(COLORS.muted);
    for (const n of r.notes) doc.text(n);
  }
  return finishPdf(doc);
}

export { COLORS, display };
