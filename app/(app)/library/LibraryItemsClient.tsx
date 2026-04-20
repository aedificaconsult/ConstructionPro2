'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Modal, Field, EmptyState, Chip, ColorDot } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { createWorkItem, updateWorkItem, deleteWorkItem } from '@/lib/actions/library';

export default function LibraryItemsClient({ items, categories, units }: any) {
  const router = useRouter();
  const [modal, setModal] = useState<null | 'new' | { type: 'edit'; item: any }>(null);
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('');
  const [selSub, setSelSub] = useState('');
  const [loading, setLoading] = useState(false);

  const subs = selCat
    ? (categories.find((c: any) => c.id === selCat)?.work_subcategories || [])
    : [];

  const filtered = items.filter((wi: any) => {
    if (search && !wi.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (selCat && wi.work_subcategories?.work_categories?.id !== selCat) return false;
    if (selSub && wi.subcategory_id !== selSub) return false;
    return true;
  });

  // ---- FORM ----
  const ItemForm = ({ existing }: { existing?: any }) => {
    const [form, setForm] = useState({
      subcategory_id: existing?.subcategory_id || '',
      description: existing?.description || '',
      unit_id: existing?.unit_id || units[0]?.id || '',
      rate: existing?.rate ? String(existing.rate) : '',
    });
    const [lCat, setLCat] = useState(
      existing ? existing.work_subcategories?.work_categories?.id || '' : ''
    );
    const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
    const lSubs = lCat ? (categories.find((c: any) => c.id === lCat)?.work_subcategories || []) : [];

    const handleSave = async () => {
      if (!form.description || !form.subcategory_id || !form.rate) {
        alert('Please fill all required fields.'); return;
      }
      setLoading(true);
      try {
        if (existing) {
          await updateWorkItem(existing.id, {
            description: form.description,
            unit_id: form.unit_id,
            rate: parseFloat(form.rate),
            subcategory_id: form.subcategory_id,
          });
        } else {
          await createWorkItem(form.subcategory_id, form.description, form.unit_id, parseFloat(form.rate));
        }
        setModal(null); router.refresh();
      } finally { setLoading(false); }
    };

    return (
      <>
        <Field label="Category" required>
          <select className="select-input" value={lCat}
            onChange={e => { setLCat(e.target.value); setForm(p => ({ ...p, subcategory_id: '' })); }}>
            <option value="">Select category…</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Subcategory" required>
          <select className="select-input" value={form.subcategory_id} onChange={f('subcategory_id')}>
            <option value="">Select subcategory…</option>
            {lSubs.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Item Description" required>
          <input className="input" placeholder="Detailed work item description…" value={form.description} onChange={f('description')} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Unit" required>
            <select className="select-input" value={form.unit_id} onChange={f('unit_id')}>
              {units.map((u: any) => <option key={u.id} value={u.id}>{u.abbreviation} — {u.name}</option>)}
            </select>
          </Field>
          <Field label="Rate per Unit ($)" required>
            <input className="input" type="number" min={0} step={0.01} placeholder="0.00" value={form.rate} onChange={f('rate')} />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} disabled={loading} onClick={handleSave}>
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create Item'}
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
          <Search size={14} color="#5A6475" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input" placeholder="Search items…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <select className="select-input" value={selCat} onChange={e => { setSelCat(e.target.value); setSelSub(''); }}>
            <option value="">All categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <select className="select-input" value={selSub} onChange={e => setSelSub(e.target.value)} disabled={!selCat}>
            <option value="">All subcategories</option>
            {subs.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Plus size={15} />New Item
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#8892A4', marginBottom: 12 }}>{filtered.length} items</p>

      {filtered.length === 0 ? (
        <EmptyState iconName="BookOpen" title="No items found"
          description="Build your global work items library to reuse across projects."
          action={<button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={15} />New Item</button>}
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Subcategory</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wi: any, i: number) => (
                  <tr key={wi.id}>
                    <td style={{ color: '#5A6475', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ maxWidth: 380, fontWeight: 500, color: '#E8EAF0', fontSize: 13 }}>
                      {wi.description}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ColorDot color={wi.work_subcategories?.work_categories?.color || '#3A4255'} size={8} />
                        <span style={{ fontSize: 12, color: '#C8CDD8' }}>
                          {wi.work_subcategories?.work_categories?.name}
                        </span>
                      </div>
                    </td>
                    <td><Chip color="#5B8DEF">{wi.work_subcategories?.name}</Chip></td>
                    <td><Chip>{wi.units?.abbreviation}</Chip></td>
                    <td style={{ fontWeight: 700, color: '#C8A96E' }}>${formatCurrency(wi.rate)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setModal({ type: 'edit', item: wi })}>
                          <Pencil size={13} color="#C8A96E" />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm"
                          onClick={async () => {
                            if (!confirm('Delete this work item?')) return;
                            await deleteWorkItem(wi.id); router.refresh();
                          }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'new' && (
        <Modal title="New Work Item" onClose={() => setModal(null)}>
          <ItemForm />
        </Modal>
      )}
      {modal && typeof modal === 'object' && modal.type === 'edit' && (
        <Modal title="Edit Work Item" onClose={() => setModal(null)}>
          <ItemForm existing={modal.item} />
        </Modal>
      )}
    </>
  );
}
