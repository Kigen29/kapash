import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart as RPieChart, Pie, Cell, Legend,
} from 'recharts';
import { PieChart, TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { formatKsh } from '../lib/utils';

const PERIODS = [7, 30, 90, 365];
const COLORS = ['#22C55E', '#3B82F6', '#A855F7', '#F59E0B', '#EF4444', '#06B6D4'];

export function AnalyticsPage() {
  const [period, setPeriod] = useState(30);
  const [compareTo, setCompareTo] = useState<'previousPeriod' | ''>('previousPeriod');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics-rich', period, compareTo, groupBy],
    queryFn: () => ADMIN.analytics({ period, compareTo: compareTo || undefined, groupBy }),
  });

  const today = new Date().toISOString().split('T')[0];
  const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - period);
  const fromStr = fromDate.toISOString().split('T')[0];

  // Build chart series from byDay maps
  const revenueSeries = data ? Object.entries(data.revenue.byDay).sort().map(([date, revenue]) => ({
    date,
    revenue,
    commission: data.revenue.commissionByDay[date] || 0,
  })) : [];
  const bookingSeries = data ? Object.entries(data.bookings.byDay).sort().map(([date, bookings]) => ({ date, bookings })) : [];
  const userSeries = data ? Object.entries(data.users.byDay).sort().map(([date, users]) => ({ date, users })) : [];
  const statusData = data ? Object.entries(data.bookings.byStatus).map(([name, value]) => ({ name, value })) : [];
  const occupancyData = data ? Object.entries(data.occupancyByType).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PieChart className="w-6 h-6 text-brand" /> Analytics</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Trends, comparisons, occupancy.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="label">Period</label>
            <select aria-label="Period" className="select w-32 mt-1" value={period} onChange={e => setPeriod(Number(e.target.value))}>
              {PERIODS.map(d => <option key={d} value={d}>Last {d}d</option>)}
            </select>
          </div>
          <div>
            <label className="label">Group by</label>
            <select aria-label="Group by" className="select w-28 mt-1" value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand" checked={compareTo === 'previousPeriod'} onChange={e => setCompareTo(e.target.checked ? 'previousPeriod' : '')} />
            Compare to prev period
          </label>
        </div>
      </div>

      {/* KPI tiles with deltas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Revenue" value={formatKsh(data?.revenue.total ?? 0)} delta={data?.revenue.delta.revenue} />
        <KpiCard label="Commission" value={formatKsh(data?.revenue.commission ?? 0)} delta={data?.revenue.delta.commission} />
        <KpiCard label="Bookings" value={String(data?.bookings.total ?? 0)} delta={data?.bookings.delta.total} />
        <KpiCard label="New users" value={String(data?.users.totalNew ?? 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Revenue & commission"
          action={<button type="button" className="btn-ghost btn-sm" onClick={() => ADMIN.reports.revenueCsv(fromStr, today, groupBy === 'month' ? 'month' : 'day')}><FileDown className="w-3.5 h-3.5" />CSV</button>}
        >
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatKsh(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#22C55E" fill="#22C55E" fillOpacity={0.2} />
                <Area type="monotone" dataKey="commission" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Bookings over time"
          action={<button type="button" className="btn-ghost btn-sm" onClick={() => ADMIN.reports.bookingsCsv(fromStr, today)}><FileDown className="w-3.5 h-3.5" />CSV</button>}
        >
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bookingSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#22C55E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="New users">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={userSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#A855F7" fill="#A855F7" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Bookings by status">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <RPieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </RPieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="label mb-3">Top pitches</div>
          {!data?.topPitches.length ? <p className="text-sm text-[hsl(var(--muted-fg))]">No data.</p> : (
            <table className="table">
              <thead><tr><th>Pitch</th><th>Owner</th><th className="text-right">Bookings</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>{data.topPitches.map(p => (
                <tr key={p.pitchId}>
                  <td>{p.name}</td>
                  <td className="text-[hsl(var(--muted-fg))]">{p.ownerName}</td>
                  <td className="text-right">{p.bookingCount}</td>
                  <td className="text-right font-medium">{formatKsh(p.revenue)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="card p-5">
          <div className="label mb-3">Top owners (by their payout share)</div>
          {!data?.topOwners.length ? <p className="text-sm text-[hsl(var(--muted-fg))]">No data.</p> : (
            <table className="table">
              <thead><tr><th>Owner</th><th className="text-right">Bookings</th><th className="text-right">Earned</th></tr></thead>
              <tbody>{data.topOwners.map(o => (
                <tr key={o.ownerId}>
                  <td>{o.name}</td>
                  <td className="text-right">{o.bookingCount}</td>
                  <td className="text-right font-medium">{formatKsh(o.revenue)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>

      <ChartCard title="Occupancy by pitch type">
        {isLoading ? <ChartSkeleton /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={occupancyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#888" strokeOpacity={0.2} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#22C55E" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {delta != null && (
        <div className={`mt-1 text-xs flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-[hsl(var(--muted-fg))]'}`}>
          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(delta).toFixed(1)}% vs prev
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[260px] bg-[hsl(var(--muted))] rounded animate-pulse" />;
}
