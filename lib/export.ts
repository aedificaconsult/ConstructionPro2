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
