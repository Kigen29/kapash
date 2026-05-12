import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { Pagination } from '../components/Pagination';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatDate } from '../lib/utils';

const LIMIT = 20;

export function CorporatesPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'corporates', status, debounced, page],
    queryFn: () => ADMIN.corporates.list({
      status: status || undefined,
      search: debounced || undefined,
      page, limit: LIMIT,
    }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-brand" /> Corporates</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">B2B accounts that book events for their employees.</p>
        </div>
        <Link to="/corporates/new" className="btn-primary"><Plus className="w-4 h-4" />New corporate</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-fg))]" />
          <input className="input pl-8" placeholder="Search company, email, phone…" value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} />
        </div>
        <select aria-label="Status" className="select w-40" value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Company</th><th>Contact</th><th>Status</th><th className="text-right">Bookers</th><th className="text-right">Events</th><th className="text-right">Invoices</th><th>Joined</th></tr></thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={7}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>)
            ) : !data?.corporates.length ? (
              <tr><td colSpan={7} className="text-center text-[hsl(var(--muted-fg))] py-12">No corporates match.</td></tr>
            ) : data.corporates.map(c => (
              <tr key={c.id}>
                <td>
                  <Link to={`/corporates/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  {c.tradingName && <div className="text-xs text-[hsl(var(--muted-fg))]">{c.tradingName}</div>}
                </td>
                <td className="text-xs text-[hsl(var(--muted-fg))]">{c.email}<br />{c.phone}</td>
                <td>{c.status === 'ACTIVE' ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-red-100 text-red-800">Suspended</span>}</td>
                <td className="text-right">{c._count?.bookers ?? 0}</td>
                <td className="text-right">{c._count?.events ?? 0}</td>
                <td className="text-right">{c._count?.invoices ?? 0}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />}
    </div>
  );
}
