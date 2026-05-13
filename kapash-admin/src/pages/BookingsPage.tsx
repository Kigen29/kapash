import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarCheck, Plus } from 'lucide-react';
import { ADMIN } from '../api/admin';
import type { BookingStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { formatDate, formatKsh } from '../lib/utils';

const LIMIT = 20;

export function BookingsPage() {
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bookings', status, from, to, page],
    queryFn: () => ADMIN.bookings.list({
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
      page, limit: LIMIT,
    }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="w-6 h-6 text-brand" />Bookings</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">All bookings across the platform.</p>
        </div>
        <Link to="/bookings/new" className="btn-primary"><Plus className="w-4 h-4" />New booking</Link>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="label">Status</label>
          <select aria-label="Status" className="select w-44 mt-1" value={status} onChange={e => { setPage(1); setStatus(e.target.value as BookingStatus | ''); }}>
            <option value="">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING_PAYMENT">Pending payment</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input aria-label="From date" type="date" className="input mt-1 w-40" value={from} onChange={e => { setPage(1); setFrom(e.target.value); }} />
        </div>
        <div>
          <label className="label">To</label>
          <input aria-label="To date" type="date" className="input mt-1 w-40" value={to} onChange={e => { setPage(1); setTo(e.target.value); }} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Ticket</th><th>Customer</th><th>Pitch</th><th>Date · Time</th><th>Status</th><th>Payment</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>
              ))
            ) : !data?.bookings.length ? (
              <tr><td colSpan={7} className="text-center text-[hsl(var(--muted-fg))] py-12">No bookings match these filters.</td></tr>
            ) : data.bookings.map(b => (
              <tr key={b.id}>
                <td><Link to={`/bookings/${b.id}`} className="font-mono text-xs hover:underline">{b.ticketId.slice(0, 8)}</Link></td>
                <td>{b.user?.name}<div className="text-xs text-[hsl(var(--muted-fg))]">{b.user?.phone}</div></td>
                <td>{b.pitchName}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(b.date)} · {b.startTime}</td>
                <td><StatusBadge value={b.status} /></td>
                <td>{b.payment ? <StatusBadge value={b.payment.status} /> : <span className="text-xs text-[hsl(var(--muted-fg))]">—</span>}</td>
                <td className="text-right font-medium">{formatKsh(b.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />}
    </div>
  );
}
