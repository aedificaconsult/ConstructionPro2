import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: number | null | undefined, decimals = 3): string {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function calcProgress(executed: number, contract: number): number {
  if (!contract || contract <= 0) return 0;
  return Math.min(100, (executed / contract) * 100);
}

export function progressColor(percent: number): string {
  if (percent >= 100) return '#4CAF82';
  if (percent >= 75) return '#C8A96E';
  if (percent >= 40) return '#5B8DEF';
  return '#8892A4';
}

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Not Started': { bg: '#8892A418', text: '#8892A4' },
  'In Progress':  { bg: '#5B8DEF18', text: '#5B8DEF' },
  'Completed':    { bg: '#4CAF8218', text: '#4CAF82' },
  'On Hold':      { bg: '#F5A62318', text: '#F5A623' },
};

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
