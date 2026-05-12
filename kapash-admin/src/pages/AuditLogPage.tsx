import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { Pagination } from '../components/Pagination';
import { timeAgo } from '../lib/utils';

const LIMIT = 50;

export function AuditLogPage() {
  const [targetType, setTargetType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', targetType, action, page],
    queryFn: () => ADMIN.audit.list({
      targetType: targetType || undefined,
      action: action || undefined,
      page, limit: LIMIT,
    }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="w-6 h-6 text-brand" />Audit log</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Every administrative action is recorded here.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select aria-label="Target" className="select w-44" value={targetType} onChange={e => { setPage(1); setTargetType(e.target.value); }}>
          <option value="">All targets</option>
          <option value="pitch">Pitch</option>
          <option value="user">User</option>
          <option value="booking">Booking</option>
          <option value="payout">Payout</option>
          <option value="review">Review</option>
          <option value="broadcast">Broadcast</option>
          <option value="setting">Setting</option>
        </select>
        <input
          className="input w-56"
          placeholder="Action contains… (e.g. verify)"
          value={action}
          onChange={e => { setPage(1); setAction(e.target.value); }}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>Who</th><th>Action</th><th>Target</th><th>Details</th><th>When</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>
              ))
            ) : !data?.logs.length ? (
              <tr><td colSpan={5} className="text-center text-[hsl(var(--muted-fg))] py-12">No log entries.</td></tr>
            ) : data.logs.map(log => (
              <tr key={log.id}>
                <td>{log.actor?.name || log.actorId}</td>
                <td><span className="badge bg-[hsl(var(--muted))] text-[hsl(var(--fg))] font-mono">{log.action}</span></td>
                <td><span className="text-[hsl(var(--muted-fg))]">{log.targetType}:</span> <span className="font-mono text-xs">{log.targetId.slice(0, 12)}</span></td>
                <td className="max-w-md">
                  {log.meta ? (
                    <details>
                      <summary className="cursor-pointer text-xs text-[hsl(var(--muted-fg))]">view</summary>
                      <pre className="text-xs mt-1 bg-[hsl(var(--muted))] p-2 rounded overflow-x-auto">{JSON.stringify(log.meta, null, 2)}</pre>
                    </details>
                  ) : (
                    <span className="text-[hsl(var(--muted-fg))]">—</span>
                  )}
                </td>
                <td className="text-[hsl(var(--muted-fg))]">{timeAgo(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />}
    </div>
  );
}
