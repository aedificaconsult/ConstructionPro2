import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, ProgressBar, StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import ProjectSearch from '@/components/projects/ProjectSearch';
import type { ProjectSummary } from '@/types';

export const revalidate = 0;

type SearchParams = {
  q?: string;
  status?: string;
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  let projects: any[] = [];

  try {
    const supabase = createClient();

    let query = supabase
      .from('project_summary')
      .select('*')
      .order('created_at', { ascending: false });

    if (searchParams?.status) {
      query = query.eq('status', searchParams.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error.message);
    }

    projects = data || [];
  } catch (err) {
    console.error('Server error:', err);
  }

  const q = searchParams?.q?.toLowerCase() || '';

  const filtered = projects.filter((p: ProjectSummary) => {
    const name = (p?.name || '').toLowerCase();
    const location = (p?.location || '').toLowerCase();

    return !q || name.includes(q) || location.includes(q);
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Projects" subtitle="Construction">
        <Link href="/projects">
          <button className="btn btn-primary">
            <Plus size={15} /> New Project
          </button>
        </Link>
      </PageHeader>

      <div style={{ padding: '20px 28px' }}>
        <ProjectSearch />

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[null, 'Not Started', 'In Progress', 'Completed', 'On Hold'].map((s) => {
            const active = (searchParams?.status || null) === s;

            return (
              <Link
                key={s || 'all'}
                href={s ? `/projects?status=${encodeURIComponent(s)}` : '/projects'}
                style={{ textDecoration: 'none' }}
              >
                <button
                  className={active ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  style={{ borderRadius: 999 }}
                >
                  {s || 'All'}
                </button>
              </Link>
            );
          })}
        </div>

        {/* DEBUG VIEW (remove later if needed) */}
        {projects.length === 0 && (
          <div style={{ color: '#aaa', marginBottom: 20 }}>
            No data returned from database.
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            iconName="Building2"
            title="No projects found"
            description={
              q
                ? 'Try a different search term.'
                : 'Create your first project to get started.'
            }
            action={
              !q && (
                <Link href="/projects/new">
                  <button className="btn btn-primary">
                    <Plus size={15} /> New Project
                  </button>
                </Link>
              )
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
              gap: 18,
            }}
          >
            {filtered.map((proj: ProjectSummary) => (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card card-hover" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <h3
                        className="font-display"
                        style={{
                          fontWeight: 700,
                          color: '#E8EAF0',
                          fontSize: 18,
                          marginBottom: 6,
                          lineHeight: 1.3,
                        }}
                      >
                        {proj.name || 'Unnamed Project'}
                      </h3>

                      {proj.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 13, color: '#8892A4' }}>
                            📍 {proj.location}
                          </span>
                        </div>
                      )}
                    </div>
                    <StatusBadge status={proj.status || 'Unknown'} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#8892A4', fontWeight: 500 }}>
                        PROGRESS
                      </span>
                      <span style={{ fontSize: 12, color: '#C8A96E', fontWeight: 600 }}>
                        {Math.round(proj.progress_percent || 0)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={Number(proj.progress_percent || 0)}
                      label=""
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ backgroundColor: '#1A1F2E', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 11, color: '#8892A4', textTransform: 'uppercase', marginBottom: 4 }}>
                        Contract Value
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#C8A96E' }}>
                        ${formatCurrency(proj.total_contract_amount || 0)}
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#1A1F2E', padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: 11, color: '#8892A4', textTransform: 'uppercase', marginBottom: 4 }}>
                        Executed Value
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#4CAF82' }}>
                        ${formatCurrency(proj.total_executed_amount || 0)}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #3A4255' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#5A6475' }}>
                          📅 {proj.start_date ? new Date(proj.start_date).toLocaleDateString() : 'No start date'}
                        </span>
                        {proj.end_date && (
                          <>
                            <span style={{ fontSize: 12, color: '#5A6475' }}>→</span>
                            <span style={{ fontSize: 12, color: '#5A6475' }}>
                              {new Date(proj.end_date).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#8892A4' }}>
                          📋 {proj.item_count || 0} items
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}