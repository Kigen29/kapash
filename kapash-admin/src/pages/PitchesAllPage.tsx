import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Search, Pencil, Plus, Trash2 } from 'lucide-react';
import { ADMIN } from '../api/admin';
import type { PitchStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DangerConfirm } from '../components/DangerConfirm';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatKsh, formatDate } from '../lib/utils';

const LIMIT = 20;
const STATUSES: { value: PitchStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_VERIFICATION', label: 'Pending verification' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export function PitchesAllPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PitchStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'pitches', 'all', status, debounced, page],
    queryFn: () => ADMIN.pitches.list({
      status: status || undefined,
      search: debounced || undefined,
      page, limit: LIMIT,
    }),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: PitchStatus; reason?: string }) =>
      ADMIN.pitches.setStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pitches'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
  const deletePitch = useMutation({
    mutationFn: (id: string) => ADMIN.pitches.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pitches'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand" /> Pitches
          </h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">All pitches across the platform.</p>
        </div>
        <Link to="/pitches/new" className="btn-primary"><Plus className="w-4 h-4" />New pitch</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-fg))]" />
          <input
            className="input pl-8"
            placeholder="Search name, address, city…"
            value={search}
            onChange={e => { setPage(1); setSearch(e.target.value); }}
          />
        </div>
        <select aria-label="Status" className="select w-48" value={status} onChange={e => { setPage(1); setStatus(e.target.value as PitchStatus | ''); }}>
          {STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Pitch</th>
              <th>Owner</th>
              <th>Status</th>
              <th className="text-right">Price/hr</th>
              <th className="text-right">Bookings</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>
              ))
            ) : !data?.pitches.length ? (
              <tr><td colSpan={7} className="text-center text-[hsl(var(--muted-fg))] py-12">No pitches match these filters.</td></tr>
            ) : data.pitches.map(p => (
              <tr key={p.id}>
                <td>
                  <Link to={`/pitches/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  <div className="text-xs text-[hsl(var(--muted-fg))]">{p.address}</div>
                </td>
                <td className="text-[hsl(var(--muted-fg))]">{p.owner?.name}</td>
                <td><StatusBadge value={p.status} /></td>
                <td className="text-right font-medium">{formatKsh(p.pricePerHour)}</td>
                <td className="text-right">{p._count?.bookings ?? 0}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(p.createdAt)}</td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    {p.status === 'ACTIVE' && (
                      <ConfirmDialog
                        trigger={<button className="btn-ghost btn-sm">Suspend</button>}
                        title={`Suspend "${p.name}"?`}
                        body="Players will not see this pitch until reactivated."
                        confirmLabel="Suspend"
                        destructive
                        needsReason
                        onConfirm={async (reason) => { await setStatusMutation.mutateAsync({ id: p.id, status: 'SUSPENDED', reason }); }}
                      />
                    )}
                    {p.status === 'SUSPENDED' && (
                      <ConfirmDialog
                        trigger={<button className="btn-ghost btn-sm">Reactivate</button>}
                        title={`Reactivate "${p.name}"?`}
                        body="The pitch will be visible to players again."
                        confirmLabel="Reactivate"
                        onConfirm={async () => { await setStatusMutation.mutateAsync({ id: p.id, status: 'ACTIVE' }); }}
                      />
                    )}
                    <Link to={`/pitches/${p.id}/edit`} className="btn-ghost btn-sm" aria-label="Edit pitch">
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <DangerConfirm
                      trigger={<button type="button" className="btn-ghost btn-sm" aria-label="Delete pitch"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                      title={`Delete "${p.name}"?`}
                      body="Pitches with active or upcoming bookings can't be deleted — suspend them instead. Pitches without bookings become INACTIVE (soft delete)."
                      confirmText={p.name}
                      onConfirm={async () => { await deletePitch.mutateAsync(p.id); }}
                    />
                  </div>
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
