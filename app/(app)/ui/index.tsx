'use client';

import { ReactNode } from 'react';
import {
  X, Building2, CheckCircle2, DollarSign, TrendingUp,
  AlertCircle, Layers, BookOpen, Tag, Ruler, HardHat,
  type LucideIcon,
} from 'lucide-react';
import { cn, progressColor } from '@/lib/utils';

// Icon name → component map (avoids passing components across server/client boundary)
const ICON_MAP: Record<string, LucideIcon> = {
  Building2, CheckCircle2, DollarSign, TrendingUp,
  AlertCircle, Layers, BookOpen, Tag, Ruler, HardHat,
};

// ============================================================
// PAGE HEADER
// ============================================================
export function PageHeader({
  title, subtitle, children,
}: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div style={{
      padding: '24px 28px 20px',
      borderBottom: '1px solid #3A4255',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <div>
        {subtitle && (
          <p style={{ fontSize: 11, color: '#C8A96E', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            {subtitle}
          </p>
        )}
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: '#E8EAF0', margin: 0 }}>
          {title}
        </h1>
      </div>
      {children && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>}
    </div>
  );
}

// ============================================================
// MODAL
// ============================================================
export function Modal({
  title, onClose, children, width = 560,
}: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-scale-in" style={{ width: '100%', maxWidth: width }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #3A4255',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// FORM FIELD
// ============================================================
export function Field({
  label, children, hint, required,
}: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="form-label">
        {label}{required && <span style={{ color: '#E05656' }}> *</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#5A6475', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
export function StatCard({
  label, value, sub, iconName, color = '#C8A96E',
}: { label: string; value: string | number; sub?: string; iconName: string; color?: string }) {
  const Icon = ICON_MAP[iconName] || Building2;
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: '#8892A4', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
            {label}
          </p>
          <p className="font-display" style={{ fontSize: 28, fontWeight: 700, color: '#E8EAF0', lineHeight: 1 }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: 12, color: '#8892A4', marginTop: 6 }}>{sub}</p>}
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROGRESS BAR
// ============================================================
export function ProgressBar({
  value, label, height = 6, showLabel = true,
}: { value: number; label?: string; height?: number; showLabel?: boolean }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = progressColor(pct);
  return (
    <div>
      {(label || showLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <span style={{ fontSize: 12, color: '#8892A4' }}>{label}</span>}
          <span style={{ fontSize: 12, fontWeight: 700, color, marginLeft: 'auto' }}>
            {pct.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="progress-track" style={{ height }}>
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`, height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'Not Started': { bg: '#8892A418', color: '#8892A4' },
  'In Progress':  { bg: '#5B8DEF18', color: '#5B8DEF' },
  'Completed':    { bg: '#4CAF8218', color: '#4CAF82' },
  'On Hold':      { bg: '#F5A62318', color: '#F5A623' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Not Started'];
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {status}
    </span>
  );
}

// ============================================================
// CHIP / TAG
// ============================================================
export function Chip({ children, color = '#3A4255', textColor = '#C8CDD8' }: {
  children: ReactNode; color?: string; textColor?: string;
}) {
  return (
    <span className="chip" style={{ background: color + '44', color: textColor }}>
      {children}
    </span>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({
  iconName, title, description, action,
}: { iconName: string; title: string; description: string; action?: ReactNode }) {
  const Icon = ICON_MAP[iconName] || Layers;
  return (
    <div className="empty-state">
      <div style={{
        width: 64, height: 64, borderRadius: 16, background: '#2D3447',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Icon size={28} color="#5A6475" />
      </div>
      <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#E8EAF0', marginBottom: 8 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: '#8892A4', marginBottom: 20, maxWidth: 360 }}>{description}</p>
      {action}
    </div>
  );
}

// ============================================================
// LOADING SPINNER
// ============================================================
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid #3A4255`,
      borderTopColor: '#C8A96E',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ============================================================
// SECTION CARD
// ============================================================
export function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('card', className)} style={{ overflow: 'hidden' }}>
      {children}
    </div>
  );
}

// ============================================================
// COLOR DOT
// ============================================================
export function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%',
      background: color, display: 'inline-block', flexShrink: 0 }} />
  );
}
