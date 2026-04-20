import * as XLSX from 'xlsx';
import type { ProjectBOQRow, Project } from '@/types';
import { formatCurrency } from './utils';

export function exportBOQToExcel(project: Project, rows: ProjectBOQRow[]) {
  const wb = XLSX.utils.book_new();

  // Group by category
  // const categories = [...new Set(rows.map(r => r.category_name))];
  const categories = Array.from(new Set(rows.map(r => r.category_name)));
  // co

  // ---- BOQ SHEET ----
  const boqData: (string | number)[][] = [];

  // Title block
  boqData.push(['BILL OF QUANTITIES']);
  boqData.push(['']);
  boqData.push(['Project:', project.name]);
  boqData.push(['Location:', project.location || '—']);
  boqData.push(['Status:', project.status]);
  boqData.push(['Start Date:', project.start_date || '—']);
  boqData.push(['End Date:', project.end_date || '—']);
  boqData.push(['Export Date:', new Date().toLocaleDateString()]);
  boqData.push(['']);

  // Column headers
  boqData.push([
    'Item No.',
    'Description',
    'Category',
    'Subcategory',
    'Unit',
    'Contract Qty',
    'Rate',
    'Contract Amount',
    'Executed Amount',
    'Remaining',
    'Progress %',
  ]);

  let itemNo = 1;
  let totalContract = 0;
  let totalExecuted = 0;

  categories.forEach(catName => {
    const catRows = rows.filter(r => r.category_name === catName);

    // Category header row
    boqData.push([`— ${catName.toUpperCase()} —`, '', '', '', '', '', '', '', '', '', '']);

    catRows.forEach(row => {
      const remaining = row.contract_amount - row.executed_amount;
      boqData.push([
        itemNo++,
        row.item_description,
        row.category_name,
        row.subcategory_name,
        row.unit,
        row.contract_quantity,
        row.rate,
        row.contract_amount,
        row.executed_amount,
        remaining,
        `${Number(row.progress_percent).toFixed(1)}%`,
      ]);
      totalContract += Number(row.contract_amount);
      totalExecuted += Number(row.executed_amount);
    });

    boqData.push(['']);
  });

  // Totals
  boqData.push(['']);
  boqData.push(['', 'TOTAL CONTRACT AMOUNT', '', '', '', '', '', totalContract, '', '', '']);
  boqData.push(['', 'TOTAL EXECUTED AMOUNT', '', '', '', '', '', '', totalExecuted, '', '']);
  boqData.push(['', 'REMAINING AMOUNT',      '', '', '', '', '', totalContract - totalExecuted, '', '', '']);
  boqData.push(['', 'OVERALL PROGRESS',      '', '', '', '', '', '', '', '', `${((totalExecuted / totalContract) * 100 || 0).toFixed(1)}%`]);

  const ws = XLSX.utils.aoa_to_sheet(boqData);

  // Column widths
  ws['!cols'] = [
    { wch: 8 }, { wch: 52 }, { wch: 22 }, { wch: 26 },
    { wch: 8 }, { wch: 12 }, { wch: 10 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'BOQ');

  // ---- PROGRESS SUMMARY SHEET ----
  const summaryData: (string | number)[][] = [
    ['Category', 'Contract Amount', 'Executed Amount', 'Remaining', 'Progress %'],
  ];
  categories.forEach(catName => {
    const catRows = rows.filter(r => r.category_name === catName);
    const contract = catRows.reduce((s, r) => s + Number(r.contract_amount), 0);
    const executed = catRows.reduce((s, r) => s + Number(r.executed_amount), 0);
    summaryData.push([
      catName,
      contract,
      executed,
      contract - executed,
      `${((executed / contract) * 100 || 0).toFixed(1)}%`,
    ]);
  });
  summaryData.push(['TOTAL', totalContract, totalExecuted, totalContract - totalExecuted,
    `${((totalExecuted / totalContract) * 100 || 0).toFixed(1)}%`]);

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Category Summary');

  // Save
  const fileName = `BOQ_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ---- TAKE OFF PDF EXPORT ----

export async function exportTakeOffToPDF(
  project: any,
  takeOffData: any[]
) {
  const jsPDF = (await import('jspdf')).jsPDF;
  const html2canvas = (await import('html2canvas')).default;

  // Create HTML content
  const htmlContent = createTakeOffHTML(project, takeOffData);

  // Create a temporary div with the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm'; // A4 width
  tempDiv.style.padding = '20px';
  tempDiv.style.backgroundColor = '#ffffff';
  document.body.appendChild(tempDiv);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      backgroundColor: '#ffffff',
      allowTaint: true,
      useCORS: true,
    });

    // Create PDF from canvas
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add multiple pages if content is longer than one page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    // Save the PDF
    const fileName = `TakeOff_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } finally {
    // Clean up
    document.body.removeChild(tempDiv);
  }
}

