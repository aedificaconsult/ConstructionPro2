'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Modal, Field, EmptyState, ColorDot } from '@/components/ui';
import { createCategory, deleteCategory, createSubcategory, deleteSubcategory } from '@/lib/actions/library';

const PALETTE = ['#E05656','#5B8DEF','#F5A623','#4CAF82','#C8A96E','#A87EDB','#E05B9D','#4ECDC4','#FF6B6B','#45B7D1'];

export default function CategoriesClient({ categories }: { categories: any[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<null | 'newCat' | { type: 'newSub'; catId: string }>(null);
  const [loading, setLoading] = useState(false);

  // ---- NEW CATEGORY FORM ----
  const NewCatModal = () => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(PALETTE[0]);
    const [desc, setDesc] = useState('');
    return (
      <Modal title="New Category" onClose={() => setModal(null)} width={440}>
        <Field label="Category Name" required>
          <input className="input" placeholder="e.g. Civil Works" value={name} onChange={e => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <input className="input" placeholder="Optional description" value={desc} onChange={e => setDesc(e.target.value)} />
        </Field>
        <Field label="Color">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {PALETTE.map(c => (
              <div key={c} onClick={() => setColor(c)}
                style={{
                  width: 30, height: 30, borderRadius: 7, background: c, cursor: 'pointer',
                  border: color === c ? '3px solid #E8EAF0' : '3px solid transparent',
                  transition: 'transform 0.1s', transform: color === c ? 'scale(1.15)' : 'scale(1)',
                }} />
            ))}
          </div>
        </Field>
        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: '#1A1F2E', borderRadius: 8, marginBottom: 20 }}>
          <ColorDot color={color} size={12} />
          <span style={{ fontWeight: 600, color: '#E8EAF0', fontSize: 14 }}>
            {name || 'Category Preview'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} disabled={loading || !name}
            onClick={async () => {
              setLoading(true);
              await createCategory(name, color, desc);
              setModal(null); setLoading(false); router.refresh();
            }}>
            {loading ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </Modal>
    );
  };

  // ---- NEW SUBCATEGORY FORM ----
  const NewSubModal = ({ catId }: { catId: string }) => {
    const cat = categories.find(c => c.id === catId);
    const [name, setName] = useState('');
    return (
      <Modal title="New Subcategory" onClose={() => setModal(null)} width={420}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: '#1A1F2E', borderRadius: 8, marginBottom: 20 }}>
          <ColorDot color={cat?.color || '#C8A96E'} size={10} />
          <span style={{ fontSize: 13, color: '#C8CDD8' }}>Under: <strong style={{ color: '#E8EAF0' }}>{cat?.name}</strong></span>
        </div>
        <Field label="Subcategory Name" required>
          <input className="input" placeholder="e.g. Foundation Concrete" value={name} onChange={e => setName(e.target.value)} />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} disabled={loading || !name}
            onClick={async () => {
              setLoading(true);
              await createSubcategory(catId, name);
              setModal(null); setLoading(false); router.refresh();
            }}>
            {loading ? 'Creating…' : 'Add Subcategory'}
          </button>
        </div>
      </Modal>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setModal('newCat')}>
          <Plus size={15} />New Category
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState iconName="Tag" title="No categories yet"
          description="Create work categories to organize your global item library."
          action={<button className="btn btn-primary" onClick={() => setModal('newCat')}><Plus size={15} />New Category</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(350px,1fr))', gap: 16 }}>
          {categories.map((cat: any) => {
            const isOpen = expanded[cat.id];
            const subs: any[] = cat.work_subcategories || [];
            return (
              <div key={cat.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Category header */}
                <div style={{ padding: '16px 18px', borderBottom: isOpen ? '1px solid #3A4255' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Color swatch */}
                    <div style={{ width: 38, height: 38, borderRadius: 9,
                      background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ColorDot color={cat.color} size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="font-display" style={{ fontWeight: 700, color: '#E8EAF0', fontSize: 14, marginBottom: 2 }}>
                        {cat.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#8892A4' }}>
                        {subs.length} subcategorie{subs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        title="Add subcategory"
                        onClick={() => setModal({ type: 'newSub', catId: cat.id })}>
                        <Plus size={14} color="#C8A96E" />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm"
                        onClick={async () => {
                          if (!confirm(`Delete "${cat.name}" and all its subcategories?`)) return;
                          await deleteCategory(cat.id); router.refresh();
                        }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subcategories */}
                {isOpen && (
                  <div style={{ padding: '10px 18px 14px' }}>
                    {subs.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#5A6475', padding: '6px 0' }}>
                        No subcategories yet.
                      </p>
                    ) : subs.map((sub: any) => (
                      <div key={sub.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: '1px solid #2D3447',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%',
                            background: cat.color, display: 'inline-block' }} />
                          <span style={{ fontSize: 13, color: '#C8CDD8' }}>{sub.name}</span>
                        </div>
                        <button className="btn btn-danger btn-icon btn-sm"
                          onClick={async () => {
                            if (!confirm(`Delete subcategory "${sub.name}"?`)) return;
                            await deleteSubcategory(sub.id); router.refresh();
                          }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%' }}
                      onClick={() => setModal({ type: 'newSub', catId: cat.id })}>
                      <Plus size={13} />Add Subcategory
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new placeholder card */}
          <div className="card" style={{
            padding: 24, cursor: 'pointer', minHeight: 90,
            border: '1px dashed #3A4255',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }} onClick={() => setModal('newCat')}>
            <Plus size={22} color="#5A6475" />
            <span style={{ fontSize: 13, color: '#5A6475' }}>New Category</span>
          </div>
        </div>
      )}

      {modal === 'newCat' && <NewCatModal />}
      {modal && typeof modal === 'object' && modal.type === 'newSub' && <NewSubModal catId={modal.catId} />}
    </>
  );
}
