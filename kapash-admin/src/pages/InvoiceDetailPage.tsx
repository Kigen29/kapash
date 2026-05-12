import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckCircle2, XCircle, FileDown } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { StatusBadge } from '../components/StatusBadge';
import { DangerConfirm } from '../components/DangerConfirm';
import { errorMessage } from '../api/client';
import { formatDate, formatKsh } from '../lib/utils';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['admin', 'invoice', id],
    queryFn: () => ADMIN.invoices.get(id!),
    enabled: !!id,
  });
  const [paymentRef, setPaymentRef] = useState('');
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [err, setErr] = useState('');

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin', 'invoice', id] }); qc.invalidateQueries({ queryKey: ['admin', 'invoices'] }); };

  const send = useMutation({ mutationFn: () => ADMIN.invoices.send(id!), onSuccess: invalidate, onError: e => setErr(errorMessage(e)) });
  const markPaid = useMutation({ mutationFn: () => ADMIN.invoices.markPaid(id!, paymentRef.trim()), onSuccess: () => { invalidate(); setShowMarkPaid(false); }, onError: e => setErr(errorMessage(e)) });
  const voidInv = useMutation({ mutationFn: () => ADMIN.invoices.void(id!), onSuccess: invalidate });

  if (isLoading) return <div className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />;
  if (error || !invoice) return <p className="text-sm text-red-500">Invoice not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/invoices" className="btn-ghost btn-sm"><ArrowLeft className="w-4 h-4" />Back</Link>
        <div className="flex gap-2">
          <a href={ADMIN.invoices.pdfUrl(invoice.id)} target="_blank" rel="noreferrer" className="btn-outline"><FileDown className="w-4 h-4" />View / print</a>
          {invoice.status === 'DRAFT' && (
            <button type="button" className="btn-primary" onClick={() => send.mutate()} disabled={send.isPending}><Send className="w-4 h-4" />Send</button>
          )}
          {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
            <button type="button" className="btn-primary" onClick={() => setShowMarkPaid(true)}><CheckCircle2 className="w-4 h-4" />Mark paid</button>
          )}
          {invoice.status !== 'PAID' && invoice.status !== 'VOID' && (
            <DangerConfirm
              trigger={<button type="button" className="btn-danger"><XCircle className="w-4 h-4" />Void</button>}
              title={`Void invoice ${invoice.number}?`}
              body="Voided invoices stay in the books but are excluded from receivables totals."
              confirmText={invoice.number}
              confirmLabel="Void"
              onConfirm={async () => { await voidInv.mutateAsync(); }}
            />
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-mono text-xl">{invoice.number}</h1>
            <div className="mt-2 text-sm text-[hsl(var(--muted-fg))]">
              Billed to <Link to={`/corporates/${invoice.corporateId}`} className="hover:underline font-medium text-[hsl(var(--fg))]">{(invoice.corporate as any)?.name}</Link>
            </div>
            {invoice.event && <div className="text-sm text-[hsl(var(--muted-fg))]">Event: <Link to={`/events/${invoice.event.id}`} className="hover:underline">{invoice.event.name}</Link></div>}
          </div>
          <div className="text-right">
            <StatusBadge value={invoice.status} />
            <div className="text-2xl font-bold text-brand mt-2">{formatKsh(invoice.total)}</div>
            <div className="text-xs text-[hsl(var(--muted-fg))] mt-1">Due {formatDate(invoice.dueDate)}</div>
            {invoice.paidAt && <div className="text-xs text-emerald-600 mt-1">Paid {formatDate(invoice.paidAt)} · ref {invoice.paymentRef}</div>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="label mb-3">Line items</div>
        <table className="table">
          <thead><tr><th>Description</th><th className="text-right">Qty</th><th className="text-right">Unit price</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {invoice.lineItems.map((li, i) => (
              <tr key={i}>
                <td>{li.description}</td>
                <td className="text-right">{li.qty}</td>
                <td className="text-right">{formatKsh(li.unitPrice)}</td>
                <td className="text-right font-medium">{formatKsh(li.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3} className="text-right text-[hsl(var(--muted-fg))]">Subtotal</td><td className="text-right">{formatKsh(invoice.amount)}</td></tr>
            {invoice.tax > 0 && <tr><td colSpan={3} className="text-right text-[hsl(var(--muted-fg))]">VAT</td><td className="text-right">{formatKsh(invoice.tax)}</td></tr>}
            <tr><td colSpan={3} className="text-right font-bold">Total</td><td className="text-right font-bold text-brand">{formatKsh(invoice.total)}</td></tr>
          </tfoot>
        </table>
        {invoice.notes && <div className="mt-4 p-3 bg-[hsl(var(--muted))] rounded text-sm">{invoice.notes}</div>}
      </div>

      {showMarkPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowMarkPaid(false)}>
          <form className="card w-full max-w-sm p-6 space-y-3" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); markPaid.mutate(); }}>
            <h3 className="font-semibold">Mark {invoice.number} as paid</h3>
            <div><label className="label">Payment reference</label><input className="input mt-1" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} required placeholder="M-Pesa tx, bank ref…" /></div>
            {err && <div className="text-sm text-red-500">{err}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowMarkPaid(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={!paymentRef.trim() || markPaid.isPending}>{markPaid.isPending ? 'Saving…' : 'Mark paid'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