function createTakeOffHTML(project: any, takeOffData: any[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let html = `
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .header {
          border-bottom: 3px solid #2c3e50;
          margin-bottom: 30px;
          padding-bottom: 20px;
        }
        .project-title {
          font-size: 28px;
          font-weight: bold;
          color: #2c3e50;
          margin: 0 0 10px 0;
        }
        .project-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
          font-size: 12px;
        }
        .info-block {
          background: #f5f7fa;
          padding: 10px;
          border-radius: 4px;
          border-left: 3px solid #3498db;
        }
        .info-label {
          color: #7f8c8d;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-value {
          color: #2c3e50;
          font-weight: 500;
          font-size: 13px;
        }
        .export-date {
          text-align: right;
          font-size: 11px;
          color: #7f8c8d;
          margin-top: 10px;
        }
        
        .category-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .category-header {
          background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
          color: white;
          padding: 12px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .item-block {
          background: #f9fafb;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
          page-break-inside: avoid;
        }
        .item-header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e1e8ed;
        }
        .item-title {
          font-size: 13px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0;
        }
        .item-meta {
          font-size: 11px;
          color: #7f8c8d;
          margin-top: 3px;
        }
        .item-summary {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          text-align: right;
        }
        .summary-value {
          text-align: right;
        }
        .summary-label {
          color: #7f8c8d;
          font-weight: 500;
          min-width: 120px;
        }
        
        .takeoff-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 11px;
        }
        .takeoff-table th {
          background: #ecf0f1;
          padding: 8px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border: 1px solid #d5dbdb;
          font-size: 10px;
          text-transform: uppercase;
        }
        .takeoff-table td {
          padding: 8px;
          border: 1px solid #e1e8ed;
          color: #34495e;
        }
        .takeoff-table tr:nth-child(even) td {
          background: #f9fafb;
        }
        .takeoff-table tr:hover td {
          background: #f0f3f7;
        }
        
        .no-data {
          text-align: center;
          padding: 20px;
          color: #7f8c8d;
          font-style: italic;
          font-size: 12px;
        }
        
        .summary-section {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #bdc3c7;
        }
        .summary-title {
          font-size: 14px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 12px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
        }
        .summary-card {
          background: #ecf0f1;
          border-left: 4px solid #3498db;
          padding: 12px;
          border-radius: 4px;
        }
        .summary-card.completed {
          border-left-color: #27ae60;
        }
        .summary-card.pending {
          border-left-color: #f39c12;
        }
        .summary-card-label {
          font-size: 10px;
          color: #7f8c8d;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .summary-card-value {
          font-size: 16px;
          font-weight: 700;
          color: #2c3e50;
        }
        
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="project-title">Takeoff Sheet</div>
        <div class="project-info">
          <div class="info-block">
            <div class="info-label">Project Name</div>
            <div class="info-value">${escapeHtml(project.name)}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Location</div>
            <div class="info-value">${escapeHtml(project.location || 'N/A')}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Status</div>
            <div class="info-value">${escapeHtml(project.status || 'N/A')}</div>
          </div>
        </div>
        <div class="export-date">Generated on ${dateStr}</div>
      </div>
  `;

  // Group by category
  const categories = Array.from(new Set(takeOffData.map(item => item.category_name)));
  let totalRows = 0;
  let totalQuantity = 0;

  categories.forEach(categoryName => {
    const categoryItems = takeOffData.filter(item => item.category_name === categoryName);

    html += `<div class="category-section">
      <div class="category-header">${escapeHtml(categoryName)}</div>
    `;

    categoryItems.forEach(item => {
      const takeOffRows = item.take_off_rows || [];
      const totalItemQuantity = takeOffRows.reduce((sum: number, row: any) => sum + Number(row.calculated_quantity || 0), 0);
      totalQuantity += totalItemQuantity;
      totalRows += takeOffRows.length;

      html += `
        <div class="item-block">
          <div class="item-header">
            <div>
              <div class="item-title">${escapeHtml(item.item_description)}</div>
              <div class="item-meta">${escapeHtml(item.subcategory_name)} • Unit: ${escapeHtml(item.unit)}</div>
            </div>
            <div style="text-align: right;">
              <div class="summary-label">Contract Qty: <strong>${Number(item.contract_quantity).toFixed(3)}</strong></div>
              <div class="summary-label">Takeoff Qty: <strong>${Number(totalItemQuantity).toFixed(3)}</strong></div>
            </div>
          </div>
      `;

      if (takeOffRows.length > 0) {
        html += `
          <table class="takeoff-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">No. of Items</th>
                <th style="text-align: center;">Length (m)</th>
                <th style="text-align: center;">Width (m)</th>
                <th style="text-align: center;">Height (m)</th>
                <th style="text-align: center;">Mass/m (kg)</th>
                <th style="text-align: right;">Calculated Qty</th>
              </tr>
            </thead>
            <tbody>
        `;

        takeOffRows.forEach((row: any) => {
          html += `
            <tr>
              <td>${escapeHtml(row.description)}</td>
              <td style="text-align: center;">${row.number_of_items}</td>
              <td style="text-align: center;">${row.length ? Number(row.length).toFixed(3) : '—'}</td>
              <td style="text-align: center;">${row.width ? Number(row.width).toFixed(3) : '—'}</td>
              <td style="text-align: center;">${row.height ? Number(row.height).toFixed(3) : '—'}</td>
              <td style="text-align: center;">${row.unit_mass_per_meter ? Number(row.unit_mass_per_meter).toFixed(3) : '—'}</td>
              <td style="text-align: right;"><strong>${Number(row.calculated_quantity).toFixed(3)}</strong></td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;
      } else {
        html += `<div class="no-data">No takeoff rows added for this item</div>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
  });

  // Summary section
  html += `
    <div class="summary-section">
      <div class="summary-title">Takeoff Summary</div>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-label">Total Items</div>
          <div class="summary-card-value">${takeOffData.length}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Total Takeoff Rows</div>
          <div class="summary-card-value">${totalRows}</div>
        </div>
        <div class="summary-card completed">
          <div class="summary-card-label">Total Takeoff Quantity</div>
          <div class="summary-card-value">${Number(totalQuantity).toFixed(3)}</div>
        </div>
      </div>
    </div>
  `;

  html += `
    </body>
    </html>
  `;

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
