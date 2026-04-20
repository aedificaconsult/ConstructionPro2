'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, Field, EmptyState } from '@/components/ui';
import { createUnit, deleteUnit } from '@/lib/actions/library';

export default function UnitsClient({ units }: { units: any[] }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name || !abbr) { setError('Both fields are required.'); return; }
    setLoading(true); setError('');
    try {
      await createUnit(name.trim(), abbr.trim());
      setModal(false); setName(''); setAbbr(''); router.refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to create unit.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: '#8892A4' }}>
            {units.length} units — commonly used units are pre-seeded in the database.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} />New Unit
        </button>
      </div>

      {units.length === 0 ? (
        <EmptyState iconName="Ruler" title="No units found" description="Units are seeded automatically. Add custom ones as needed." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {units.map((u: any) => (
            <div key={u.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10, background: '#C8A96E18',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span className="font-display" style={{ fontWeight: 800, color: '#C8A96E', fontSize: 13, letterSpacing: '-0.5px' }}>
                  {u.abbreviation}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: '#E8EAF0', fontSize: 14, marginBottom: 2 }}>{u.name}</p>
                <p style={{ fontSize: 11, color: '#8892A4' }}>{u.abbreviation}</p>
              </div>
              <button className="btn btn-danger btn-icon btn-sm"
                onClick={async () => {
                  if (!confirm(`Delete unit "${u.name}"?`)) return;
                  await deleteUnit(u.id); router.refresh();
                }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="New Unit" onClose={() => setModal(false)} width={380}>
          {error && (
            <div style={{ background: '#E0565618', border: '1px solid #E0565633', borderRadius: 8,
              padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#E05656' }}>
              {error}
            </div>
          )}
          <Field label="Unit Name" required>
            <input className="input" placeholder="e.g. Square Meter" value={name}
              onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Abbreviation" required hint="Use standard engineering notation (e.g. m², m³, kg)">
            <input className="input" placeholder="e.g. m²" value={abbr}
              onChange={e => setAbbr(e.target.value)} style={{ maxWidth: 160 }} />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} disabled={loading} onClick={handleCreate}>
              {loading ? 'Adding…' : 'Add Unit'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
