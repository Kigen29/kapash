import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldAlert, Plus, ShieldOff } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';
import { DangerConfirm } from '../components/DangerConfirm';
import { useAuth } from '../auth/AuthContext';
import type { AdminTier } from '../api/types';
import { formatDate } from '../lib/utils';

export function AdminsPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'admins'], queryFn: ADMIN.admins.list });
  const [showForm, setShowForm] = useState(false);

  const demote = useMutation({
    mutationFn: (id: string) => ADMIN.admins.demote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'admins'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-brand" /> Admins</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">SUPER tier only. Manage admin accounts and their permission tiers.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New admin
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Contact</th><th>Tier</th><th>Status</th><th>Created</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={6}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>)
            ) : !data?.length ? (
              <tr><td colSpan={6} className="text-center text-[hsl(var(--muted-fg))] py-8">No admins.</td></tr>
            ) : data.map(a => (
              <tr key={a.id}>
                <td>
                  <Link to={`/users/${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                  {a.id === me?.id && <span className="badge bg-brand-muted text-brand ml-2">You</span>}
                </td>
                <td className="text-xs text-[hsl(var(--muted-fg))]">{a.phone}<br />{a.email}</td>
                <td><span className="badge bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">{a.adminTier || '—'}</span></td>
                <td>{a.isActive ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-red-100 text-red-800">Disabled</span>}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(a.createdAt)}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Link to={`/users/${a.id}/edit`} className="btn-ghost btn-sm">Edit / change tier</Link>
                    {a.id !== me?.id && (
                      <DangerConfirm
                        trigger={<button type="button" className="btn-ghost btn-sm" aria-label="Demote"><ShieldOff className="w-3.5 h-3.5 text-red-500" /></button>}
                        title={`Demote ${a.name}?`}
                        body="Their role drops to PLAYER and adminTier clears. They lose admin access immediately."
                        confirmText={a.name}
                        confirmLabel="Demote"
                        onConfirm={async () => { await demote.mutateAsync(a.id); }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && <NewAdminModal onClose={() => setShowForm(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'admins'] }); setShowForm(false); }} />}
    </div>
  );
}

function NewAdminModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+254');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<AdminTier>('SUPPORT');
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () => ADMIN.admins.create({ name: name.trim(), phone, email: email.trim() || undefined, adminTier: tier }),
    onSuccess: onSaved,
    onError: (e) => setErr(errorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form className="card w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()} onSubmit={e => {
        e.preventDefault();
        if (!/^\+254\d{9}$/.test(phone)) return setErr('Phone must be +254XXXXXXXXX.');
        create.mutate();
      }}>
        <h3 className="font-semibold text-lg">New admin</h3>
        <div><label className="label">Name</label><input className="input mt-1" value={name} onChange={e => setName(e.target.value)} required minLength={2} /></div>
        <div><label className="label">Phone</label><input className="input mt-1" value={phone} onChange={e => setPhone(e.target.value.trim())} pattern="\+254\d{9}" required /></div>
        <div><label className="label">Email (optional)</label><input className="input mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div>
          <label className="label">Tier</label>
          <select aria-label="Tier" className="select mt-1" value={tier} onChange={e => setTier(e.target.value as AdminTier)}>
            <option value="SUPER">SUPER — everything</option>
            <option value="OPERATIONS">OPERATIONS</option>
            <option value="FINANCE">FINANCE</option>
            <option value="SUPPORT">SUPPORT (read + moderation)</option>
          </select>
        </div>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create admin'}</button>
        </div>
      </form>
    </div>
  );
}
