import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { ADMIN } from '../api/admin';
import type { PayoutStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { formatDate, formatKsh } from '../lib/utils';

const LIMIT = 20;

export function PayoutsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PayoutStatus | ''>('');
  const [page, setPage] = useState(1);
  const [mpesaId, setMpesaId] = useState<{ id: string; value: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payouts', status, page],
    queryFn: () => ADMIN.payouts.list({ status: status || undefined, page, limit: LIMIT }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };

  const process  = useMutation({ mutationFn: (id: string) => ADMIN.payouts.process(id), onSuccess: invalidate });
  const complete = useMutation({ mutationFn: ({ id, tx }: { id: string; tx: string }) => ADMIN.payouts.complete(id, tx), onSuccess: invalidate });
  const fail     = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => ADMIN.payouts.fail(id, reason), onSuccess: invalidate });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Banknote className="w-6 h-6 text-brand" />Payouts</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Manage owner payouts. M-Pesa B2C transfers are triggered manually until integration lands.</p>
      </div>

      <select aria-label="Status" className="select w-44" value={status} onChange={e => { setPage(1); setStatus(e.target.value as PayoutStatus | ''); }}>
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="PROCESSING">Processing</option>
        <option value="COMPLETED">Completed</option>
        <option value="FAILED">Failed</option>
      </select>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Owner</th><th>Pitch · Booking</th><th>Status</th><th className="text-right">Amount</th><th>Scheduled</th><th>M-Pesa Tx</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>
              ))
            ) : !data?.payouts.length ? (
              <tr><td colSpan={7} className="text-center text-[hsl(var(--muted-fg))] py-12">No payouts.</td></tr>
            ) : data.payouts.map(p => (
              <tr key={p.id}>
                <td>{p.owner?.name}<div className="text-xs text-[hsl(var(--muted-fg))]">{p.owner?.phone}</div></td>
                <td>{p.booking?.pitchName}<div className="text-xs text-[hsl(var(--muted-fg))]">{formatDate(p.booking?.date)} · {p.booking?.startTime}</div></td>
                <td><StatusBadge value={p.status} /></td>
                <td className="text-right font-medium">{formatKsh(p.amount)}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(p.scheduledFor)}</td>
                <td className="font-mono text-xs">{p.mpesaTransactionId || '—'}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    {p.status === 'PENDING' && (
                      <button className="btn-outline btn-sm" onClick={() => process.mutate(p.id)}>Process</button>
                    )}
                    {(p.status === 'PENDING' || p.status === 'PROCESSING') && (
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => setMpesaId({ id: p.id, value: '' })}
                      >Mark paid</button>
                    )}
                    {p.status !== 'COMPLETED' && p.status !== 'FAILED' && (
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => {
                          const reason = prompt('Why did this payout fail?');
                          if (reason) fail.mutate({ id: p.id, reason });
                        }}
                      >Fail</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />}

      {mpesaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setMpesaId(null)}>
          <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold">Mark payout as paid</h3>
            <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Enter the M-Pesa B2C transaction ID after sending the transfer.</p>
            <input
              autoFocus
              className="input mt-4"
              placeholder="QGH7K9XY12"
              value={mpesaId.value}
              onChange={e => setMpesaId({ ...mpesaId, value: e.target.value })}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-ghost" onClick={() => setMpesaId(null)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={!mpesaId.value.trim() || complete.isPending}
                onClick={async () => { await complete.mutateAsync({ id: mpesaId.id, tx: mpesaId.value.trim() }); setMpesaId(null); }}
              >Mark paid</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
