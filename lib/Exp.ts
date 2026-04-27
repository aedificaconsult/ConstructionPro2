import * as XLSX from 'xlsx';
import type { Project } from '@/types';

// =================================================================
// TYPES
// =================================================================

interface TakeOffRow {
  description: string;
  number_of_items: number;
  length: number;
  width?: number;
  height?: number;            // depth
  unit_mass_per_meter?: number;
  calculated_quantity?: number;
}

interface TakeOffDataItem {
  category_name: string;
  subcategory_name: string;
  item_description: string;
  unit: string;
  contract_quantity: number;
  take_off_rows: TakeOffRow[];
}

// Internal representation of a single display row (shared between Excel & PDF)
type RowType = 'category' | 'subcategory' | 'workitem' | 'takeoff-dim' | 'takeoff-result' | 'total';

interface DisplayRow {
  type: RowType;
  label: string;                         // category/subcategory/workitem name, item description, or total text
  no?: number;                           // only for first takeoff row
  dimValue?: number;                     // only for takeoff-dim rows (numeric)
  quantity?: number;                     // final quantity (only for takeoff-result and total rows)
  unit?: string;                         // for calculating dimension rows
}

// =================================================================
// HELPER: Expand a single TakeOffRow into multiple DisplayRows
// =================================================================
function expandTakeOffItem(item: TakeOffRow): DisplayRow[] {
  const rows: DisplayRow[] = [];
  const no = item.number_of_items;
  const unit = item.unit?.toLowerCase() ?? 'pcs';
  const qty = item.calculated_quantity ?? calculateRawQuantity(item);

  // First row always contains the description and No
  const desc = item.description ?? '';

  // For each dimension row we push a 'takeoff-dim' row, then a final 'takeoff-result' row
  const dims: number[] = [];

  switch (unit) {
    case 'm3':
      dims.push(item.length);
      dims.push(item.width ?? 0);
      dims.push(item.height ?? 0);
      break;
    case 'm2':
      dims.push(item.length);
      dims.push(item.width ?? 0);
      break;
    case 'm':
      dims.push(item.length);
      break;
    case 'kg':
      dims.push(item.length);
      dims.push(item.unit_mass_per_meter ?? 0);
      break;
    case 'pcs':
    case 'nr':
    case 'item':
      // no dimensions – only a single result row
      rows.push({
        type: 'takeoff-result',
        label: desc,
        no,
        quantity: no,
      });
      return rows;
    default:
      // fallback – treat as pcs
      rows.push({
        type: 'takeoff-result',
        label: desc,
        no,
        quantity: no,
      });
      return rows;
  }

  // Build rows for dimensions: first row with description, subsequent without
  dims.forEach((value, index) => {
    rows.push({
      type: 'takeoff-dim',
      label: index === 0 ? desc : '', // description only on first row
      no: index === 0 ? no : undefined,
      dimValue: value,
    });
  });

  // Final result row (contains the total quantity for this item)
  rows.push({
    type: 'takeoff-result',
    label: '',          // no description – the description already appeared on first dim row
    quantity: qty,
  });

  return rows;
}

function calculateRawQuantity(row: TakeOffRow): number {
  const no = row.number_of_items || 0;
  const unit = row.unit?.toLowerCase() ?? 'pcs';
  switch (unit) {
    case 'm3':
      return no * (row.length || 0) * (row.width || 0) * (row.height || 0);
    case 'm2':
      return no * (row.length || 0) * (row.width || 0);
    case 'm':
      return no * (row.length || 0);
    case 'kg':
      return no * (row.length || 0) * (row.unit_mass_per_meter || 0);
    case 'pcs':
    case 'nr':
    case 'item':
      return no;
    default:
      return no;
  }
}

