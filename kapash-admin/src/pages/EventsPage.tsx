import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { ADMIN } from '../api/admin';
import type { EventStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { formatDate, formatKsh } from '../lib/utils';

const LIMIT = 20;

export function EventsPage() {
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', status, page],
    queryFn: () => ADMIN.events.list({ status: status || undefined, page, limit: LIMIT }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-brand" /> Events</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Multi-pitch bookings by corporates and admins.</p>
      </div>
      <select aria-label="Status" className="select w-44" value={status} onChange={e => { setPage(1); setStatus(e.target.value as EventStatus | ''); }}>
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Event</th><th>Corporate</th><th>Date</th><th>Status</th><th className="text-right">Pitches</th><th className="text-right">Total</th><th>Invoice</th></tr></thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={7}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>)
            ) : !data?.events.length ? (
              <tr><td colSpan={7} className="text-center text-[hsl(var(--muted-fg))] py-12">No events match.</td></tr>
            ) : data.events.map(e => (
              <tr key={e.id}>
                <td>
                  <Link to={`/events/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
                  {e.organizer && <div className="text-xs text-[hsl(var(--muted-fg))]">by {e.organizer.name}</div>}
                </td>
                <td>{(e.corporate as any)?.name || <span className="text-[hsl(var(--muted-fg))] text-xs">—</span>}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(e.date)}</td>
                <td><StatusBadge value={e.status} /></td>
                <td className="text-right">{e._count?.bookings ?? 0}</td>
                <td className="text-right font-medium">{formatKsh(e.totalAmount)}</td>
                <td>
                  {e.invoice ? (
                    <Link to={`/invoices/${e.invoice.id}`} className="font-mono text-xs hover:underline">{e.invoice.number}</Link>
                  ) : <span className="text-xs text-[hsl(var(--muted-fg))]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />}
    </div>
  );
}
