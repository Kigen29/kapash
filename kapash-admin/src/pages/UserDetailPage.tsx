import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, Mail, Wallet } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatKsh } from '../lib/utils';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => ADMIN.users.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />;
  if (error || !user) return <p className="text-sm text-red-500">User not found.</p>;

  return (
    <div className="space-y-6">
      <Link to="/users" className="btn-ghost btn-sm w-fit"><ArrowLeft className="w-4 h-4" />Back to users</Link>

      <div className="card p-6 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-muted text-brand flex items-center justify-center font-bold text-xl">
          {(user.name || '?')[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{user.name}</h1>
            <StatusBadge value={user.role} />
            {!user.isActive && <span className="badge bg-red-100 text-red-800">Disabled</span>}
          </div>
          <div className="mt-2 space-y-1 text-sm text-[hsl(var(--muted-fg))]">
            {user.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{user.phone}</div>}
            {user.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</div>}
            <div className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" />Wallet: {formatKsh(user.walletBalance)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="label">Joined</div>
          <div className="text-sm">{formatDate(user.createdAt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="label mb-3">Recent bookings</div>
          {!(user as any).bookings?.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No bookings.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Pitch</th><th>Date</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {(user as any).bookings.map((b: any) => (
                  <tr key={b.id}>
                    <td><Link to={`/bookings/${b.id}`} className="hover:underline">{b.pitchName}</Link></td>
                    <td className="text-[hsl(var(--muted-fg))]">{formatDate(b.date)}</td>
                    <td><StatusBadge value={b.status} /></td>
                    <td className="text-right">{formatKsh(b.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-5">
          <div className="label mb-3">Pitches owned</div>
          {!(user as any).pitches?.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No pitches owned.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Status</th><th className="text-right">Rating</th></tr></thead>
              <tbody>
                {(user as any).pitches.map((p: any) => (
                  <tr key={p.id}>
                    <td><Link to={`/pitches/${p.id}`} className="hover:underline">{p.name}</Link></td>
                    <td><StatusBadge value={p.status} /></td>
                    <td className="text-right">{p.avgRating ? `★ ${p.avgRating.toFixed(1)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
