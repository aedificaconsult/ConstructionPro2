'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Download, Pencil, Trash2, CheckCircle2, Layers, ClipboardList } from 'lucide-react';
import type { Project, ProjectBOQRow, WorkItem, WorkCategory, Unit } from '@/types';
import { ProgressBar, StatCard, StatusBadge, Field, Modal, ColorDot, EmptyState, Chip } from '@/components/ui';
import { formatCurrency, calcProgress, progressColor } from '@/lib/utils';
import {
  updateProjectStatus, addItemToProject, updateExecutedAmount, removeProjectItem,
  getTakeOffRows, addTakeOffRow, updateTakeOffRow, removeTakeOffRow,
} from '@/lib/actions/projects';
import { exportBOQToExcel } from '@/lib/export';
import { useRouter } from 'next/navigation';

type Props = {
  project: Project;
  boq: ProjectBOQRow[];
  allWorkItems: WorkItem[];
  categories: WorkCategory[];
  units: Unit[];
};

export default function ProjectTabs({ project, boq, allWorkItems, categories, units }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'boq' | 'summary' | 'add'>('boq');
  const [modal, setModal] = useState<null | 'status' | { type: 'progress'; row: ProjectBOQRow } | { type: 'takeoff'; row: ProjectBOQRow }>(null);
  const [loading, setLoading] = useState(false);

  // ---- Derived totals ----
  const totalContract = boq.reduce((s, r) => s + Number(r.contract_amount), 0);
  const totalExecuted = boq.reduce((s, r) => s + Number(r.executed_amount), 0);
  const overall = calcProgress(totalExecuted, totalContract);

  // ---- Group by category ----
  const grouped = useMemo(() => {
    const map: Record<string, ProjectBOQRow[]> = {};
    boq.forEach(r => {
      if (!map[r.category_name]) map[r.category_name] = [];
      map[r.category_name].push(r);
    });
    return Object.entries(map).map(([cat, rows]) => ({
      cat, color: rows[0].category_color, rows,
      contract: rows.reduce((s, r) => s + Number(r.contract_amount), 0),
      executed: rows.reduce((s, r) => s + Number(r.executed_amount), 0),
    }));
  }, [boq]);

  const TABS = [
    { id: 'boq',     label: 'BOQ & Progress' },
    { id: 'summary', label: 'Summary' },
    { id: 'add',     label: 'Add Items' },
  ] as const;

  const handleExport = () => exportBOQToExcel(project, boq);

  // ============================================================
  // STATUS MODAL
  // ============================================================
  const StatusModal = () => {
    const statuses = ['Not Started', 'In Progress', 'Completed', 'On Hold'] as const;
    return (
      <Modal title="Update Project Status" onClose={() => setModal(null)} width={380}>
        <p style={{ fontSize: 13, color: '#8892A4', marginBottom: 16 }}>{project.name}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {statuses.map(s => (
            <button key={s}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', borderColor: project.status === s ? '#C8A96E55' : undefined }}
              onClick={async () => {
                setLoading(true);
                await updateProjectStatus(project.id, s);
                setModal(null); setLoading(false); router.refresh();
              }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background:
                s === 'Not Started' ? '#8892A4' : s === 'In Progress' ? '#5B8DEF' : s === 'Completed' ? '#4CAF82' : '#F5A623'
              }} />
              {s}
              {project.status === s && <CheckCircle2 size={13} color="#C8A96E" style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      </Modal>
    );
  };

  // ============================================================
  // PROGRESS MODAL
  // ============================================================
  const ProgressModal = ({ row }: { row: ProjectBOQRow }) => {
    const [execQty, setExecQty] = useState(String(row.executed_quantity));
    const [note, setNote] = useState('');
    const executedAmount = (parseFloat(execQty) || 0) * row.rate;
    const pct = calcProgress(executedAmount, Number(row.contract_amount));

    return (
      <Modal title="Update Executed Quantity" onClose={() => setModal(null)} width={460}>
        <div style={{ background: '#1A1F2E', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontWeight: 600, color: '#E8EAF0', fontSize: 14 }}>{row.item_description}</p>
          <p style={{ fontSize: 12, color: '#8892A4', marginTop: 2 }}>
            {row.subcategory_name} · {row.category_name}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label={`Executed Qty (${row.unit})`}>
            <input className="input" type="number" min={0} max={row.contract_quantity}
              value={execQty} onChange={e => setExecQty(e.target.value)} />
          </Field>
          <Field label={`Executed Amount ($)`}>
            <input className="input" type="number" min={0} value={executedAmount.toFixed(2)} readOnly />
          </Field>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#8892A4' }}>
              Contract: <strong style={{ color: '#C8A96E' }}>${formatCurrency(row.contract_amount)}</strong>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: progressColor(pct) }}>
              {pct.toFixed(1)}%
            </span>
          </div>
          <input type="range" min={0} max={Number(row.contract_quantity)} step={0.1}
            value={parseFloat(execQty) || 0}
            onChange={e => setExecQty(e.target.value)}
            style={{ width: '100%' }} />
          <ProgressBar value={pct} showLabel={false} />
        </div>

        <Field label="Note (optional)">
          <input className="input" placeholder="Describe what was done..." value={note} onChange={e => setNote(e.target.value)} />
        </Field>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} disabled={loading}
            onClick={async () => {
              const qty = Math.min(parseFloat(execQty) || 0, Number(row.contract_quantity));
              setLoading(true);
              await updateExecutedAmount(row.project_item_id, project.id, qty, note);
              setModal(null); setLoading(false); router.refresh();
            }}>
            {loading ? 'Saving…' : 'Save Progress'}
          </button>
        </div>
      </Modal>
    );
  };

  // ============================================================
  // TAKE OFF SHEET MODAL
  // ============================================================
  const TakeOffModal = ({ row }: { row: ProjectBOQRow }) => {
    const [takeOffRows, setTakeOffRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingRow, setEditingRow] = useState<string | null>(null);
    const [formData, setFormData] = useState({
      description: '',
      number_of_items: '1',
      length: '',
      width: '',
      height: '',
      unit_mass_per_meter: '',
    });

    // Load take off rows on mount
    useEffect(() => {
      getTakeOffRows(row.project_item_id).then(setTakeOffRows);
    }, [row.project_item_id]);

    const resetForm = () => {
      setFormData({
        description: '',
        number_of_items: '1',
        length: '',
        width: '',
        height: '',
        unit_mass_per_meter: '',
      });
      setEditingRow(null);
    };

    const handleAddRow = async () => {
      if (!formData.description.trim()) {
        alert('Please enter a description');
        return;
      }

      setLoading(true);
      try {
        const data = {
          description: formData.description,
          number_of_items: parseInt(formData.number_of_items) || 1,
          length: formData.length ? parseFloat(formData.length) : undefined,
          width: formData.width ? parseFloat(formData.width) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          unit_mass_per_meter: formData.unit_mass_per_meter ? parseFloat(formData.unit_mass_per_meter) : undefined,
        };

        if (editingRow) {
          await updateTakeOffRow(editingRow, project.id, data);
        } else {
          await addTakeOffRow(row.project_item_id, project.id, data);
        }

        // Refresh take off rows
        const updatedRows = await getTakeOffRows(row.project_item_id);
        setTakeOffRows(updatedRows);
        resetForm();
      } catch (error) {
        alert('Error saving take off row');
      }
      setLoading(false);
    };

    const handleEditRow = (takeOffRow: any) => {
      setEditingRow(takeOffRow.id);
      setFormData({
        description: takeOffRow.description,
        number_of_items: takeOffRow.number_of_items.toString(),
        length: takeOffRow.length?.toString() || '',
        width: takeOffRow.width?.toString() || '',
        height: takeOffRow.height?.toString() || '',
        unit_mass_per_meter: takeOffRow.unit_mass_per_meter?.toString() || '',
      });
    };

    const handleDeleteRow = async (takeOffRowId: string) => {
      if (!confirm('Delete this take off row?')) return;
      setLoading(true);
      await removeTakeOffRow(takeOffRowId, project.id);
      const updatedRows = await getTakeOffRows(row.project_item_id);
      setTakeOffRows(updatedRows);
      setLoading(false);
    };

    const totalExecuted = takeOffRows.reduce((sum, r) => sum + Number(r.calculated_quantity), 0);

    return (
      <Modal title={`Take Off Sheet - ${row.item_description}`} onClose={() => setModal(null)} width={800}>
        <div style={{ background: '#1A1F2E', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontWeight: 600, color: '#E8EAF0', fontSize: 14 }}>{row.item_description}</p>
          <p style={{ fontSize: 12, color: '#8892A4', marginTop: 2 }}>
            {row.subcategory_name} · {row.category_name} · Unit: {row.unit}
          </p>
          <div style={{ marginTop: 8, padding: 8, background: '#0F1419', borderRadius: 4 }}>
            <p style={{ fontSize: 12, color: '#8892A4' }}>
              Total Executed Quantity: <strong style={{ color: '#4CAF82' }}>{totalExecuted.toFixed(3)} {row.unit}</strong>
            </p>
          </div>
        </div>

        {/* Add/Edit Form */}
        <div style={{ marginBottom: 20, padding: 16, background: '#1A1F2E', borderRadius: 8 }}>
          <h4 style={{ marginBottom: 12, color: '#E8EAF0', fontSize: 14 }}>
            {editingRow ? 'Edit Take Off Row' : 'Add Take Off Row'}
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="Description">
              <input className="input" placeholder="e.g. Wall section A-B"
                value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </Field>
            <Field label="Number of Items">
              <input className="input" type="number" min={1}
                value={formData.number_of_items} onChange={e => setFormData(p => ({ ...p, number_of_items: e.target.value }))} />
            </Field>
            <Field label={`Length (${row.unit === 'kg' ? 'm' : 'm'})`}>
              <input className="input" type="number" step="0.001" placeholder="0.000"
                value={formData.length} onChange={e => setFormData(p => ({ ...p, length: e.target.value }))} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {(row.unit === 'm²' || row.unit === 'm³') && (
              <Field label="Width (m)">
                <input className="input" type="number" step="0.001" placeholder="0.000"
                  value={formData.width} onChange={e => setFormData(p => ({ ...p, width: e.target.value }))} />
              </Field>
            )}
            {row.unit === 'm³' && (
              <Field label="Height (m)">
                <input className="input" type="number" step="0.001" placeholder="0.000"
                  value={formData.height} onChange={e => setFormData(p => ({ ...p, height: e.target.value }))} />
              </Field>
            )}
            {row.unit === 'kg' && (
              <Field label="Unit Mass (kg/m)">
                <input className="input" type="number" step="0.001" placeholder="0.000"
                  value={formData.unit_mass_per_meter} onChange={e => setFormData(p => ({ ...p, unit_mass_per_meter: e.target.value }))} />
              </Field>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" disabled={loading} onClick={handleAddRow}>
              {loading ? 'Saving…' : editingRow ? 'Update Row' : 'Add Row'}
            </button>
            {editingRow && (
              <button className="btn btn-secondary" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Take Off Rows Table */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {takeOffRows.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8892A4', padding: 20 }}>
              No take off rows added yet. Add your first measurement above.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Items</th>
                  <th>Dimensions</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {takeOffRows.map((takeOffRow) => (
                  <tr key={takeOffRow.id}>
                    <td style={{ maxWidth: 200 }}>
                      <p style={{ fontWeight: 500, color: '#E8EAF0', fontSize: 13 }}>{takeOffRow.description}</p>
                    </td>
                    <td>{takeOffRow.number_of_items}</td>
                    <td style={{ fontSize: 12, color: '#8892A4' }}>
                      {takeOffRow.length && `L: ${takeOffRow.length}m`}
                      {takeOffRow.width && ` × W: ${takeOffRow.width}m`}
                      {takeOffRow.height && ` × H: ${takeOffRow.height}m`}
                      {takeOffRow.unit_mass_per_meter && ` × Mass: ${takeOffRow.unit_mass_per_meter}kg/m`}
                    </td>
                    <td style={{ fontWeight: 600, color: '#4CAF82' }}>
                      {Number(takeOffRow.calculated_quantity).toFixed(3)} {row.unit}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleEditRow(takeOffRow)}>
                          <Pencil size={12} color="#C8A96E" />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm"
                          onClick={() => handleDeleteRow(takeOffRow.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    );
  };

  // ============================================================
  // ADD ITEMS TAB
  // ============================================================
  const AddItemsTab = () => {
    const [selCat, setSelCat] = useState(categories[0]?.id || '');
    const [selSub, setSelSub] = useState('');
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [adding, setAdding] = useState<string | null>(null);
    const existingIds = new Set(boq.map(r => r.work_item_id));

    const subs = (allWorkItems as any[])
      .map((w: any) => w.work_subcategories)
      .filter((s: any) => s && s.category_id === selCat)
      .filter((s: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === s.id) === i);

    const items = (allWorkItems as any[]).filter((w: any) => {
      const sub = w.work_subcategories;
      if (!sub || sub.category_id !== selCat) return false;
      if (selSub && sub.id !== selSub) return false;
      return true;
    });

    const handleAdd = async (wi: any) => {
      const qty = parseFloat(quantities[wi.id] || '') || 0;
      if (!qty || qty <= 0) { alert('Enter a contract quantity.'); return; }
      setAdding(wi.id);
      await addItemToProject(project.id, wi.id, qty);
      setAdding(null);
      router.refresh();
    };

    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="form-label">Category</label>
            <select className="select-input" value={selCat}
              onChange={e => { setSelCat(e.target.value); setSelSub(''); }}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="form-label">Subcategory</label>
            <select className="select-input" value={selSub} onChange={e => setSelSub(e.target.value)}>
              <option value="">All subcategories</option>
              {subs.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState iconName="Layers" title="No items" description="No work items found for this category." />
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Subcategory</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>Contract Qty</th>
                    <th>Contract Amt ($)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((wi: any) => {
                    const added = existingIds.has(wi.id);
                    return (
                      <tr key={wi.id}>
                        <td style={{ maxWidth: 320 }}>
                          <p style={{ fontWeight: 500, color: '#E8EAF0', fontSize: 13 }}>{wi.description}</p>
                        </td>
                        <td>
                          <Chip color="#5B8DEF">{wi.work_subcategories?.name}</Chip>
                        </td>
                        <td>
                          <Chip>{wi.units?.abbreviation}</Chip>
                        </td>
                        <td style={{ color: '#C8A96E', fontWeight: 600 }}>${formatCurrency(wi.rate)}</td>
                        <td>
                          {!added && (
                            <input className="input" type="number" placeholder="0"
                              value={quantities[wi.id] || ''}
                              onChange={e => setQuantities(p => ({ ...p, [wi.id]: e.target.value }))}
                              style={{ width: 100 }} />
                          )}
                        </td>
                        <td>
                          {added ? (
                            <span className="badge" style={{ background: '#4CAF8222', color: '#4CAF82' }}>
                              <CheckCircle2 size={11} />Added
                            </span>
                          ) : (
                            <span style={{ color: '#C8A96E', fontWeight: 600 }}>
                              ${formatCurrency((parseFloat(quantities[wi.id] || '0') || 0) * wi.rate)}
                            </span>
                          )}
                        </td>
                        <td>
                          {!added && (
                            <button className="btn btn-primary btn-sm" disabled={adding === wi.id}
                              onClick={() => handleAdd(wi)}>
                              {adding === wi.id ? '…' : <><Plus size={13} />Add</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {/* Tab bar */}
      <div style={{ padding: '0 28px', borderBottom: '1px solid #3A4255', display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{
                padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500,
                borderBottom: tab === t.id ? '2px solid #C8A96E' : '2px solid transparent',
                color: tab === t.id ? '#C8A96E' : '#8892A4',
                transition: 'all 0.15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setModal('status')}>
            Update Status
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} />Export BOQ
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* ---- SUMMARY TAB ---- */}
        {tab === 'summary' && (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
              <StatCard label="Contract Value" value={`$${formatCurrency(totalContract)}`} iconName="DollarSign" color="#C8A96E" />
              <StatCard label="Executed" value={`$${formatCurrency(totalExecuted)}`} iconName="TrendingUp" color="#4CAF82" />
              <StatCard label="Remaining" value={`$${formatCurrency(totalContract - totalExecuted)}`} iconName="AlertCircle" color="#E05656" />
              <StatCard label="Progress" value={`${overall.toFixed(1)}%`} iconName="CheckCircle2" color={progressColor(overall)} />
            </div>

            {project.description && (
              <div className="card" style={{ padding: 18, marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: '#8892A4', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</p>
                <p style={{ fontSize: 14, color: '#C8CDD8', lineHeight: 1.6 }}>{project.description}</p>
              </div>
            )}

            <div className="card" style={{ padding: 20 }}>
              <p className="font-display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Category Breakdown</p>
              {grouped.length === 0 ? (
                <p style={{ color: '#5A6475', fontSize: 14 }}>No items added yet.</p>
              ) : grouped.map(({ cat, color, contract, executed }) => (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ColorDot color={color} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#E8EAF0', flex: 1 }}>{cat}</span>
                    <span style={{ fontSize: 12, color: '#8892A4' }}>${formatCurrency(contract)}</span>
                  </div>
                  <ProgressBar value={calcProgress(executed, contract)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- BOQ TAB ---- */}
        {tab === 'boq' && (
          <div className="animate-fade-in">
            <div className="card" style={{ padding: 18, marginBottom: 20 }}>
              <ProgressBar value={overall} label="Overall Progress" height={10} />
              <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#8892A4' }}>
                  Contract: <strong style={{ color: '#C8A96E' }}>${formatCurrency(totalContract)}</strong>
                </span>
                <span style={{ fontSize: 12, color: '#8892A4' }}>
                  Executed: <strong style={{ color: '#4CAF82' }}>${formatCurrency(totalExecuted)}</strong>
                </span>
                <span style={{ fontSize: 12, color: '#8892A4' }}>
                  Remaining: <strong style={{ color: '#E05656' }}>${formatCurrency(totalContract - totalExecuted)}</strong>
                </span>
              </div>
            </div>

            {boq.length === 0 ? (
              <EmptyState iconName="Layers" title="No items in BOQ"
                description="Switch to the 'Add Items' tab to add work items to this project."
                action={<button className="btn btn-primary" onClick={() => setTab('add')}><Plus size={15} />Add Items</button>}
              />
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th>Unit</th>
                        <th>Rate</th>
                        <th>Qty</th>
                        <th>Contract Amt</th>
                        <th>Executed Amt</th>
                        <th>Progress</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map(({ cat, color, rows }) => (
                        <>
                          {/* Category header */}
                          <tr key={`cat-${cat}`}>
                            <td colSpan={9} style={{ background: '#1A1F2E', padding: '8px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ColorDot color={color} size={8} />
                                <span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
                                  letterSpacing: '0.7px', color }}>
                                  {cat}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {rows.map((row, idx) => {
                            const pct = Number(row.progress_percent);
                            return (
                              <tr key={row.project_item_id}>
                                <td style={{ color: '#5A6475', fontSize: 12 }}>{idx + 1}</td>
                                <td style={{ maxWidth: 280 }}>
                                  <p style={{ fontWeight: 500, color: '#E8EAF0', fontSize: 13 }}>{row.item_description}</p>
                                  <p style={{ fontSize: 11, color: '#5A6475' }}>{row.subcategory_name}</p>
                                </td>
                                <td><Chip>{row.unit}</Chip></td>
                                <td style={{ color: '#8892A4' }}>${formatCurrency(row.rate)}</td>
                                <td style={{ color: '#8892A4' }}>{Number(row.contract_quantity).toFixed(2)}</td>
                                <td style={{ fontWeight: 700, color: '#C8A96E' }}>${formatCurrency(row.contract_amount)}</td>
                                <td style={{ fontWeight: 700, color: '#4CAF82' }}>${formatCurrency(row.executed_amount)}</td>
                                <td style={{ minWidth: 140 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ flex: 1, background: '#1A1F2E', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%',
                                        background: progressColor(pct), borderRadius: 999,
                                        transition: 'width 0.5s ease' }} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: progressColor(pct), minWidth: 36 }}>
                                      {pct.toFixed(0)}%
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-icon btn-sm"
                                      title="Take off sheet"
                                      onClick={() => setModal({ type: 'takeoff', row })}>
                                      <ClipboardList size={13} color="#5B8DEF" />
                                    </button>
                                    <button className="btn btn-ghost btn-icon btn-sm"
                                      title="Update progress"
                                      onClick={() => setModal({ type: 'progress', row })}>
                                      <Pencil size={13} color="#C8A96E" />
                                    </button>
                                    <button className="btn btn-danger btn-icon btn-sm"
                                      onClick={async () => {
                                        if (!confirm('Remove this item from the project?')) return;
                                        await removeProjectItem(row.project_item_id, project.id);
                                        router.refresh();
                                      }}>
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} style={{ fontWeight: 700, color: '#E8EAF0', background: '#1A1F2E', fontSize: 13 }}>
                          TOTAL
                        </td>
                        <td style={{ fontWeight: 700, color: '#C8A96E', background: '#1A1F2E', fontSize: 14 }}>
                          ${formatCurrency(totalContract)}
                        </td>
                        <td style={{ fontWeight: 700, color: '#4CAF82', background: '#1A1F2E', fontSize: 14 }}>
                          ${formatCurrency(totalExecuted)}
                        </td>
                        <td colSpan={2} style={{ background: '#1A1F2E' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: progressColor(overall) }}>
                            {overall.toFixed(1)}% complete
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- ADD ITEMS TAB ---- */}
        {tab === 'add' && (
          <div className="animate-fade-in"><AddItemsTab /></div>
        )}
      </div>

      {/* Modals */}
      {modal === 'status' && <StatusModal />}
      {modal && typeof modal === 'object' && modal.type === 'progress' && (
        <ProgressModal row={modal.row} />
      )}
      {modal && typeof modal === 'object' && modal.type === 'takeoff' && (
        <TakeOffModal row={modal.row} />
      )}
    </>
  );
}
