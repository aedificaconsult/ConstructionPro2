import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import LibraryItemsClient from '@/components/library/LibraryItemsClient';

export const revalidate = 0;

export default async function LibraryItemsPage() {
  const supabase = createClient();
  const [{ data: items }, { data: categories }, { data: units }] = await Promise.all([
    supabase.from('work_items')
      .select('*, units(*), work_subcategories(*, work_categories(*))')
      .order('description'),
    supabase.from('work_categories').select('*, work_subcategories(*)').order('name'),
    supabase.from('units').select('*').order('name'),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Work Library" subtitle="Manage">
        <span style={{ fontSize: 13, color: '#8892A4' }}>{(items || []).length} items</span>
      </PageHeader>
      <div style={{ padding: '20px 28px' }}>
        <LibraryItemsClient
          items={items || []}
          categories={categories || []}
          units={units || []}
        />
      </div>
    </div>
  );
}
