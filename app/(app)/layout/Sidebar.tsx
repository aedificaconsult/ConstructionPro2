'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, BookOpen, Tag, Ruler,
  ChevronLeft, ChevronRight, Building2, HardHat,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects',           icon: FolderKanban,    label: 'Projects' },
  { href: '/library/items',      icon: BookOpen,        label: 'Work Library' },
  { href: '/library/categories', icon: Tag,             label: 'Categories' },
  { href: '/settings/units',     icon: Ruler,           label: 'Units' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        minHeight: '100vh',
        background: '#1A1F2E',
        borderRight: '1px solid #3A4255',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 14px' : '20px 18px', borderBottom: '1px solid #3A4255' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#C8A96E,#A87830)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <HardHat size={18} color="#111520" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 800, color: '#E8EAF0' }}>
                Construct<span style={{ color: '#C8A96E' }}>Pro</span>
              </span>
              <p style={{ fontSize: 10, color: '#5A6475', marginTop: 1, letterSpacing: '0.5px' }}>
                PROJECT MANAGEMENT
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '14px 8px', flex: 1, overflowY: 'auto' }}>
        {!collapsed && (
          <p style={{ fontSize: 10, color: '#5A6475', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.8px', padding: '0 8px', marginBottom: 8 }}>
            Navigation
          </p>
        )}
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                className={`nav-item${active ? ' active' : ''}`}
                title={collapsed ? label : undefined}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: 2 }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #3A4255' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="nav-item"
          style={{
            width: '100%', border: 'none', cursor: 'pointer', background: 'transparent',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
