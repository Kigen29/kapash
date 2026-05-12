import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { AdminTier, UserRole } from '../api/types';

export function UserFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user: me } = useAuth();

  const existing = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => ADMIN.users.get(id!),
    enabled: isEdit,
  });

  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('+254');
  const [email, setEmail] = useState('');
  const [role, setRole]   = useState<UserRole>('PLAYER');
  const [tier, setTier]   = useState<AdminTier>('SUPPORT');
  const [err, setErr]     = useState('');

  useEffect(() => {
    if (existing.data) {
      setName(existing.data.name);
      setPhone(existing.data.phone || '+254');
      setEmail(existing.data.email || '');
      setRole(existing.data.role);
      setTier(existing.data.adminTier || 'SUPPORT');
    }
  }, [existing.data]);

  const create = useMutation({
    mutationFn: () => ADMIN.users.create({
      name: name.trim(), phone, email: email.trim() || undefined,
      role, adminTier: role === 'ADMIN' ? tier : undefined,
    }),
    onSuccess: (u: any) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      nav(`/users/${u.id || ''}`, { replace: true });
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const update = useMutation({
    mutationFn: () => ADMIN.users.update(id!, {
      name: name.trim(), phone, email: email.trim() || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
      nav(`/users/${id}`, { replace: true });
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const setTierMut = useMutation({
    mutationFn: () => ADMIN.users.setTier(id!, tier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!name.trim() || name.trim().length < 2) return setErr('Name is required.');
    if (!/^\+254\d{9}$/.test(phone)) return setErr('Phone must be +254XXXXXXXXX.');
    if (isEdit) update.mutate(); else create.mutate();
  };

  const busy = create.isPending || update.isPending;
  const canChangeTier = isEdit && existing.data?.role === 'ADMIN' && me?.adminTier === 'SUPER' && id !== me?.id;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/users" className="btn-ghost btn-sm w-fit"><ArrowLeft className="w-4 h-4" />Back to users</Link>

      <div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit user' : 'New user'}</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">
          {isEdit ? 'Update profile fields. Role cannot be changed — delete and recreate if needed.' : 'Create a player, owner, or admin account.'}
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input mt-1" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={100} />
        </div>
        <div>
          <label className="label">Phone (+254…)</label>
          <input className="input mt-1" value={phone} onChange={e => setPhone(e.target.value.trim())} placeholder="+254712345678" pattern="\+254\d{9}" required />
        </div>
        <div>
          <label className="label">Email (optional)</label>
          <input className="input mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        {!isEdit && (
          <>
            <div>
              <label className="label">Role (immutable after creation)</label>
              <select aria-label="Role" className="select mt-1" value={role} onChange={e => setRole(e.target.value as UserRole)}>
                <option value="PLAYER">Player</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin (requires SUPER tier)</option>
              </select>
            </div>
            {role === 'ADMIN' && (
              <div>
                <label className="label">Admin tier</label>
                <select aria-label="Admin tier" className="select mt-1" value={tier} onChange={e => setTier(e.target.value as AdminTier)}>
                  <option value="SUPER">SUPER — everything</option>
                  <option value="OPERATIONS">OPERATIONS — verification, users, pitches, bookings</option>
                  <option value="FINANCE">FINANCE — payouts, invoices, reports</option>
                  <option value="SUPPORT">SUPPORT — read-only, moderation</option>
                </select>
              </div>
            )}
          </>
        )}

        {isEdit && existing.data && (
          <div className="text-sm text-[hsl(var(--muted-fg))] border-t border-[hsl(var(--border))] pt-4">
            <div>Role: <span className="font-medium text-[hsl(var(--fg))]">{existing.data.role}</span> <span className="text-xs">(immutable)</span></div>
            {existing.data.adminTier && <div className="mt-1">Admin tier: <span className="font-medium text-[hsl(var(--fg))]">{existing.data.adminTier}</span></div>}
          </div>
        )}

        {err && <div className="text-sm text-red-500">{err}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/users" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={busy}>
            <Save className="w-4 h-4" /> {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </form>

      {canChangeTier && (
        <div className="card p-6">
          <h2 className="font-semibold mb-1">Change admin tier</h2>
          <p className="text-sm text-[hsl(var(--muted-fg))] mb-4">Only SUPER admins can change another admin's tier.</p>
          <div className="flex gap-2 items-end">
            <select aria-label="New tier" className="select flex-1" value={tier} onChange={e => setTier(e.target.value as AdminTier)}>
              <option value="SUPER">SUPER</option>
              <option value="OPERATIONS">OPERATIONS</option>
              <option value="FINANCE">FINANCE</option>
              <option value="SUPPORT">SUPPORT</option>
            </select>
            <button type="button" className="btn-primary" onClick={() => setTierMut.mutate()} disabled={setTierMut.isPending}>
              {setTierMut.isPending ? 'Saving…' : 'Apply tier'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
