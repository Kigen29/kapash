import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ShieldCheck, AlertTriangle, CalendarDays, Users as UsersIcon, ArrowRight,
} from 'lucide-react';
import { ADMIN } from '../api/admin';
import { formatKsh, timeAgo } from '../lib/utils';

const periodOptions = [7, 30, 90, 365];

export function DashboardPage() {
  const [period, setPeriod] = useState(30);

  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: ADMIN.stats, refetchInterval: 60_000 });
  const analytics = useQuery({ queryKey: ['admin', 'analytics', period], queryFn: () => ADMIN.analytics({ period }) });
  const recentAudit = useQuery({ queryKey: ['admin', 'audit', 'recent'], queryFn: () => ADMIN.audit.list({ limit: 8 }) });

  const alerts = analytics.data?.alerts;
  const hasAlerts = !!alerts && (alerts.pendingPitches > 0 || alerts.pendingPayouts > 0 || alerts.failedPayments > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Platform health and pending operations.</p>
        </div>
        <select aria-label="Period" className="select w-32" value={period} onChange={e => setPeriod(Number(e.target.value))}>
          {periodOptions.map(d => <option key={d} value={d}>Last {d}d</option>)}
        </select>
      </div>

      {hasAlerts && (
        <div className="card border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">Needs attention:</span>{' '}
            {alerts!.pendingPitches > 0 && (
              <Link to="/pitches/pending" className="underline mr-3">
                {alerts!.pendingPitches} pending pitch{alerts!.pendingPitches > 1 ? 'es' : ''}
              </Link>
            )}
            {alerts!.pendingPayouts > 0 && (
              <Link to="/payouts?status=PENDING" className="underline mr-3">
                {alerts!.pendingPayouts} pending payout{alerts!.pendingPayouts > 1 ? 's' : ''}
              </Link>
            )}
            {alerts!.failedPayments > 0 && (
              <span>{alerts!.failedPayments} failed payment{alerts!.failedPayments > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp}  label="Revenue"              value={formatKsh(analytics.data?.revenue.total)}            sub={`Commission: ${formatKsh(analytics.data?.revenue.commission)}`} />
        <KpiCard icon={CalendarDays} label="Bookings"            value={String(analytics.data?.bookings.total ?? '—')}        sub={`Last ${period}d`} />
        <KpiCard icon={UsersIcon}   label="New users"            value={String(analytics.data?.users.totalNew ?? '—')}        sub={`Last ${period}d`} />
        <KpiCard icon={ShieldCheck} label="Pending verifications" value={String(stats.data?.pendingPitches ?? '—')} sub={stats.data?.pendingPitches ? 'Action required' : 'All clear'} highlight={!!stats.data?.pendingPitches} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Top pitches</h2>
            <Link to="/pitches" className="text-sm text-brand inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {analytics.isLoading ? (
            <Skeleton rows={5} />
          ) : !analytics.data?.topPitches.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No bookings yet in this period.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Pitch</th><th>Owner</th><th className="text-right">Bookings</th><th className="text-right">Revenue</th></tr>
              </thead>
              <tbody>
                {analytics.data.topPitches.slice(0, 5).map(p => (
                  <tr key={p.pitchId}>
                    <td><Link to={`/pitches/${p.pitchId}`} className="hover:underline">{p.name}</Link></td>
                    <td className="text-[hsl(var(--muted-fg))]">{p.ownerName}</td>
                    <td className="text-right">{p.bookingCount}</td>
                    <td className="text-right font-medium">{formatKsh(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent admin activity</h2>
            <Link to="/audit-log" className="text-sm text-brand inline-flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentAudit.isLoading ? (
            <Skeleton rows={4} />
          ) : !recentAudit.data?.logs.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No admin actions yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentAudit.data.logs.map(log => (
                <li key={log.id} className="text-sm">
                  <div className="font-medium">{log.actor?.name || 'Admin'}</div>
                  <div className="text-[hsl(var(--muted-fg))] text-xs">
                    {log.action} · {log.targetType}:{log.targetId.slice(0, 8)} · {timeAgo(log.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, highlight,
}: { icon: React.ComponentType<any>; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : ''}`}>
      <div className="flex items-center gap-2 text-[hsl(var(--muted-fg))] text-xs font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-[hsl(var(--muted-fg))] mt-0.5">{sub}</div>}
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-7 rounded bg-[hsl(var(--muted))] animate-pulse" />
      ))}
    </div>
  );
}
