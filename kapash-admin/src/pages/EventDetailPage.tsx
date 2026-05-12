import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Receipt, XCircle } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { StatusBadge } from '../components/StatusBadge';
import { DangerConfirm } from '../components/DangerConfirm';
import { formatDate, formatKsh } from '../lib/utils';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: () => ADMIN.events.get(id!),
    enabled: !!id,
  });

  const cancel = useMutation({
    mutationFn: () => ADMIN.events.cancel(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'event', id] }),
  });

  const genInvoice = useMutation({
    mutationFn: () => ADMIN.invoices.fromEvent(id!, 7, 0.16),
    onSuccess: (inv: any) => { window.location.href = `/invoices/${inv.id}`; },
  });

  if (isLoading) return <div className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />;
  if (error || !event) return <p className="text-sm text-red-500">Event not found.</p>;

  const canCancel = event.status !== 'CANCELLED' && event.status !== 'COMPLETED';
  const canInvoice = event.status === 'COMPLETED' && !event.invoiceId && event.corporateId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/events" className="btn-ghost btn-sm"><ArrowLeft className="w-4 h-4" />Back</Link>
        <div className="flex gap-2">
          {canInvoice && (
            <button type="button" className="btn-primary" onClick={() => genInvoice.mutate()} disabled={genInvoice.isPending}>
              <Receipt className="w-4 h-4" />Generate invoice
            </button>
          )}
          {canCancel && (
            <DangerConfirm
              trigger={<button type="button" className="btn-danger"><XCircle className="w-4 h-4" />Cancel event</button>}
              title={`Cancel ${event.name}?`}
              body="All child bookings will be cancelled and their slots freed."
              confirmText={event.name}
              confirmLabel="Cancel event"
              onConfirm={async () => { await cancel.mutateAsync(); }}
            />
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{event.name}</h1>
            <div className="text-sm text-[hsl(var(--muted-fg))] mt-1">{formatDate(event.date)}</div>
            {event.organizer && (
              <div className="text-sm mt-2">
                Organizer: <span className="font-medium">{event.organizer.name}</span> · {event.organizer.phone}
              </div>
            )}
            {event.corporate && (
              <div className="text-sm">
                Corporate: <Link to={`/corporates/${(event.corporate as any).id}`} className="hover:underline font-medium">{(event.corporate as any).name}</Link>
              </div>
            )}
            {event.notes && <p className="text-sm text-[hsl(var(--muted-fg))] mt-3 border-l-2 border-brand pl-3">{event.notes}</p>}
          </div>
          <div className="text-right">
            <StatusBadge value={event.status} />
            <div className="text-2xl font-bold text-brand mt-2">{formatKsh(event.totalAmount)}</div>
            {event.invoice && (
              <Link to={`/invoices/${event.invoice.id}`} className="text-sm text-brand hover:underline">View invoice</Link>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="label mb-3">Bookings in this event ({event.bookings?.length || 0})</div>
        <table className="table">
          <thead><tr><th>Pitch</th><th>Time</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {event.bookings?.map((b: any) => (
              <tr key={b.id}>
                <td><Link to={`/pitches/${b.pitchId}`} className="hover:underline">{b.pitch?.name || b.pitchName}</Link></td>
                <td className="text-[hsl(var(--muted-fg))]">{b.startTime} – {b.endTime}</td>
                <td><StatusBadge value={b.status} /></td>
                <td className="text-right font-medium">{formatKsh(b.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
