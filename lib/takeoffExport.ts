/**
 * takeoffExport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional Engineering Quantity Takeoff Export Utility
 * Exports to Excel (.xlsx) and PDF using the two-sided portrait A4 format.
 *
 * Layout:  [No | Dim | Tim | Description] ║ [No | Dim | Tim | Description]
 *           ◄────────── Left ───────────►   ◄────────── Right ──────────►
 *
 * Rules:
 *  - Categories alternate Left / Right (even index → Left, odd → Right)
 *  - A category is NEVER split across sides
 *  - Only Work Items have totals (no category totals)
 *  - Dim / Tim content is unit-sensitive
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as XLSX from 'xlsx';

// ─── Hardcoded constants ──────────────────────────────────────────────────────

const CLIENT     = 'Gulele Sub City';
const CONTRACTOR = 'Abebe GC';
const CONSULTANT = 'Keystone';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TakeOffRow {
  description: string;
  number_of_items: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  unit_mass_per_meter?: number | null;
}

export interface WorkItem {
  item_description: string;
  unit: string;
  category_name: string;
  subcategory_name: string;
  take_off_rows?: TakeOffRow[];
}

export interface Project {
  name: string;
  location?: string;
}

// Internal flat row used for rendering
interface SheetRow {
  type: 'category' | 'subcat' | 'workitem' | 'data' | 'subtotal' | 'spacer';
  /** [no, dim, tim, desc] */
  data: [string, string, string, string];
  /** Estimated height in points (Excel) */
  heightPt: number;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(v: number | null | undefined, dec = 3): string {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(dec);
}

function normalizeUnit(unit: string): string {
  return (unit ?? '').toLowerCase().trim();
}

/**
 * Build the Dim cell content (stacked, newline-separated).
 * Content depends entirely on unit type.
 */
export function buildDim(unit: string, row: TakeOffRow): string {
  const u = normalizeUnit(unit);
  if (u === 'm³' || u === 'm3') {
    return [
      `L: ${fmt(row.length)}`,
      `W: ${fmt(row.width)}`,
      `D: ${fmt(row.depth ?? row.height)}`,
    ].join('\n');
  }
  if (u === 'm²' || u === 'm2') {
    return [`L: ${fmt(row.length)}`, `W: ${fmt(row.width)}`].join('\n');
  }
  if (u === 'm') {
    return `L: ${fmt(row.length)}`;
  }
  if (u === 'kg') {
    return [`L: ${fmt(row.length)}`, `UM: ${fmt(row.unit_mass_per_meter)}`].join('\n');
  }
  // pcs / nr / item — no dimensional data
  return '';
}

/**
 * Build the Tim cell content showing the formula and result.
 * Content depends entirely on unit type.
 */
export function buildTim(unit: string, row: TakeOffRow): string {
  const u  = normalizeUnit(unit);
  const no = Number(row.number_of_items) || 1;

  if (u === 'm³' || u === 'm3') {
    const l = Number(row.length) || 0;
    const w = Number(row.width)  || 0;
    const d = Number(row.depth ?? row.height) || 0;
    return `${no}×${fmt(l)}×${fmt(w)}×${fmt(d)}\n= ${fmt(no * l * w * d)}`;
  }
  if (u === 'm²' || u === 'm2') {
    const l = Number(row.length) || 0;
    const w = Number(row.width)  || 0;
    return `${no}×${fmt(l)}×${fmt(w)}\n= ${fmt(no * l * w)}`;
  }
  if (u === 'm') {
    const l = Number(row.length) || 0;
    return `${no}×${fmt(l)}\n= ${fmt(no * l)}`;
  }
  if (u === 'kg') {
    const l  = Number(row.length)              || 0;
    const um = Number(row.unit_mass_per_meter) || 0;
    return `${no}×${fmt(l)}×${fmt(um)}\n= ${fmt(no * l * um)}`;
  }
  // pcs / nr / item
  return `${no}`;
}

/**
 * Calculate the numeric quantity for a takeoff row.
 */
export function calcQty(unit: string, row: TakeOffRow): number {
  const u  = normalizeUnit(unit);
  const no = Number(row.number_of_items) || 1;
  if (u === 'm³' || u === 'm3')
    return no * (Number(row.length) || 0) * (Number(row.width) || 0) * (Number(row.depth ?? row.height) || 0);
  if (u === 'm²' || u === 'm2')
    return no * (Number(row.length) || 0) * (Number(row.width) || 0);
  if (u === 'm')
    return no * (Number(row.length) || 0);
  if (u === 'kg')
    return no * (Number(row.length) || 0) * (Number(row.unit_mass_per_meter) || 0);
  return no;
}

// ─── Flat row builder ─────────────────────────────────────────────────────────

/**
 * Converts a list of [categoryName, WorkItem[]] pairs into a flat array of
 * SheetRows ready to be rendered onto one "side" of the sheet.
 */
function buildSideRows(categories: [string, WorkItem[]][]): SheetRow[] {
  const rows: SheetRow[] = [];

  for (const [catName, items] of categories) {
    rows.push({
      type: 'category',
      data: [catName, '', '', ''],
      heightPt: 18,
    });

    // Group work items by subcategory, preserving insertion order
    const subMap = new Map<string, WorkItem[]>();
    for (const item of items) {
      const key = item.subcategory_name || '';
      if (!subMap.has(key)) subMap.set(key, []);
      subMap.get(key)!.push(item);
    }

    for (const [subcat, workItems] of subMap) {
      rows.push({
        type: 'subcat',
        data: ['', '', '', `   ${subcat}`],
        heightPt: 14,
      });

      for (const wi of workItems) {
        rows.push({
          type: 'workitem',
          data: ['', '', '', `      ${wi.item_description} (${wi.unit})`],
          heightPt: 14,
        });

        const takeOffRows = wi.take_off_rows ?? [];
        let workTotal = 0;

        for (const tr of takeOffRows) {
          const dim = buildDim(wi.unit, tr);
          const tim = buildTim(wi.unit, tr);
          const qty = calcQty(wi.unit, tr);
          workTotal += qty;

          // Height = number of lines × ~10pt, min 13pt
          const lines = Math.max(
            dim.split('\n').length,
            tim.split('\n').length,
            1,
          );
          rows.push({
            type: 'data',
            data: [
              String(tr.number_of_items ?? 1),
              dim,
              tim,
              `         ${tr.description}`,
            ],
            heightPt: Math.max(lines * 10 + 3, 13),
          });
        }

        if (takeOffRows.length === 0) {
          rows.push({
            type: 'data',
            data: ['', '', '', '         (no takeoff rows)'],
            heightPt: 13,
          });
        }

        // Work item subtotal — NO category totals per spec
        rows.push({
          type: 'subtotal',
          data: [
            '',
            `${workTotal.toFixed(3)}`,
            wi.unit,
            `         Total: ${wi.item_description}`,
          ],
          heightPt: 14,
        });

        // Visual spacer between work items
        rows.push({ type: 'spacer', data: ['', '', '', ''], heightPt: 4 });
      }
    }
  }

  return rows;
}

