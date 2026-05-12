import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTree, Plus, Pencil, Trash2 } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { DangerConfirm } from '../components/DangerConfirm';
import { errorMessage } from '../api/client';
import type { Amenity } from '../api/types';

export function AmenitiesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'amenities'], queryFn: ADMIN.amenities.list });
  const [editing, setEditing] = useState<Amenity | 'new' | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'amenities'] });
  const del = useMutation({ mutationFn: (id: string) => ADMIN.amenities.delete(id), onSuccess: invalidate });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ListTree className="w-6 h-6 text-brand" /> Amenities catalog</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Global list of amenities pitches can be tagged with.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="w-4 h-4" /> New amenity
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Icon</th><th>Name</th><th>Category</th><th>Active</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={5}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>)
            ) : !data?.length ? (
              <tr><td colSpan={5} className="text-center text-[hsl(var(--muted-fg))] py-8">No amenities. Add the first one.</td></tr>
            ) : data.map(a => (
              <tr key={a.id}>
                <td className="text-xl">{a.icon}</td>
                <td className="font-medium">{a.name}</td>
                <td className="text-[hsl(var(--muted-fg))]">{a.category || '—'}</td>
                <td>{a.isActive ? <span className="badge bg-green-100 text-green-800">Active</span> : <span className="badge bg-slate-200 text-slate-700">Hidden</span>}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(a)} aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <DangerConfirm
                      trigger={<button type="button" className="btn-ghost btn-sm" aria-label="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                      title={`Delete "${a.name}"?`}
                      body="This is a global catalog item. Existing pitches keep their copy of this amenity, but it won't be suggested for new pitches."
                      confirmText={a.name}
                      onConfirm={async () => { await del.mutateAsync(a.id); }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <AmenityModal initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { invalidate(); setEditing(null); }} />}
    </div>
  );
}

function AmenityModal({ initial, onClose, onSaved }: { initial: Amenity | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName]    = useState(initial?.name || '');
  const [icon, setIcon]    = useState(initial?.icon || '⚽');
  const [category, setCat] = useState(initial?.category || '');
  const [active, setActive] = useState(initial?.isActive ?? true);
  const [err, setErr] = useState('');

  const save = useMutation({
    mutationFn: () => initial
      ? ADMIN.amenities.update(initial.id, { name: name.trim(), icon, category: category || null, isActive: active })
      : ADMIN.amenities.create({ name: name.trim(), icon, category: category || undefined }),
    onSuccess: onSaved,
    onError: (e) => setErr(errorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form className="card w-full max-w-sm p-6 space-y-3" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); save.mutate(); }}>
        <h3 className="font-semibold text-lg">{initial ? 'Edit amenity' : 'New amenity'}</h3>
        <div>
          <label className="label">Name</label>
          <input className="input mt-1" value={name} onChange={e => setName(e.target.value)} required maxLength={60} />
        </div>
        <div>
          <label className="label">Icon (emoji)</label>
          <input className="input mt-1" value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} />
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input mt-1" placeholder="comfort, play, safety…" value={category} onChange={e => setCat(e.target.value)} maxLength={40} />
        </div>
        {initial && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-brand" checked={active} onChange={e => setActive(e.target.checked)} /> Active
          </label>
        )}
        {err && <div className="text-sm text-red-500">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
