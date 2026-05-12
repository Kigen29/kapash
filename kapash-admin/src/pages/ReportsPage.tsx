import { useState } from 'react';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { ADMIN } from '../api/admin';

const TODAY = new Date().toISOString().split('T')[0];
const THIRTY = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();

export function ReportsPage() {
  const [from, setFrom] = useState(THIRTY);
  const [to, setTo] = useState(TODAY);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [usersRole, setUsersRole] = useState('');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="w-6 h-6 text-brand" /> Reports</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Download CSV exports for offline analysis.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Date range (used by all dated reports below)</h2>
        <div className="flex gap-3 flex-wrap">
          <div><label className="label">From</label><input aria-label="From" type="date" className="input mt-1 w-44" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input aria-label="To" type="date" className="input mt-1 w-44" value={to} onChange={e => setTo(e.target.value)} /></div>
        </div>
      </div>

      <ReportRow
        title="Bookings"
        description="All bookings created in the range, with customer, pitch, owner, and amount columns."
        action={<button type="button" className="btn-primary" onClick={() => ADMIN.reports.bookingsCsv(from, to)}><FileDown className="w-4 h-4" />Download CSV</button>}
      />

      <ReportRow
        title="Revenue"
        description="Revenue grouped by day or month — totals, commission, owner share."
        action={
          <div className="flex gap-2">
            <select aria-label="Group by" className="select w-28" value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
              <option value="day">Day</option>
              <option value="month">Month</option>
            </select>
            <button type="button" className="btn-primary" onClick={() => ADMIN.reports.revenueCsv(from, to, groupBy)}><FileDown className="w-4 h-4" />Download CSV</button>
          </div>
        }
      />

      <ReportRow
        title="Payouts"
        description="All payouts created in the range. Owner, pitch, amount, status, M-Pesa transaction ID."
        action={<button type="button" className="btn-primary" onClick={() => ADMIN.reports.payoutsCsv(from, to)}><FileDown className="w-4 h-4" />Download CSV</button>}
      />

      <ReportRow
        title="Users"
        description="All accounts, optionally filtered by role."
        action={
          <div className="flex gap-2">
            <select aria-label="Role" className="select w-32" value={usersRole} onChange={e => setUsersRole(e.target.value)}>
              <option value="">All roles</option>
              <option value="PLAYER">Players</option>
              <option value="OWNER">Owners</option>
              <option value="ADMIN">Admins</option>
            </select>
            <button type="button" className="btn-primary" onClick={() => ADMIN.reports.usersCsv(usersRole || undefined)}><FileDown className="w-4 h-4" />Download CSV</button>
          </div>
        }
      />

      <ReportRow
        title="Audit log"
        description="Every administrative action in the range (compliance / governance)."
        action={<button type="button" className="btn-primary" onClick={() => ADMIN.reports.auditCsv(from, to)}><FileDown className="w-4 h-4" />Download CSV</button>}
      />
    </div>
  );
}

function ReportRow({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="card p-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-0.5 max-w-md">{description}</p>
      </div>
      {action}
    </div>
  );
}
