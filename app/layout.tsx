import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConstructPro – Construction Project Management',
  description: 'Professional BOQ and project progress tracking for construction engineers.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