// ─── Excel style helpers ──────────────────────────────────────────────────────

type XlsxFont  = Record<string, unknown>;
type XlsxFill  = Record<string, unknown>;
type XlsxAlign = Record<string, unknown>;
type XlsxBorder = Record<string, unknown>;
type XlsxStyle = Record<string, unknown>;

const THIN_SIDE = { style: 'thin', color: { rgb: '000000' } };
const BORDER_ALL: XlsxBorder = {
  top: THIN_SIDE, bottom: THIN_SIDE, left: THIN_SIDE, right: THIN_SIDE,
};

function xlFont(opts: {
  bold?: boolean; italic?: boolean; underline?: boolean;
  size?: number; color?: string;
}): XlsxFont {
  return {
    name: 'Arial',
    sz: opts.size ?? 9,
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    underline: opts.underline ?? false,
    color: { rgb: opts.color ?? '000000' },
  };
}

function xlFill(rgb: string): XlsxFill {
  return { fgColor: { rgb }, patternType: 'solid' };
}

function xlAlign(opts: {
  h?: 'left' | 'center' | 'right';
  v?: 'top' | 'center' | 'bottom';
  wrap?: boolean;
} = {}): XlsxAlign {
  return {
    horizontal: opts.h ?? 'left',
    vertical:   opts.v ?? 'top',
    wrapText:   opts.wrap ?? false,
  };
}

function makeStyle(opts: {
  font?:   XlsxFont;
  fill?:   XlsxFill;
  align?:  XlsxAlign;
  border?: XlsxBorder;
}): XlsxStyle {
  const s: XlsxStyle = {};
  if (opts.font)   s['font']      = opts.font;
  if (opts.fill)   s['fill']      = opts.fill;
  if (opts.align)  s['alignment'] = opts.align;
  if (opts.border) s['border']    = opts.border;
  return s;
}

// ─── Pre-built styles ─────────────────────────────────────────────────────────

const S = {
  title: makeStyle({
    font:  xlFont({ bold: true, size: 13 }),
    align: xlAlign({ h: 'center', v: 'center' }),
  }),
  metaLabel: makeStyle({
    font:  xlFont({ bold: true, size: 9 }),
    align: xlAlign({ h: 'left', v: 'center' }),
  }),
  meta: makeStyle({
    font:  xlFont({ size: 9 }),
    align: xlAlign({ h: 'left', v: 'center' }),
  }),
  colHdr: makeStyle({
    font:   xlFont({ bold: true, size: 9, color: 'FFFFFF' }),
    fill:   xlFill('404040'),
    align:  xlAlign({ h: 'center', v: 'center' }),
    border: BORDER_ALL,
  }),
  colHdrSep: makeStyle({
    fill:  xlFill('595959'),
    align: xlAlign({ h: 'center', v: 'center' }),
  }),
  category: makeStyle({
    font:   xlFont({ bold: true, size: 10 }),
    fill:   xlFill('D9D9D9'),
    align:  xlAlign({ h: 'center', v: 'center' }),
    border: BORDER_ALL,
  }),
  subcat: makeStyle({
    font:   xlFont({ bold: true, italic: true, size: 9 }),
    align:  xlAlign({ h: 'left', v: 'top', wrap: true }),
    border: BORDER_ALL,
  }),
  workItem: makeStyle({
    font:   xlFont({ bold: true, size: 9 }),
    align:  xlAlign({ h: 'left', v: 'top', wrap: true }),
    border: BORDER_ALL,
  }),
  data: makeStyle({
    font:   xlFont({ size: 9 }),
    align:  xlAlign({ h: 'left', v: 'top', wrap: true }),
    border: BORDER_ALL,
  }),
  dataNo: makeStyle({
    font:   xlFont({ size: 9 }),
    align:  xlAlign({ h: 'center', v: 'top' }),
    border: BORDER_ALL,
  }),
  dataDim: makeStyle({
    font:   xlFont({ size: 9 }),
    align:  xlAlign({ h: 'right', v: 'top', wrap: true }),
    border: BORDER_ALL,
  }),
  dataTim: makeStyle({
    font:   xlFont({ size: 9 }),
    align:  xlAlign({ h: 'right', v: 'top', wrap: true }),
    border: BORDER_ALL,
  }),
  subtotal: makeStyle({
    font:   xlFont({ bold: true, size: 9 }),
    fill:   xlFill('F2F2F2'),
    align:  xlAlign({ h: 'left', v: 'center', wrap: true }),
    border: BORDER_ALL,
  }),
  subtotalQty: makeStyle({
    font:   xlFont({ bold: true, size: 9 }),
    fill:   xlFill('F2F2F2'),
    align:  xlAlign({ h: 'right', v: 'center' }),
    border: BORDER_ALL,
  }),
  subtotalUnit: makeStyle({
    font:   xlFont({ bold: true, size: 9 }),
    fill:   xlFill('F2F2F2'),
    align:  xlAlign({ h: 'left', v: 'center' }),
    border: BORDER_ALL,
  }),
  empty: makeStyle({
    font:  xlFont({ size: 9 }),
    align: xlAlign(),
  }),
  sep: makeStyle({
    fill:  xlFill('7F7F7F'),
    align: xlAlign(),
  }),
  footer: makeStyle({
    font:  xlFont({ size: 8 }),
    align: xlAlign({ h: 'center', v: 'center' }),
  }),
};

// ─── xlsx cell helper ─────────────────────────────────────────────────────────

type AoaCell = { v: string | number; s: XlsxStyle } | null;

function xc(v: string | number, s: XlsxStyle): AoaCell { return { v, s }; }
function ec(s: XlsxStyle): AoaCell { return { v: '', s }; }