// =================================================================
// BUILD FULL DISPLAY ROWS FROM INPUT DATA
// =================================================================
function buildDisplayRows(data: TakeOffDataItem[]): DisplayRow[] {
  const rows: DisplayRow[] = [];

  // Group by category -> subcategory -> work items (preserving original order)
  const catMap = new Map<string, Map<string, TakeOffDataItem[]>>();

  for (const item of data) {
    const cat = item.category_name || 'Uncategorised';
    const sub = item.subcategory_name || 'General';
    if (!catMap.has(cat)) catMap.set(cat, new Map());
    const subMap = catMap.get(cat)!;
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub)!.push(item);
  }

  for (const [catName, subMap] of catMap.entries()) {
    // Category row
    rows.push({ type: 'category', label: catName.toUpperCase() });

    for (const [subName, workItems] of subMap.entries()) {
      // Subcategory row
      rows.push({ type: 'subcategory', label: `  ${subName}` }); // two spaces indent

      for (const wi of workItems) {
        // Work item row
        rows.push({ type: 'workitem', label: `    ${wi.item_description}` }); // 4 spaces

        let workItemTotal = 0;

        // Expand each takeoff row
        for (const tor of wi.take_off_rows) {
          const expanded = expandTakeOffItem(tor);
          for (const er of expanded) {
            if (er.type === 'takeoff-result' && er.quantity !== undefined) {
              workItemTotal += er.quantity;
            }
            // Adjust indentation for description (add 6 spaces)
            if (er.label) {
              er.label = `      ${er.label}`; // six spaces for takeoff items
            }
            rows.push(er);
          }
        }

        // Work item total row
        rows.push({
          type: 'total',
          label: `Total: ${wi.item_description}`,
          quantity: workItemTotal,
        });
      }
    }
  }
  return rows;
}

// =================================================================
// SPLIT INTO TWO PANELS (balanced)
// =================================================================
function splitPanels(rows: DisplayRow[]): [DisplayRow[], DisplayRow[]] {
  // Count total "logical" rows (each display row maps to one Excel row)
  const total = rows.length;
  // Find a split point after a total/ workitem boundary (at roughly 50%)
  const half = Math.floor(total / 2);

  // Search backwards from half to find a good split (after a 'total' row or before a category)
  let splitIdx = half;
  for (let i = half; i >= 0; i--) {
    if (rows[i].type === 'total' || rows[i].type === 'category') {
      splitIdx = i + 1; // start right panel after this row
      break;
    }
  }
  if (splitIdx >= total) splitIdx = half; // fallback

  const left = rows.slice(0, splitIdx);
  const right = rows.slice(splitIdx);
  return [left, right];
}

// =================================================================
// BUILD SHEET DATA MATRIX (8 columns, left and right panels aligned)
// =================================================================
function buildSheetData(left: DisplayRow[], right: DisplayRow[]): any[][] {
  // Determine number of rows needed (max length)
  const maxRows = Math.max(left.length, right.length);
  const sheet: any[][] = [];

  // Row builder helper: convert a DisplayRow into array of 4 values (for one panel)
  const panelRow = (dr: DisplayRow | undefined): any[] => {
    if (!dr) return ['', '', '', '']; // padding
    switch (dr.type) {
      case 'category':
      case 'subcategory':
      case 'workitem':
        return ['', '', '', dr.label];
      case 'takeoff-dim':
        return [
          dr.no !== undefined ? dr.no : '',
          dr.dimValue !== undefined ? dr.dimValue.toFixed(3) : '',
          '',
          dr.label,
        ];
      case 'takeoff-result':
        return [
          dr.no !== undefined ? dr.no : '',
          '',
          dr.quantity !== undefined ? dr.quantity.toFixed(3) : '',
          dr.label,
        ];
      case 'total':
        return [
          '',
          '',
          dr.quantity !== undefined ? dr.quantity.toFixed(3) : '',
          dr.label,
        ];
      default:
        return ['', '', '', ''];
    }
  };

  for (let i = 0; i < maxRows; i++) {
    const lRow = i < left.length ? left[i] : undefined;
    const rRow = i < right.length ? right[i] : undefined;
    const lArr = panelRow(lRow);
    const rArr = panelRow(rRow);
    sheet.push([...lArr, ...rArr]);
  }
  return sheet;
}

