import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import CategoriesClient from '@/components/library/CategoriesClient';

export const revalidate = 0;

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from('work_categories')
    .select('*, work_subcategories(id, name, created_at)')
    .order('name');

  return (
    <div className="animate-fade-in">
      <PageHeader title="Categories" subtitle="Work Library" />
      <div style={{ padding: '20px 28px' }}>
        <CategoriesClient categories={categories || []} />
      </div>
    </div>
  );
}
