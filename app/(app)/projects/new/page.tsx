import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import NewProjectForm from '@/components/projects/NewProjectForm';

export default function NewProjectPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="New Project" subtitle="Projects">
        <Link href="/projects">
          <button className="btn btn-secondary"><ArrowLeft size={15} />Back</button>
        </Link>
      </PageHeader>
      <div style={{ padding: '32px 28px', maxWidth: 680 }}>
        <NewProjectForm />
      </div>
    </div>
  );
}