// =================================================================
// HEADER ROWS (top part of sheet)
// =================================================================
function buildHeaderRows(project: Project, dateStr: string): any[][] {
  const header: any[][] = [
    ['PROJECT:', project.name, '', '', 'Date:', dateStr, '', ''],
    ['CLIENT:', 'Gulele Sub City', '', '', 'CONTRACTOR:', 'Abebe GC', '', ''],
    ['CONSULTANT:', 'Keystone', '', '', 'SHEET No:', '1', '', ''],
    ['', '', '', '', '', '', '', ''], // empty separator (A-H merged)
    ['No', 'Dim', 'Tim', 'Description', 'No', 'Dim', 'Tim', 'Description'],
  ];
  return header;
}

// =================================================================
// EXCEL STYLING
// =================================================================
function applyExcelStyles(ws: XLSX.WorkSheet, totalRows: number) {
  // Column widths
  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 28 },
    { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 28 },
  ];

  // Merges for header rows
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Row1 A-D
    { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } }, // Row1 E-H
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    { s: { r: 2, c: 4 }, e: { r: 2, c: 7 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, // Full row merge
  ];

  // Helper to set cell style
  const setStyle = (cellRef: string, style: any) => {
    if (!ws[cellRef]) return;
    ws[cellRef].s = { ...ws[cellRef].s, ...style };
  };

  // Apply bold / backgrounds based on DisplayRow types
  // We'll iterate through all rows and use the original display row types,
  // but after building the sheet we need to map back. Alternatively, we can apply styles
  // during buildSheetData by storing metadata. For simplicity, we'll use a parallel array
  // of row types. We'll rebuild that mapping by passing left/right arrays.
  // We'll use the fact that the total number of data rows = maxRows (excluding header).
  // So we'll create a style function that takes row index and column group (left/right).
  // Since we have left and right arrays, we can determine the DisplayRow for each cell.
  
  const applyStyleToDataRows = (rowIdx: number, colOffset: number, dr: DisplayRow | undefined) => {
    const baseRef = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });
    if (!dr) return;
    const row = 5 + rowIdx; // data starts at row 5 (0-indexed, so Excel row 6)
    const isLeft = colOffset === 0;
    const cols = isLeft ? [0,1,2,3] : [4,5,6,7];
    
    const boldFont = { bold: true };
    const normalFont = {};
    let bgColor: string | undefined;
    let fontColor: string | undefined;

    switch (dr.type) {
      case 'category':
        bgColor = 'D9D9D9'; // light grey
        fontColor = '000000';
        break;
      case 'subcategory':
        bgColor = 'BFBFBF';
        fontColor = '000000';
        break;
      case 'workitem':
        bgColor = 'E8E8E8';
        fontColor = '000000';
        break;
      case 'total':
        bgColor = 'F0F0F0';
        fontColor = '000000';
        break;
    }

    cols.forEach((c) => {
      const ref = baseRef(row, c);
      if (!ws[ref]) return;
      const cellStyle: any = {
        font: (dr.type === 'category' || dr.type === 'subcategory' || dr.type === 'workitem' || dr.type === 'total') ? boldFont : normalFont,
        fill: bgColor ? { fgColor: { rgb: bgColor } } : undefined,
      };
      if (fontColor) cellStyle.font = { ...cellStyle.font, color: { rgb: fontColor } };
      if (c === 0 || c === 4) { // No column center
        cellStyle.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
      } else if (c === 1 || c === 2 || c === 5 || c === 6) { // Dim/Tim
        cellStyle.alignment = { vertical: 'top', wrapText: true };
      } else { // Description
        cellStyle.alignment = { vertical: 'top', wrapText: true };
      }
      // Apply border
      cellStyle.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (dr.type === 'total') {
        cellStyle.border.top = { style: 'medium' }; // thicker top
      }
      ws[ref].s = cellStyle;
    });
  };

  // Apply header styles manually
  // ...
}

// =================================================================
// MAIN EXPORT FUNCTIONS
// =================================================================

