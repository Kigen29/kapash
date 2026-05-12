import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Phone, Mail, MapPin, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DangerConfirm } from '../components/DangerConfirm';
import { formatDate, formatKsh } from '../lib/utils';

export function CorporateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: corp, isLoading, error } = useQuery({
    queryKey: ['admin', 'corporate', id],
    queryFn: () => ADMIN.corporates.get(id!),
    enabled: !!id,
  });
  const [showAddBooker, setShowAddBooker] = useState(false);

  const removeBooker = useMutation({
    mutationFn: (userId: string) => ADMIN.corporates.removeBooker(id!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'corporate', id] }),
  });

  const suspend = useMutation({
    mutationFn: () => ADMIN.corporates.delete(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'corporate', id] }),
  });

  if (isLoading) return <div className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />;
  if (error || !corp) return <p className="text-sm text-red-500">Corporate not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/corporates" className="btn-ghost btn-sm w-fit"><ArrowLeft className="w-4 h-4" />Back</Link>
        <div className="flex gap-2">
          <Link to={`/corporates/${id}/edit`} className="btn-outline"><Pencil className="w-4 h-4" />Edit</Link>
          {corp.status === 'ACTIVE' && (
            <DangerConfirm
              trigger={<button type="button" className="btn-danger"><Trash2 className="w-4 h-4" />Suspend</button>}
              title={`Suspend ${corp.name}?`}
              body="Bookers cannot create new events. Existing events and invoices stay."
              confirmText={corp.name}
              confirmLabel="Suspend"
              onConfirm={async () => { await suspend.mutateAsync(); }}
            />
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-brand-muted text-brand flex items-center justify-center font-bold text-xl">
            {corp.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{corp.name}</h1>
              <StatusBadge value={corp.status} />
            </div>
            {corp.tradingName && <div className="text-sm text-[hsl(var(--muted-fg))]">trading as {corp.tradingName}</div>}
            <div className="mt-3 space-y-1 text-sm text-[hsl(var(--muted-fg))]">
              <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{corp.email}</div>
              <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{corp.phone}</div>
              <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="whitespace-pre-line">{corp.billingAddress}</span></div>
              {corp.kraPin && <div className="text-xs">KRA PIN: <span className="font-mono">{corp.kraPin}</span></div>}
            </div>
          </div>
          <div className="text-right">
            <div className="label">Joined</div>
            <div className="text-sm">{formatDate(corp.createdAt)}</div>
            <div className="label mt-3">Credit limit</div>
            <div className="text-sm">{formatKsh(corp.creditLimit)}</div>
            <div className="label mt-3">Lifetime invoiced</div>
            <div className="text-sm font-semibold text-brand">{formatKsh(corp.lifetimeInvoiced || 0)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="label">Bookers ({corp.bookers?.length || 0})</div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setShowAddBooker(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {!corp.bookers?.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No bookers.</p>
          ) : (
            <ul className="space-y-2">
              {corp.bookers.map(b => (
                <li key={b.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-[hsl(var(--muted))]">
                  <div className="w-8 h-8 rounded-full bg-brand-muted text-brand text-xs font-bold flex items-center justify-center">
                    {b.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.name}{b.isCorpAdmin && <span className="badge bg-purple-100 text-purple-800 ml-2 text-[10px]">Admin</span>}</div>
                    <div className="text-xs text-[hsl(var(--muted-fg))] truncate">{b.phone}</div>
                  </div>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => { if (confirm(`Remove ${b.name} from ${corp.name}?`)) removeBooker.mutate(b.id); }} aria-label="Remove">
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="label mb-3">Recent events</div>
          {!corp.events?.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No events yet.</p>
          ) : (
            <ul className="space-y-2">
              {corp.events.slice(0, 10).map(e => (
                <li key={e.id} className="p-2 border-b border-[hsl(var(--border))]/40 last:border-0">
                  <Link to={`/events/${e.id}`} className="font-medium hover:underline">{e.name}</Link>
                  <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-fg))]">
                    <span>{formatDate(e.date)} · <StatusBadge value={e.status} /></span>
                    <span className="font-medium text-brand">{formatKsh(e.totalAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="label mb-3">Invoices</div>
        {!corp.invoices?.length ? (
          <p className="text-sm text-[hsl(var(--muted-fg))]">No invoices.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Number</th><th>Issued</th><th>Due</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {corp.invoices.map(inv => (
                <tr key={inv.id}>
                  <td><Link to={`/invoices/${inv.id}`} className="font-mono text-sm hover:underline">{inv.number}</Link></td>
                  <td className="text-[hsl(var(--muted-fg))]">{formatDate(inv.issuedAt)}</td>
                  <td className="text-[hsl(var(--muted-fg))]">{formatDate(inv.dueDate)}</td>
                  <td><StatusBadge value={inv.status} /></td>
                  <td className="text-right font-medium">{formatKsh(inv.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddBooker && (
        <AddBookerModal corporateId={id!} onClose={() => setShowAddBooker(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'corporate', id] }); setShowAddBooker(false); }} />
      )}
    </div>
  );
}

function AddBookerModal({ corporateId, onClose, onSaved }: { corporateId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+254');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [err, setErr] = useState('');

  const add = useMutation({
    mutationFn: () => ADMIN.corporates.addBooker(corporateId, { name: name.trim(), phone, email: email.trim() || undefined, isCorpAdmin: isAdmin }),
    onSuccess: onSaved,
    onError: (e) => setErr(errorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form className="card w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()} onSubmit={e => {
        e.preventDefault();
        if (!/^\+254\d{9}$/.test(phone)) return setErr('Phone must be +254XXXXXXXXX.');
        add.mutate();
      }}>
        <h3 className="font-semibold text-lg">Add booker</h3>
        <p className="text-sm text-[hsl(var(--muted-fg))]">If the phone is already on KAPASH, that user joins this corporate. Otherwise we create a new account.</p>
        <div><label className="label">Name</label><input className="input mt-1" value={name} onChange={e => setName(e.target.value)} required minLength={2} /></div>
        <div><label className="label">Phone</label><input className="input mt-1" value={phone} onChange={e => setPhone(e.target.value.trim())} pattern="\+254\d{9}" required /></div>
        <div><label className="label">Email (optional)</label><input className="input mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} /> Make this person a corporate admin</label>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add booker'}</button>
        </div>
      </form>
    </div>
  );
}
