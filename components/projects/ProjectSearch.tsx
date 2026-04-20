'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useCallback } from 'react';

export default function ProjectSearch() {
  const router = useRouter();
  const params = useSearchParams();

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    const url = new URLSearchParams(params.toString());
    if (q) url.set('q', q); else url.delete('q');
    router.push(`/projects?${url.toString()}`);
  }, [router, params]);

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <Search size={15} color="#5A6475" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
      <input
        className="input"
        placeholder="Search projects by name or location..."
        defaultValue={params.get('q') || ''}
        onChange={handleSearch}
        style={{ paddingLeft: 36, maxWidth: 400 }}
      />
    </div>
  );
}
