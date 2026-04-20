import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import UnitsClient from '@/components/settings/UnitsClient';

export const revalidate = 0;

export default async function UnitsPage() {
  const supabase = createClient();
  const { data: units } = await supabase.from('units').select('*').order('name');
  return (
    <div className="animate-fade-in">
      <PageHeader title="Units of Measurement" subtitle="Settings" />
      <div style={{ padding: '20px 28px' }}>
        <UnitsClient units={units || []} />
      </div>
    </div>
  );
}
