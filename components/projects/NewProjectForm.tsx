'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/actions/projects';
import { Field } from '@/components/ui';
import type { ProjectStatus } from '@/types';

export default function NewProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', location: '',
    start_date: '', end_date: '', status: 'Not Started' as ProjectStatus,
  });
  const [error, setError] = useState('');

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setLoading(true);
    try {
      const proj = await createProject(form);
      router.push(`/projects/${proj.id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 28 }}>
      <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: '#E8EAF0', marginBottom: 24 }}>
        Project Details
      </p>

      {error && (
        <div style={{ background: '#E0565618', border: '1px solid #E0565633', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#E05656' }}>
          {error}
        </div>
      )}

      <Field label="Project Name" required>
        <input className="input" placeholder="e.g. Residential Tower Block A" value={form.name} onChange={f('name')} />
      </Field>
      <Field label="Location">
        <input className="input" placeholder="e.g. Addis Ababa, Ethiopia" value={form.location} onChange={f('location')} />
      </Field>
      <Field label="Description">
        <textarea className="input" rows={3} placeholder="Brief project overview, scope, client..." value={form.description} onChange={f('description')} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Start Date">
          <input type="date" className="input" value={form.start_date} onChange={f('start_date')} />
        </Field>
        <Field label="End Date">
          <input type="date" className="input" value={form.end_date} onChange={f('end_date')} />
        </Field>
      </div>

      <Field label="Initial Status">
        <select className="select-input" value={form.status} onChange={f('status')}>
          {(['Not Started', 'In Progress', 'Completed', 'On Hold'] as ProjectStatus[]).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => router.back()}>
          Cancel
        </button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}
