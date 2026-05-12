import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, XCircle, RefreshCcw } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate, formatKsh } from '../lib/utils';

export function BookingDetailPage() {
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['admin', 'booking', id],
    queryFn: () => ADMIN.bookings.get(id!),
    enabled: !!id,
  });

  const cancel = useMutation({
    mutationFn: ({ reason }: { reason?: string }) => ADMIN.bookings.cancel(id!, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'booking', id] }),
  });
  const refund = useMutation({
    mutationFn: () => ADMIN.bookings.refund(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'booking', id] }),
  });

  if (isLoading) return <div className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />;
  if (error || !booking) return <p className="text-sm text-red-500">Booking not found.</p>;

  const canCancel = booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED';
  const canRefund = booking.payment?.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      <Link to="/bookings" className="btn-ghost btn-sm w-fit"><ArrowLeft className="w-4 h-4" />Back</Link>

      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs text-[hsl(var(--muted-fg))]">Ticket</div>
            <h1 className="font-mono text-lg">{booking.ticketId.slice(0, 12)}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={booking.status} />
            {booking.payment && <StatusBadge value={booking.payment.status} />}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
          <Field label="Date" value={formatDate(booking.date)} />
          <Field label="Time" value={`${booking.startTime} – ${booking.endTime}`} />
          <Field label="Total" value={formatKsh(booking.totalAmount)} />
          <Field label="Commission" value={formatKsh(booking.commissionAmount)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <div className="card p-4 bg-[hsl(var(--muted))]">
            <div className="label mb-2">Customer</div>
            <div className="font-medium">{booking.user?.name}</div>
            <div className="text-sm text-[hsl(var(--muted-fg))]">{booking.user?.phone}</div>
            <div className="text-sm text-[hsl(var(--muted-fg))]">{booking.user?.email}</div>
            {booking.user && <Link to={`/users/${booking.userId}`} className="btn-outline btn-sm mt-3">View</Link>}
          </div>
          <div className="card p-4 bg-[hsl(var(--muted))]">
            <div className="label mb-2">Pitch</div>
            <div className="font-medium">{booking.pitchName}</div>
            <div className="text-sm text-[hsl(var(--muted-fg))]">{booking.pitchAddress}</div>
            <div className="text-sm text-[hsl(var(--muted-fg))]">Owner: {booking.pitch?.owner?.name}</div>
            <Link to={`/pitches/${booking.pitchId}`} className="btn-outline btn-sm mt-3">View pitch</Link>
          </div>
        </div>

        {booking.payment && (
          <div className="card p-4 bg-[hsl(var(--muted))] mt-3">
            <div className="label mb-2">Payment</div>
            <div className="text-sm">M-Pesa receipt: <span className="font-mono">{booking.payment.mpesaReceiptNumber || '—'}</span></div>
            <div className="text-sm">Amount: {formatKsh(booking.payment.amount)}</div>
          </div>
        )}

        {booking.cancelReason && (
          <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-300 mt-3">
            <div className="label mb-1">Cancellation reason</div>
            <p className="text-sm">{booking.cancelReason}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-5">
          {canRefund && (
            <ConfirmDialog
              trigger={<button className="btn-outline"><RefreshCcw className="w-4 h-4" />Refund</button>}
              title="Refund this booking?"
              body="Payment will be marked as refunded. You must trigger the M-Pesa B2C reversal manually."
              confirmLabel="Mark as refunded"
              destructive
              onConfirm={() => refund.mutateAsync()}
            />
          )}
          {canCancel && (
            <ConfirmDialog
              trigger={<button className="btn-danger"><XCircle className="w-4 h-4" />Cancel booking</button>}
              title="Cancel this booking?"
              body="The customer's slot will be freed. Any pending payout will be cancelled."
              confirmLabel="Cancel booking"
              destructive
              needsReason
              reasonPlaceholder="Reason (shown to customer & owner)"
              onConfirm={(reason) => cancel.mutateAsync({ reason })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 bg-[hsl(var(--muted))]">
      <div className="label">{label}</div>
      <div className="font-medium text-sm mt-0.5">{value}</div>
    </div>
  );
}
