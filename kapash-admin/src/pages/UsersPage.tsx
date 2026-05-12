import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users as UsersIcon, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { ADMIN } from '../api/admin';
import type { UserRole } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DangerConfirm } from '../components/DangerConfirm';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatDate } from '../lib/utils';

const LIMIT = 20;

export function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState<UserRole | ''>('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', role, active, debounced, page],
    queryFn: () => ADMIN.users.list({
      role: role || undefined,
      isActive: active === '' ? undefined : active === 'true',
      search: debounced || undefined,
      page, limit: LIMIT,
    }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  const deactivate = useMutation({ mutationFn: (id: string) => ADMIN.users.deactivate(id), onSuccess: invalidate });
  const activate   = useMutation({ mutationFn: (id: string) => ADMIN.users.activate(id),   onSuccess: invalidate });
  const del        = useMutation({ mutationFn: (id: string) => ADMIN.users.delete(id),     onSuccess: invalidate });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UsersIcon className="w-6 h-6 text-brand" /> Users</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">All accounts on the platform.</p>
        </div>
        <Link to="/users/new" className="btn-primary"><Plus className="w-4 h-4" />New user</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-fg))]" />
          <input className="input pl-8" placeholder="Search name, phone, email…" value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} />
        </div>
        <select aria-label="Role" className="select w-40" value={role} onChange={e => { setPage(1); setRole(e.target.value as UserRole | ''); }}>
          <option value="">All roles</option>
          <option value="PLAYER">Players</option>
          <option value="OWNER">Owners</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select aria-label="Active" className="select w-40" value={active} onChange={e => { setPage(1); setActive(e.target.value as any); }}>
          <option value="">Active & inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Contact</th><th>Role</th><th>Status</th>
              <th className="text-right">Bookings</th><th className="text-right">Pitches</th>
              <th>Joined</th><th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={8}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>
              ))
            ) : !data?.users.length ? (
              <tr><td colSpan={8} className="text-center text-[hsl(var(--muted-fg))] py-12">No users match these filters.</td></tr>
            ) : data.users.map(u => (
              <tr key={u.id}>
                <td>
                  <Link to={`/users/${u.id}`} className="font-medium hover:underline">{u.name}</Link>
                </td>
                <td className="text-xs text-[hsl(var(--muted-fg))]">
                  {u.phone}<br />{u.email}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <StatusBadge value={u.role} />
                    {u.adminTier && <span className="badge bg-[hsl(var(--muted))] text-[hsl(var(--fg))] text-[10px]">{u.adminTier}</span>}
                  </div>
                </td>
                <td>
                  {u.isActive
                    ? <span className="badge bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">Active</span>
                    : <span className="badge bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">Disabled</span>}
                </td>
                <td className="text-right">{u._count?.bookings ?? 0}</td>
                <td className="text-right">{u._count?.pitches ?? 0}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(u.createdAt)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/users/${u.id}/edit`} className="btn-ghost btn-sm" aria-label="Edit user"><Pencil className="w-3.5 h-3.5" /></Link>
                    {u.isActive ? (
                      <ConfirmDialog
                        trigger={<button type="button" className="btn-ghost btn-sm">Deactivate</button>}
                        title={`Deactivate ${u.name}?`}
                        body="The user will be logged out and unable to sign in until reactivated."
                        confirmLabel="Deactivate"
                        destructive
                        onConfirm={async () => { await deactivate.mutateAsync(u.id); }}
                      />
                    ) : (
                      <button type="button" className="btn-ghost btn-sm" onClick={() => activate.mutate(u.id)}>Reactivate</button>
                    )}
                    <DangerConfirm
                      trigger={<button type="button" className="btn-ghost btn-sm" aria-label="Delete user"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                      title={`Permanently delete ${u.name}?`}
                      body="This is only allowed if the user has no bookings, pitches, or reviews. Otherwise deactivate instead."
                      confirmText={u.name}
                      confirmLabel="Delete"
                      onConfirm={async () => { await del.mutateAsync(u.id); }}
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
