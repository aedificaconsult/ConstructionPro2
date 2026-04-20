import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, StatCard, ProgressBar, StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, calcProgress } from '@/lib/utils';

export const revalidate = 0;

async function getDashboardData() {
  const supabase = createClient();
  const [{ data: projects }, { data: items }] = await Promise.all([
    supabase.from('project_summary').select('*').order('created_at', { ascending: false }),
    supabase.from('project_items').select('contract_amount, executed_amount'),
  ]);
  return { projects: projects || [], items: items || [] };
}

export default async function DashboardPage() {
  const { projects, items } = await getDashboardData();

  const totalContract = items.reduce((s, i) => s + Number(i.contract_amount), 0);
  const totalExecuted = items.reduce((s, i) => s + Number(i.executed_amount), 0);
  const overallProgress = calcProgress(totalExecuted, totalContract);
  const active = projects.filter((p: any) => p.status === 'In Progress').length;
  const completed = projects.filter((p: any) => p.status === 'Completed').length;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Overview">
        <Link href="/projects/new">
          <button className="btn btn-primary"><Plus size={15} />New Project</button>
        </Link>
      </PageHeader>

      <div style={{ padding: '24px 28px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Projects"   value={projects.length}                        sub={`${active} active`}                   iconName="Building2"     color="#5B8DEF" />
          <StatCard label="Completed"        value={completed}                              sub="projects finished"                    iconName="CheckCircle2"  color="#4CAF82" />
          <StatCard label="Contract Value"   value={`$${formatCurrency(totalContract)}`}   sub="total awarded"                        iconName="DollarSign"    color="#C8A96E" />
          <StatCard label="Overall Progress" value={`${overallProgress.toFixed(1)}%`}      sub={`$${formatCurrency(totalExecuted)} executed`} iconName="TrendingUp" color="#C8A96E" />
        </div>

        {/* Portfolio progress */}
        <div className="card" style={{ padding: 20, marginBottom: 28 }}>
          <p className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#E8EAF0', marginBottom: 14 }}>
            Portfolio Progress
          </p>
          <ProgressBar value={overallProgress} height={10} />
          <div style={{ display: 'flex', gap: 28, marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#8892A4' }}>
              Executed: <strong style={{ color: '#4CAF82' }}>${formatCurrency(totalExecuted)}</strong>
            </span>
            <span style={{ fontSize: 12, color: '#8892A4' }}>
              Remaining: <strong style={{ color: '#E05656' }}>${formatCurrency(totalContract - totalExecuted)}</strong>
            </span>
            <span style={{ fontSize: 12, color: '#8892A4' }}>
              Contract: <strong style={{ color: '#C8A96E' }}>${formatCurrency(totalContract)}</strong>
            </span>
          </div>
        </div>

        {/* Project grid */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p className="font-display" style={{ fontSize: 17, fontWeight: 700, color: '#E8EAF0' }}>
            Recent Projects
          </p>
          {projects.length > 0 && (
            <Link href="/projects" style={{ fontSize: 13, color: '#C8A96E', textDecoration: 'none' }}>
              View all →
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <EmptyState
            iconName="Building2"
            title="No projects yet"
            description="Create your first construction project to get started with BOQ tracking."
            action={
              <Link href="/projects/new">
                <button className="btn btn-primary"><Plus size={15} />New Project</button>
              </Link>
            }
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
            {projects.slice(0, 6).map((proj: any) => {
              const progress = Number(proj.progress_percent || 0);
              return (
                <Link key={proj.id} href={`/projects/${proj.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card card-hover" style={{ padding: 18, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                        <p className="font-display" style={{ fontWeight: 700, color: '#E8EAF0', fontSize: 15, marginBottom: 3 }}>
                          {proj.name}
                        </p>
                        {proj.location && (
                          <p style={{ fontSize: 12, color: '#8892A4' }}>📍 {proj.location}</p>
                        )}
                      </div>
                      <StatusBadge status={proj.status} />
                    </div>
                    <ProgressBar value={progress} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14,
                      paddingTop: 14, borderTop: '1px solid #3A4255' }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#8892A4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contract</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#C8A96E' }}>
                          ${formatCurrency(proj.total_contract_amount)}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#8892A4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Executed</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#4CAF82' }}>
                          ${formatCurrency(proj.total_executed_amount)}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#5A6475', marginTop: 10 }}>
                      {proj.item_count} BOQ items
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