// ─── Excel export ─────────────────────────────────────────────────────────────

export function exportTakeOffToExcel(project: Project, takeOffData: WorkItem[]): void {
  // ── Partition categories left / right ───────────────────────────────────────
  const catMap = new Map<string, WorkItem[]>();
  for (const item of takeOffData) {
    const key = item.category_name || 'Uncategorized';
    if (!catMap.has(key)) catMap.set(key, []);
    catMap.get(key)!.push(item);
  }

  const allCats = Array.from(catMap.entries());
  const leftCats  = allCats.filter((_, i) => i % 2 === 0);
  const rightCats = allCats.filter((_, i) => i % 2 === 1);

  const leftRows  = buildSideRows(leftCats);
  const rightRows = buildSideRows(rightCats);

  // ── Build AOA ───────────────────────────────────────────────────────────────
  // Columns (9 total):
  // 0=No_L  1=Dim_L  2=Tim_L  3=Desc_L  4=SEP  5=No_R  6=Dim_R  7=Tim_R  8=Desc_R

  const aoa:        AoaCell[][] = [];
  const merges:     XLSX.Range[] = [];
  const rowHeights: number[]   = [];

  function push(
    row: AoaCell[],
    height: number,
    ...extraMerges: XLSX.Range[]
  ) {
    const r = aoa.length;
    aoa.push(row);
    rowHeights.push(height);
    for (const m of extraMerges) merges.push(m);
    return r;
  }

  const dateStr = new Date().toLocaleDateString('en-GB');

  // Row 0 — Title
  {
    const r = push(
      [xc('TAKE OFF SHEET', S.title), ec(S.title), ec(S.title), ec(S.title),
       ec(S.title), ec(S.title), ec(S.title), ec(S.title), ec(S.title)],
      22,
    );
    merges.push({ s: { r, c: 0 }, e: { r, c: 8 } });
  }

  // Row 1 — Project / Date
  {
    const r = push([
      xc('PROJECT:',  S.metaLabel), ec(S.meta),
      xc(project.name, S.meta), ec(S.meta), ec(S.meta),
      xc('DATE:', S.metaLabel), ec(S.meta),
      xc(dateStr, S.meta), ec(S.meta),
    ], 15);
    merges.push({ s: { r, c: 2 }, e: { r, c: 4 } });
  }

  // Row 2 — Location / Sheet No
  {
    const r = push([
      xc('LOCATION:', S.metaLabel), ec(S.meta),
      xc(project.location ?? '—', S.meta), ec(S.meta), ec(S.meta),
      xc('SHEET NO:', S.metaLabel), ec(S.meta),
      xc('1', S.meta), ec(S.meta),
    ], 15);
    merges.push({ s: { r, c: 2 }, e: { r, c: 4 } });
  }

  // Row 3 — Client / Contractor / Consultant
  push([
    xc('CLIENT:',     S.metaLabel),
    xc(CLIENT,        S.meta),
    xc('CONTRACTOR:', S.metaLabel),
    xc(CONTRACTOR,    S.meta),
    ec(S.meta),
    xc('CONSULTANT:', S.metaLabel),
    xc(CONSULTANT,    S.meta),
    ec(S.meta), ec(S.meta),
  ], 15);

  // Row 4 — Column headers
  push([
    xc('No',          S.colHdr),
    xc('Dim',         S.colHdr),
    xc('Tim',         S.colHdr),
    xc('Description', S.colHdr),
    ec(S.colHdrSep),
    xc('No',          S.colHdr),
    xc('Dim',         S.colHdr),
    xc('Tim',         S.colHdr),
    xc('Description', S.colHdr),
  ], 18);

  // ── Data rows ────────────────────────────────────────────────────────────────
  const maxLen = Math.max(leftRows.length, rightRows.length);

  for (let i = 0; i < maxLen; i++) {
    const L = leftRows[i];
    const R = rightRows[i];
    const h = Math.max(L?.heightPt ?? 4, R?.heightPt ?? 4);
    const r = aoa.length;

    function cellsFor(
      blk: SheetRow | undefined,
      offset: 0 | 5,
    ): AoaCell[] {
      if (!blk) return [ec(S.empty), ec(S.empty), ec(S.empty), ec(S.empty)];

      const [no, dim, tim, desc] = blk.data;

      switch (blk.type) {
        case 'category':
          // Merge across all 4 cols on this side — we'll record merge after
          return [xc(no || desc, S.category), ec(S.category), ec(S.category), ec(S.category)];

        case 'subcat':
          return [ec(S.empty), ec(S.empty), ec(S.empty), xc(desc, S.subcat)];

        case 'workitem':
          return [ec(S.empty), ec(S.empty), ec(S.empty), xc(desc, S.workItem)];

        case 'data':
          return [
            xc(no || '', S.dataNo),
            xc(dim,      S.dataDim),
            xc(tim,      S.dataTim),
            xc(desc,     S.data),
          ];

        case 'subtotal':
          return [
            ec(S.subtotal),
            xc(dim,  S.subtotalQty),   // qty sits in Dim col
            xc(tim,  S.subtotalUnit),  // unit in Tim col
            xc(desc, S.subtotal),
          ];

        case 'spacer':
        default:
          return [ec(S.empty), ec(S.empty), ec(S.empty), ec(S.empty)];
      }
    }

    const lCells = cellsFor(L, 0);
    const rCells = cellsFor(R, 5);

    push(
      [...lCells, ec(S.sep), ...rCells],
      h,
    );

    // Category merges — merge cols 0-3 (left) or 5-8 (right)
    if (L?.type === 'category') merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
    if (R?.type === 'category') merges.push({ s: { r, c: 5 }, e: { r, c: 8 } });
  }

  // ── Footer row ────────────────────────────────────────────────────────────────
  {
    const r = aoa.length;
    push(
      [
        xc('Prepared by: ___________________________', S.footer), ec(S.footer), ec(S.footer),
        xc('Checked by: ___________________________',  S.footer), ec(S.footer),
        xc('Approved by: ___________________________', S.footer), ec(S.footer), ec(S.footer), ec(S.footer),
      ],
      18,
    );
    merges.push(
      { s: { r, c: 0 }, e: { r, c: 2 } },
      { s: { r, c: 3 }, e: { r, c: 4 } },
      { s: { r, c: 5 }, e: { r, c: 8 } },
    );
  }

  // ── Assemble worksheet ────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!rows']   = rowHeights.map(h => ({ hpt: h }));

  // Column widths — portrait A4, two sides
  ws['!cols'] = [
    { wch: 5  },   // No  (L)
    { wch: 11 },   // Dim (L)
    { wch: 13 },   // Tim (L)
    { wch: 27 },   // Desc(L)
    { wch: 1  },   // ── separator ──
    { wch: 5  },   // No  (R)
    { wch: 11 },   // Dim (R)
    { wch: 13 },   // Tim (R)
    { wch: 27 },   // Desc(R)
  ];

  // A4 portrait print setup
  ws['!pageSetup'] = {
    paperSize:    9,           // A4
    orientation:  'portrait',
    fitToPage:    true,
    fitToWidth:   1,
    fitToHeight:  0,
  };

  ws['!margins'] = {
    left: 0.3, right: 0.3, top: 0.4, bottom: 0.4,
    header: 0.2, footer: 0.2,
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Takeoff Sheet');

  const dateIso  = new Date().toISOString().split('T')[0];
  const safeName = project.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
  XLSX.writeFile(wb, `TakeOff_${safeName}_${dateIso}.xlsx`);
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function exportTakeOffToPDF(
  project: Project,
  takeOffData: WorkItem[],
): Promise<void> {
  const { jsPDF } = await import('jspdf');

  // A4 portrait in mm
  const PW = 210;
  const PH = 297;
  const ML = 8, MR = 8, MT = 10, MB = 14;
  const BODY_W = PW - ML - MR;
  const SEP_W  = 2;
  const SIDE_W = (BODY_W - SEP_W) / 2;

  // Column widths within one side: [No, Dim, Tim, Desc]
  const COL_RATIOS = [0.07, 0.16, 0.20, 0.57];
  const COL_W = COL_RATIOS.map(r => r * SIDE_W);

  // X offsets for columns on each side
  function colX(side: 0 | 1, col: 0 | 1 | 2 | 3): number {
    const base = side === 0 ? ML : ML + SIDE_W + SEP_W;
    return base + COL_W.slice(0, col).reduce((a, b) => a + b, 0);
  }

  // Row heights (mm)
  const RH = {
    colHdr:   5.5,
    category: 6,
    subcat:   5,
    workitem: 5,
    data:     (lines: number) => Math.max(lines * 3.5 + 1, 5),
    subtotal: 5,
    spacer:   1.5,
  };

  const FONT = 'helvetica';
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let pageNum = 1;
  let curY    = MT;

  // ── Utilities ─────────────────────────────────────────────────────────────────

  function splitLines(text: string, maxW: number, fontSize: number): string[] {
    // Simple character-width estimator — refined per font at size 8
    const charW = fontSize * 0.45 * 0.352778; // pt → mm approx
    const charsPerLine = Math.floor(maxW / charW);
    const result: string[] = [];
    for (const rawLine of text.split('\n')) {
      if (rawLine.length <= charsPerLine) {
        result.push(rawLine);
      } else {
        // Word-wrap
        const words = rawLine.split(' ');
        let line = '';
        for (const word of words) {
          if ((line + ' ' + word).trim().length <= charsPerLine) {
            line = (line + ' ' + word).trim();
          } else {
            if (line) result.push(line);
            line = word;
          }
        }
        if (line) result.push(line);
      }
    }
    return result.length ? result : [''];
  }

  function textCell(
    text: string,
    x: number, yTop: number, w: number, h: number,
    opts: {
      align?: 'left' | 'center' | 'right';
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
      color?: [number, number, number];
    } = {},
  ) {
    const fs    = opts.fontSize  ?? 7.5;
    const style = opts.fontStyle ?? 'normal';
    const color = opts.color     ?? [0, 0, 0];
    doc.setFont(FONT, style);
    doc.setFontSize(fs);
    doc.setTextColor(...color);

    const pad  = 1;
    const lines = splitLines(text, w - pad * 2, fs);
    const lineH = fs * 0.35 * 0.352778 + 0.8; // pt → mm + leading

    let ty = yTop + pad + lineH;
    const align = opts.align ?? 'left';

    for (const ln of lines) {
      if (ty > yTop + h - 0.5) break;
      if (align === 'center') {
        doc.text(ln, x + w / 2, ty, { align: 'center' });
      } else if (align === 'right') {
        doc.text(ln, x + w - pad, ty, { align: 'right' });
      } else {
        doc.text(ln, x + pad, ty, { align: 'left' });
      }
      ty += lineH;
    }
    doc.setTextColor(0, 0, 0);
  }

  function cellBorder(x: number, y: number, w: number, h: number) {
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.15);
    doc.rect(x, y, w, h, 'S');
    doc.setDrawColor(0, 0, 0);
  }

  function hLine(y: number, x1 = ML, x2 = ML + BODY_W, lw = 0.3) {
    doc.setLineWidth(lw);
    doc.setDrawColor(0, 0, 0);
    doc.line(x1, y, x2, y);
  }

  function checkY(needed: number) {
    if (curY + needed > PH - MB) {
      drawFooter();
      doc.addPage();
      pageNum++;
      curY = MT;
      drawHeader();
      drawColHeaders();
    }
  }

  // ── Header block ─────────────────────────────────────────────────────────────

  function drawHeader() {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.text('TAKE OFF SHEET', PW / 2, curY + 5, { align: 'center' });
    curY += 7;

    const col2x = ML + BODY_W / 2 + 5;
    const dateStr = new Date().toLocaleDateString('en-GB');

    const metaRows: [string, string, string, string][] = [
      ['PROJECT:',  project.name,             'DATE:',     dateStr],
      ['LOCATION:', project.location ?? '—',  'SHEET NO:', String(pageNum)],
      ['CLIENT:',   CLIENT,                   'CONSULTANT:', CONSULTANT],
    ];

    for (const [lbl1, val1, lbl2, val2] of metaRows) {
      doc.setFont(FONT, 'bold');   doc.setFontSize(8);
      doc.text(lbl1, ML, curY + 3.5);
      doc.setFont(FONT, 'normal'); doc.setFontSize(8);
      doc.text(val1, ML + (lbl1.length > 10 ? 26 : 22) * 0.352778 * 8, curY + 3.5);

      doc.setFont(FONT, 'bold');   doc.setFontSize(8);
      doc.text(lbl2, col2x, curY + 3.5);
      doc.setFont(FONT, 'normal'); doc.setFontSize(8);
      doc.text(val2, col2x + (lbl2.length > 10 ? 28 : 20) * 0.352778 * 8, curY + 3.5);
      curY += 5;
    }

    // CONTRACTOR on its own line under Client row
    doc.setFont(FONT, 'bold');   doc.setFontSize(8);
    doc.text('CONTRACTOR:', ML + 40, curY - 1.5);
    doc.setFont(FONT, 'normal'); doc.setFontSize(8);
    doc.text(CONTRACTOR, ML + 68, curY - 1.5);

    hLine(curY, ML, ML + BODY_W, 0.5);
    curY += 1.5;
  }

  // ── Column headers ────────────────────────────────────────────────────────────

  function drawColHeaders() {
    const h = RH.colHdr;
    // Dark bg
    doc.setFillColor(64, 64, 64);
    doc.rect(ML, curY, BODY_W, h, 'F');
    // Separator
    doc.setFillColor(90, 90, 90);
    doc.rect(ML + SIDE_W, curY, SEP_W, h, 'F');

    doc.setFont(FONT, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const labels = ['No', 'Dim', 'Tim', 'Description'];
    for (const side of [0, 1] as const) {
      for (let ci = 0; ci < 4; ci++) {
        const cx = colX(side, ci as 0|1|2|3);
        const cw = COL_W[ci];
        doc.text(labels[ci], cx + cw / 2, curY + h / 2 + 1.2, { align: 'center' });
      }
    }
    doc.setTextColor(0, 0, 0);
    curY += h;
  }

  // ── Footer ────────────────────────────────────────────────────────────────────

  function drawFooter() {
    const fy = PH - MB + 4;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.text('Prepared by: ___________________________', ML, fy);
    doc.text('Checked by: ___________________________', PW / 2, fy, { align: 'center' });
    doc.text('Approved by: ___________________________', PW - MR, fy, { align: 'right' });
  }

  // ── Draw one SheetRow on one side ─────────────────────────────────────────────

  function drawSheetRow(row: SheetRow, side: 0 | 1, yTop: number, rowH: number) {
    const bx   = side === 0 ? ML : ML + SIDE_W + SEP_W;
    const [no, dim, tim, desc] = row.data;

    if (row.type === 'spacer') return;

    if (row.type === 'category') {
      doc.setFillColor(217, 217, 217);
      doc.rect(bx, yTop, SIDE_W, rowH, 'F');
      doc.setDrawColor(0); doc.setLineWidth(0.4);
      doc.rect(bx, yTop, SIDE_W, rowH, 'S');
      doc.setLineWidth(0.15);
      textCell(no || desc, bx, yTop, SIDE_W, rowH, {
        align: 'center', fontSize: 9, fontStyle: 'bold',
      });
      return;
    }

    if (row.type === 'subtotal') {
      doc.setFillColor(245, 245, 245);
      doc.rect(bx, yTop, SIDE_W, rowH, 'F');
      for (let ci = 0; ci < 4; ci++) cellBorder(colX(side, ci as 0|1|2|3), yTop, COL_W[ci], rowH);
      // qty in Dim col, unit in Tim col, label in Desc col
      textCell(dim, colX(side, 1), yTop, COL_W[1], rowH, { align: 'right', fontStyle: 'bold', fontSize: 7.5 });
      textCell(tim, colX(side, 2), yTop, COL_W[2], rowH, { align: 'left',  fontStyle: 'bold', fontSize: 7.5 });
      textCell(desc.trim(), colX(side, 3), yTop, COL_W[3], rowH, { fontStyle: 'bold', fontSize: 7.5 });
      return;
    }

    // All other row types — draw 4 column borders
    for (let ci = 0; ci < 4; ci++) cellBorder(colX(side, ci as 0|1|2|3), yTop, COL_W[ci], rowH);

    if (row.type === 'subcat') {
      textCell(desc.trim(), colX(side, 3), yTop, COL_W[3], rowH, { fontStyle: 'bolditalic', fontSize: 8 });
      return;
    }

    if (row.type === 'workitem') {
      textCell(desc.trim(), colX(side, 3), yTop, COL_W[3], rowH, { fontStyle: 'bold', fontSize: 8 });
      return;
    }

    // data row
    if (no)  textCell(no,         colX(side, 0), yTop, COL_W[0], rowH, { align: 'center', fontSize: 7.5 });
    if (dim) textCell(dim,        colX(side, 1), yTop, COL_W[1], rowH, { align: 'right',  fontSize: 7 });
    if (tim) textCell(tim,        colX(side, 2), yTop, COL_W[2], rowH, { align: 'right',  fontSize: 7 });
    if (desc) textCell(desc.trim(), colX(side, 3), yTop, COL_W[3], rowH, { fontSize: 7.5 });
  }

  // ── Partition categories ──────────────────────────────────────────────────────

  const catMap = new Map<string, WorkItem[]>();
  for (const item of takeOffData) {
    const key = item.category_name || 'Uncategorized';
    if (!catMap.has(key)) catMap.set(key, []);
    catMap.get(key)!.push(item);
  }
  const allCats   = Array.from(catMap.entries());
  const leftCats  = allCats.filter((_, i) => i % 2 === 0);
  const rightCats = allCats.filter((_, i) => i % 2 === 1);

  const leftRows  = buildSideRows(leftCats);
  const rightRows = buildSideRows(rightCats);

  // ── Render ────────────────────────────────────────────────────────────────────

  drawHeader();
  drawColHeaders();

  const maxLen = Math.max(leftRows.length, rightRows.length);

  for (let i = 0; i < maxLen; i++) {
    const L = leftRows[i];
    const R = rightRows[i];

    let rowH: number;
    if (L?.type === 'data' || R?.type === 'data') {
      const lLines = L?.type === 'data'
        ? Math.max(L.data[1].split('\n').length, L.data[2].split('\n').length, 1)
        : 1;
      const rLines = R?.type === 'data'
        ? Math.max(R.data[1].split('\n').length, R.data[2].split('\n').length, 1)
        : 1;
      rowH = RH.data(Math.max(lLines, rLines));
    } else if (L?.type === 'category' || R?.type === 'category') {
      rowH = RH.category;
    } else if (L?.type === 'subcat' || R?.type === 'subcat') {
      rowH = RH.subcat;
    } else if (L?.type === 'workitem' || R?.type === 'workitem') {
      rowH = RH.workitem;
    } else if (L?.type === 'subtotal' || R?.type === 'subtotal') {
      rowH = RH.subtotal;
    } else {
      rowH = RH.spacer;
    }

    checkY(rowH);

    const y = curY;
    if (L) drawSheetRow(L, 0, y, rowH);
    if (R) drawSheetRow(R, 1, y, rowH);

    // Separator column
    doc.setFillColor(120, 120, 120);
    doc.rect(ML + SIDE_W, y, SEP_W, rowH, 'F');

    curY += rowH;
  }

  drawFooter();

  const dateIso  = new Date().toISOString().split('T')[0];
  const safeName = project.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
  doc.save(`TakeOff_${safeName}_${dateIso}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOQ EXPORT — Bill of Quantities (Excel only, 2 sheets: BOQ + Grand Summary)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectBOQRow {
  category_name: string;
  subcategory_name: string;
  item_description: string;
  unit: string;
  contract_quantity: number;
  rate: number;
  contract_amount: number;
}

// ─── BOQ Style helpers (self-contained, no dependency on Takeoff styles) ──────

const VAT_RATE = 0.15;
const CURRENCY = 'BIRR';

// Category letters A, B, C …
function catLetter(idx: number): string {
  return String.fromCharCode(65 + idx);
}

// Number format: comma-separated 2 dp
const NUM_FMT = '#,##0.00';

type BOQFont   = Record<string, unknown>;
type BOQFill   = Record<string, unknown>;
type BOQAlign  = Record<string, unknown>;
type BOQBorder = Record<string, unknown>;
type BOQStyle  = Record<string, unknown>;

const B_THIN = { style: 'thin', color: { rgb: '000000' } };
const B_ALL: BOQBorder = { top: B_THIN, bottom: B_THIN, left: B_THIN, right: B_THIN };
const B_BOTTOM: BOQBorder = { bottom: { style: 'medium', color: { rgb: '000000' } } };

function bf(opts: {
  bold?: boolean; italic?: boolean; size?: number;
  color?: string; underline?: boolean;
}): BOQFont {
  return {
    name: 'Arial', sz: opts.size ?? 9,
    bold: opts.bold ?? false, italic: opts.italic ?? false,
    underline: opts.underline ?? false,
    color: { rgb: opts.color ?? '000000' },
  };
}

function bfill(rgb: string): BOQFill {
  return { fgColor: { rgb }, patternType: 'solid' };
}

function balign(h: 'left'|'center'|'right' = 'left', v: 'top'|'center'|'bottom' = 'center', wrap = false): BOQAlign {
  return { horizontal: h, vertical: v, wrapText: wrap };
}

function bs(font: BOQFont, fill?: BOQFill, align?: BOQAlign, border?: BOQBorder, numFmt?: string): BOQStyle {
  const s: BOQStyle = { font, alignment: align ?? balign() };
  if (fill)   s['fill']   = fill;
  if (border) s['border'] = border;
  if (numFmt) s['numFmt'] = numFmt;
  return s;
}

// Pre-built BOQ styles
const BS = {
  // ── Header ──
  sheetTitle:  bs(bf({ bold: true, size: 11, color: 'FFFFFF' }), bfill('5C4A1E'), balign('center', 'center')),
  sheetTitle2: bs(bf({ bold: true, size: 9,  color: 'FFFFFF' }), bfill('5C4A1E'), balign('center', 'center')),
  metaLabel:   bs(bf({ bold: true, size: 9  }), undefined, balign('left', 'center')),
  meta:        bs(bf({ size: 9 }),               undefined, balign('left', 'center')),
  colHdr:      bs(bf({ bold: true, size: 9, color: 'FFFFFF' }), bfill('404040'), balign('center', 'center'), B_ALL),
  // ── Data rows ──
  category:    bs(bf({ bold: true, size: 10 }), bfill('D9D9D9'), balign('left', 'center'), B_ALL),
  subcat:      bs(bf({ bold: true, italic: true, size: 9 }), bfill('F2F2F2'), balign('left', 'center', true), B_ALL),
  itemNo:      bs(bf({ size: 9 }), undefined, balign('center', 'center'), B_ALL),
  itemDesc:    bs(bf({ size: 9 }), undefined, balign('left', 'center', true), B_ALL),
  itemUnit:    bs(bf({ size: 9 }), undefined, balign('center', 'center'), B_ALL),
  itemNum:     bs(bf({ size: 9 }), undefined, balign('right', 'center'), B_ALL, NUM_FMT),
  // ── Subtotal / Total ──
  subTotLabel: bs(bf({ bold: true, size: 9 }), bfill('E8E8E8'), balign('right', 'center'), B_ALL),
  subTotVal:   bs(bf({ bold: true, size: 9 }), bfill('E8E8E8'), balign('right', 'center'), B_ALL, NUM_FMT),
  totalLabel:  bs(bf({ bold: true, size: 10 }), bfill('BFC9CA'), balign('right', 'center'), B_ALL),
  totalVal:    bs(bf({ bold: true, size: 10 }), bfill('BFC9CA'), balign('right', 'center'), B_ALL, NUM_FMT),
  empty:       bs(bf({ size: 9 }), undefined, balign()),
  // ── Grand Summary ──
  sumHdrTitle: bs(bf({ bold: true, size: 12, color: 'FFFFFF' }), bfill('5C4A1E'), balign('center', 'center')),
  sumHdrSub:   bs(bf({ bold: true, size: 9,  color: 'FFFFFF' }), bfill('5C4A1E'), balign('center', 'center')),
  sumColHdr:   bs(bf({ bold: true, size: 9,  color: 'FFFFFF' }), bfill('7B6914'), balign('center', 'center'), B_ALL),
  sumNo:       bs(bf({ size: 9 }), bfill('FFFFFF'), balign('center', 'center'), B_ALL),
  sumDesc:     bs(bf({ size: 9 }), bfill('FFFFFF'), balign('left',   'center', true), B_ALL),
  sumUnit:     bs(bf({ size: 9 }), bfill('FFFFFF'), balign('center', 'center'), B_ALL),
  sumAmt:      bs(bf({ size: 9 }), bfill('FFFFFF'), balign('right',  'center'), B_ALL, NUM_FMT),
  sumGrandLbl: bs(bf({ bold: true, size: 10, color: 'FFFFFF' }), bfill('5C4A1E'), balign('center', 'center'), B_ALL),
  sumGrandAmt: bs(bf({ bold: true, size: 10, color: 'FFFFFF' }), bfill('5C4A1E'), balign('right',  'center'), B_ALL, NUM_FMT),
  sumVatLbl:   bs(bf({ bold: true, size: 10, color: 'FFFFFF' }), bfill('7B6914'), balign('center', 'center'), B_ALL),
  sumVatAmt:   bs(bf({ bold: true, size: 10, color: 'FFFFFF' }), bfill('7B6914'), balign('right',  'center'), B_ALL, NUM_FMT),
  sumFinalLbl: bs(bf({ bold: true, size: 11, color: 'FFFFFF' }), bfill('3B3000'), balign('center', 'center'), B_ALL),
  sumFinalAmt: bs(bf({ bold: true, size: 11, color: 'FFFFFF' }), bfill('3B3000'), balign('right',  'center'), B_ALL, NUM_FMT),
};

// ─── Cell factory ─────────────────────────────────────────────────────────────

type BOQCell = { v: string | number; s: BOQStyle; t?: string } | null;

function bc(v: string | number, s: BOQStyle, isNum = false): BOQCell {
  return { v, s, t: isNum ? 'n' : 's' };
}

function be(s: BOQStyle): BOQCell { return { v: '', s }; }

// ─── Build BOQ Sheet ──────────────────────────────────────────────────────────

function buildBOQSheet(
  project: Project,
  rows: ProjectBOQRow[],
  wb: ReturnType<typeof XLSX.utils.book_new>,
): { catTotals: { name: string; amount: number }[] } {

  const aoa:        BOQCell[][] = [];
  const merges:     XLSX.Range[] = [];
  const rowHeights: number[]     = [];
  const catTotals:  { name: string; amount: number }[] = [];

  const NCOLS = 6; // Item No | Description | Unit | Qty | Rate | Amount

  function pushRow(row: BOQCell[], h: number, ...ms: XLSX.Range[]) {
    const r = aoa.length;
    aoa.push(row);
    rowHeights.push(h);
    for (const m of ms) merges.push({ s: { r: m.s.r, c: m.s.c }, e: { r: m.e.r, c: m.e.c } });
    return r;
  }

  function mergeAll(r: number) {
    merges.push({ s: { r, c: 0 }, e: { r, c: NCOLS - 1 } });
  }

  const dateStr = new Date().toLocaleDateString('en-GB');

  // ── Header ──────────────────────────────────────────────────────────────────

  // Row 0: Sheet title
  { const r = pushRow([bc('BILL OF QUANTITIES', BS.sheetTitle), be(BS.sheetTitle), be(BS.sheetTitle), be(BS.sheetTitle), be(BS.sheetTitle), be(BS.sheetTitle)], 22); mergeAll(r); }

  // Row 1: Project / Date
  { const r = pushRow([bc('PROJECT:', BS.metaLabel), bc(project.name, BS.meta), be(BS.meta), be(BS.meta), bc('DATE:', BS.metaLabel), bc(dateStr, BS.meta)], 15);
    merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); }

  // Row 2: Location / Sheet No
  { const r = pushRow([bc('LOCATION:', BS.metaLabel), bc(project.location ?? '—', BS.meta), be(BS.meta), be(BS.meta), bc('SHEET NO:', BS.metaLabel), bc('1', BS.meta)], 15);
    merges.push({ s: { r, c: 1 }, e: { r, c: 3 } }); }

  // Row 3: Client / Contractor / Consultant
  pushRow([
    bc('CLIENT:', BS.metaLabel), bc(CLIENT, BS.meta),
    bc('CONTRACTOR:', BS.metaLabel), bc(CONTRACTOR, BS.meta),
    bc('CONSULTANT:', BS.metaLabel), bc(CONSULTANT, BS.meta),
  ], 15);

  // Row 4: Column headers
  pushRow([
    bc('Item No.',        BS.colHdr),
    bc('Description',     BS.colHdr),
    bc('Unit',            BS.colHdr),
    bc('Qty',             BS.colHdr),
    bc('Rate (ETB)',      BS.colHdr),
    bc('Amount (ETB)',    BS.colHdr),
  ], 18);

  // ── Data ─────────────────────────────────────────────────────────────────────

  // Group: category → subcategory → work items
  const catMap = new Map<string, Map<string, ProjectBOQRow[]>>();
  for (const row of rows) {
    if (!catMap.has(row.category_name)) catMap.set(row.category_name, new Map());
    const subMap = catMap.get(row.category_name)!;
    if (!subMap.has(row.subcategory_name)) subMap.set(row.subcategory_name, []);
    subMap.get(row.subcategory_name)!.push(row);
  }

  let catIdx = 0;
  let grandTotal = 0;

  for (const [catName, subMap] of catMap) {
    const letter = catLetter(catIdx++);
    let catTotal = 0;

    // ── Category row (merged, grey) ──────────────────────────────────────────
    { const r = pushRow([
        bc(`${letter}.  ${catName}`, BS.category),
        be(BS.category), be(BS.category), be(BS.category), be(BS.category), be(BS.category),
      ], 18); mergeAll(r); }

    let subIdx = 1;

    for (const [subName, workItems] of subMap) {
      let subTotal = 0;
      const subNo = `${subIdx}.`;

      // ── Subcategory row (merged, bold italic) ────────────────────────────
      { const r = pushRow([
          bc(subNo, BS.subcat),
          bc(subName, BS.subcat),
          be(BS.subcat), be(BS.subcat), be(BS.subcat), be(BS.subcat),
        ], 16);
        merges.push({ s: { r, c: 1 }, e: { r, c: 5 } }); }

      let itemIdx = 1;

      for (const wi of workItems) {
        const itemNo = `${subIdx}.${itemIdx}`;
        const amt    = Number(wi.contract_amount) || 0;
        const qty    = Number(wi.contract_quantity) || 0;
        const rate   = Number(wi.rate) || 0;
        subTotal  += amt;

        pushRow([
          bc(itemNo,            BS.itemNo),
          bc(wi.item_description, BS.itemDesc),
          bc(wi.unit,           BS.itemUnit),
          bc(qty,               BS.itemNum, true),
          bc(rate,              BS.itemNum, true),
          bc(amt,               BS.itemNum, true),
        ], 16);

        itemIdx++;
      }

      // ── Subcategory subtotal ─────────────────────────────────────────────
      { const r = pushRow([
          be(BS.subTotLabel), be(BS.subTotLabel), be(BS.subTotLabel),
          be(BS.subTotLabel),
          bc(`Sub-Total:  ${subName}`, BS.subTotLabel),
          bc(subTotal, BS.subTotVal, true),
        ], 16);
        merges.push({ s: { r, c: 0 }, e: { r, c: 3 } });
        merges.push({ s: { r, c: 4 }, e: { r, c: 4 } }); }

      catTotal  += subTotal;
      grandTotal += subTotal;
      subIdx++;
    }

    // Spacer between categories
    pushRow([be(BS.empty), be(BS.empty), be(BS.empty), be(BS.empty), be(BS.empty), be(BS.empty)], 6);

    catTotals.push({ name: catName, amount: catTotal });
  }

  // ── Total (all subcategory subtotals) ─────────────────────────────────────
  { const r = pushRow([
      be(BS.totalLabel), be(BS.totalLabel), be(BS.totalLabel), be(BS.totalLabel),
      bc('TOTAL', BS.totalLabel),
      bc(grandTotal, BS.totalVal, true),
    ], 20);
    merges.push({ s: { r, c: 0 }, e: { r, c: 3 } }); }

  // ── Assemble worksheet ────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!rows']   = rowHeights.map(h => ({ hpt: h }));
  ws['!cols']   = [
    { wch: 9  },   // Item No.
    { wch: 46 },   // Description
    { wch: 7  },   // Unit
    { wch: 11 },   // Qty
    { wch: 13 },   // Rate
    { wch: 15 },   // Amount
  ];
  ws['!pageSetup'] = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  ws['!margins']   = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

  XLSX.utils.book_append_sheet(wb, ws, 'BOQ');
  return { catTotals };
}

// ─── Build Grand Summary Sheet ────────────────────────────────────────────────

function buildGrandSummarySheet(
  project: Project,
  catTotals: { name: string; amount: number }[],
  wb: ReturnType<typeof XLSX.utils.book_new>,
): void {

  const aoa:        BOQCell[][] = [];
  const merges:     XLSX.Range[] = [];
  const rowHeights: number[]     = [];
  const NCOLS = 4; // NO | DESCRIPTION | UNIT | CONTRACT AMOUNT

  function pushRow(row: BOQCell[], h: number) {
    const r = aoa.length;
    aoa.push(row);
    rowHeights.push(h);
    return r;
  }

  function mergeAll(r: number) {
    merges.push({ s: { r, c: 0 }, e: { r, c: NCOLS - 1 } });
  }

  // ── Header block ─────────────────────────────────────────────────────────

  // Row 0: Project name (dark olive bg, white bold)
  { const r = pushRow([
      bc(project.name.toUpperCase(), BS.sumHdrTitle),
      be(BS.sumHdrTitle), be(BS.sumHdrTitle), be(BS.sumHdrTitle),
    ], 24); mergeAll(r); }

  // Row 1: Location / subtitle
  { const r = pushRow([
      bc(`${(project.location ?? '').toUpperCase()}`, BS.sumHdrSub),
      be(BS.sumHdrSub), be(BS.sumHdrSub), be(BS.sumHdrSub),
    ], 18); mergeAll(r); }

  // Row 2: Column headers (gold/olive bg)
  pushRow([
    bc('NO',               BS.sumColHdr),
    bc('DESCRIPTION',      BS.sumColHdr),
    bc('UNIT',             BS.sumColHdr),
    bc('CONTRACT AMOUNT',  BS.sumColHdr),
  ], 18);

  // ── Category rows ─────────────────────────────────────────────────────────

  let grandTotal = 0;

  catTotals.forEach(({ name, amount }, idx) => {
    grandTotal += amount;
    pushRow([
      bc(idx + 1,      BS.sumNo),
      bc(name,         BS.sumDesc),
      bc(CURRENCY,     BS.sumUnit),
      bc(amount,       BS.sumAmt, true),
    ], 18);
  });

  // ── Grand Total ───────────────────────────────────────────────────────────
  { const r = pushRow([
      be(BS.sumGrandLbl),
      bc('GRAND TOTAL', BS.sumGrandLbl),
      bc(CURRENCY,      BS.sumGrandLbl),
      bc(grandTotal,    BS.sumGrandAmt, true),
    ], 20);
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } }); }

  // ── VAT 15% ───────────────────────────────────────────────────────────────
  const vatAmt   = grandTotal * VAT_RATE;
  { const r = pushRow([
      be(BS.sumVatLbl),
      bc(`V.A.T  ${(VAT_RATE * 100).toFixed(0)} %`, BS.sumVatLbl),
      bc(CURRENCY, BS.sumVatLbl),
      bc(vatAmt,   BS.sumVatAmt, true),
    ], 20);
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } }); }

  // ── Grand Total (with VAT) ────────────────────────────────────────────────
  const finalTotal = grandTotal + vatAmt;
  { const r = pushRow([
      be(BS.sumFinalLbl),
      bc('GRAND TOTAL', BS.sumFinalLbl),
      bc(CURRENCY,      BS.sumFinalLbl),
      bc(finalTotal,    BS.sumFinalAmt, true),
    ], 22);
    merges.push({ s: { r, c: 0 }, e: { r, c: 1 } }); }

  // ── Assemble ──────────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!rows']   = rowHeights.map(h => ({ hpt: h }));
  ws['!cols']   = [
    { wch: 6  },   // NO
    { wch: 52 },   // DESCRIPTION
    { wch: 12 },   // UNIT
    { wch: 20 },   // CONTRACT AMOUNT
  ];
  ws['!pageSetup'] = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  XLSX.utils.book_append_sheet(wb, ws, 'Grand Summary');
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function exportBOQToExcel(project: Project, rows: ProjectBOQRow[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: BOQ — also returns per-category totals for the summary
  const { catTotals } = buildBOQSheet(project, rows, wb);

  // Sheet 2: Grand Summary
  buildGrandSummarySheet(project, catTotals, wb);

  const dateIso  = new Date().toISOString().split('T')[0];
  const safeName = project.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
  XLSX.writeFile(wb, `BOQ_${safeName}_${dateIso}.xlsx`);
}
