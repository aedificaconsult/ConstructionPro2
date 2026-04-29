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
