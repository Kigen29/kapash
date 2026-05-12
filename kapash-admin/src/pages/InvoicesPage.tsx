import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { ADMIN } from '../api/admin';
import type { InvoiceStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { formatDate, formatKsh } from '../lib/utils';

const LIMIT = 20;

export function InvoicesPage() {
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'invoices', status, page],
    queryFn: () => ADMIN.invoices.list({ status: status || undefined, page, limit: LIMIT }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6 text-brand" /> Invoices</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Corporate invoices, payment tracking.</p>
      </div>
      <select aria-label="Status" className="select w-44" value={status} onChange={e => { setPage(1); setStatus(e.target.value as InvoiceStatus | ''); }}>
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="SENT">Sent</option>
        <option value="PAID">Paid</option>
        <option value="OVERDUE">Overdue</option>
        <option value="VOID">Void</option>
      </select>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Number</th><th>Corporate</th><th>Issued</th><th>Due</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>)
            ) : !data?.invoices.length ? (
              <tr><td colSpan={6} className="text-center text-[hsl(var(--muted-fg))] py-12">No invoices.</td></tr>
            ) : data.invoices.map(inv => (
              <tr key={inv.id}>
                <td><Link to={`/invoices/${inv.id}`} className="font-mono hover:underline">{inv.number}</Link></td>
                <td>{(inv.corporate as any)?.name}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(inv.issuedAt)}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(inv.dueDate)}</td>
                <td><StatusBadge value={inv.status} /></td>
                <td className="text-right font-medium">{formatKsh(inv.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />}
    </div>
  );
}
