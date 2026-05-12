import { cn } from '../lib/utils';

const COLORS: Record<string, string> = {
  // Pitches
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  ACTIVE:               'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  SUSPENDED:            'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  INACTIVE:             'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  // Bookings
  PENDING_PAYMENT:      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  CONFIRMED:            'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  CANCELLED:            'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  COMPLETED:            'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  NO_SHOW:              'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  // Payouts / Payments
  PENDING:              'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  PROCESSING:           'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  FAILED:               'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  REFUNDED:             'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  // Users
  PLAYER:               'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  OWNER:                'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  ADMIN:                'bg-brand text-white',
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-[hsl(var(--muted-fg))] text-xs">—</span>;
  const cls = COLORS[value] || 'bg-slate-200 text-slate-700';
  const label = value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return <span className={cn('badge', cls)}>{label}</span>;
}
