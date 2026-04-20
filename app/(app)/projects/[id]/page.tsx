import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui';
import ProjectTabs from '@/components/projects/ProjectTabs';

export const revalidate = 0;

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: project }, { data: boq }, { data: categories }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', params.id).single(),
    supabase.from('project_boq').select('*').eq('project_id', params.id).order('category_name').order('subcategory_name'),
    supabase.from('work_categories').select('*').order('name'),
  ]);

  if (!project) notFound();

  // Fetch work items with full joins for "Add Items" tab
  const { data: allWorkItems } = await supabase
    .from('work_items')
    .select(`*, units(id,name,abbreviation), work_subcategories(id,name,category_id,work_categories(id,name,color))`)
    .order('description');

  // Fetch units
  const { data: units } = await supabase.from('units').select('*').order('name');

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh' }}>
      {/* Back bar */}
      <div style={{
        padding: '14px 28px', borderBottom: '1px solid #3A4255',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <Link href="/projects" style={{ textDecoration: 'none' }}>
          <button className="btn btn-ghost btn-sm"><ArrowLeft size={15} />Projects</button>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: '#8892A4' }}>Project</p>
          <h1 className="font-display" style={{ fontSize: 20, fontWeight: 800, color: '#E8EAF0', margin: 0 }}>
            {project.name}
          </h1>
        </div>
        {project.location && (
          <span style={{ fontSize: 13, color: '#8892A4' }}>📍 {project.location}</span>
        )}
        <StatusBadge status={project.status} />
      </div>

      {/* Tabs — client component for interactivity */}
      <ProjectTabs
        project={project}
        boq={boq || []}
        allWorkItems={allWorkItems || []}
        categories={categories || []}
        units={units || []}
      />
    </div>
  );
}