export function exportTakeOffToExcel(project: Project, takeOffData: TakeOffDataItem[]) {
  const today = new Date().toISOString().split('T')[0];
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build display rows
  const allRows = buildDisplayRows(takeOffData);
  const [leftPanel, rightPanel] = splitPanels(allRows);

  // Build sheet data
  const headerData = buildHeaderRows(project, dateStr);
  const dataRows = buildSheetData(leftPanel, rightPanel);

  // Combine header + data
  const sheetArray = [...headerData, ...dataRows];

  // Create workbook and sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetArray);

  // Apply styles (placeholder – see below for full style application)
  applyExcelStyles(ws, dataRows.length);

  XLSX.utils.book_append_sheet(wb, ws, 'TakeOff');

  // File name
  const fileName = `TakeOff_${project.name.replace(/\s+/g, '_')}_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function exportTakeOffToPDF(project: Project, takeOffData: TakeOffDataItem[]) {
  // Similar logic: build HTML from display rows, left/right panels
  // Use jsPDF + html2canvas (as in existing code)
  const jsPDF = (await import('jspdf')).jsPDF;
  const html2canvas = (await import('html2canvas')).default;

  const allRows = buildDisplayRows(takeOffData);
  const [leftPanel, rightPanel] = splitPanels(allRows);

  const html = buildPDFHtml(project, leftPanel, rightPanel);

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm'; // A4
  tempDiv.style.padding = '15px';
  tempDiv.style.backgroundColor = '#ffffff';
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      backgroundColor: '#ffffff',
      allowTaint: true,
      useCORS: true,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }
    const fileName = `TakeOff_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(tempDiv);
  }
}

// PDF HTML builder (simplified, mirrors Excel layout)
function buildPDFHtml(project: Project, left: DisplayRow[], right: DisplayRow[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const renderPanelRows = (panel: DisplayRow[]): string => {
    let html = '<table style="width:100%; border-collapse:collapse; font-size:9px;">';
    for (const row of panel) {
      let style = '';
      let tag = 'td';
      if (row.type === 'category') {
        style = 'background:#D9D9D9; font-weight:bold; font-size:13px;';
      } else if (row.type === 'subcategory') {
        style = 'background:#BFBFBF; font-weight:bold; font-size:12px;';
      } else if (row.type === 'workitem') {
        style = 'background:#E8E8E8; font-weight:bold; font-size:11px;';
      } else if (row.type === 'total') {
        style = 'background:#F0F0F0; font-weight:bold;';
      }
      html += '<tr>';
      // No
      html += `<td style="width:8%; text-align:center; ${style}">${row.no ?? ''}</td>`;
      // Dim
      html += `<td style="width:16%; ${style}">${row.dimValue !== undefined ? row.dimValue.toFixed(3) : ''}</td>`;
      // Tim
      html += `<td style="width:22%; ${style}">${row.quantity !== undefined ? row.quantity.toFixed(3) : ''}</td>`;
      // Description
      html += `<td style="width:54%; ${style}">${row.label}</td>`;
      html += '</tr>';
    }
    html += '</table>';
    return html;
  };

  return `
    <html><head><style>
      body { font-family: 'Segoe UI', sans-serif; margin:0; padding:10px; }
      .header td { padding:2px; }
      .panel { width:49%; display:inline-block; vertical-align:top; }
      .panel table { width:100%; border-collapse:collapse; }
      .panel td { border:1px solid #aaa; padding:1px; }
    </style></head><body>
      <table style="width:100%">
        <tr><td style="width:49%"><b>PROJECT:</b> ${project.name}</td><td style="width:49%"><b>Date:</b> ${dateStr}</td></tr>
        <tr><td><b>CLIENT:</b> Gulele Sub City</td><td><b>CONTRACTOR:</b> Abebe GC</td></tr>
        <tr><td><b>CONSULTANT:</b> Keystone</td><td><b>SHEET No:</b> 1</td></tr>
        <tr><td colspan="2" style="height:10px;"></td></tr>
        <tr><td style="width:8%">No</td><td style="width:16%">Dim</td><td style="width:22%">Tim</td><td style="width:54%">Description</td>
            <td style="width:8%">No</td><td style="width:16%">Dim</td><td style="width:22%">Tim</td><td style="width:54%">Description</td></tr>
      </table>
      <div class="panel">${renderPanelRows(left)}</div>
      <div class="panel">${renderPanelRows(right)}</div>
    </body></html>`;
}
