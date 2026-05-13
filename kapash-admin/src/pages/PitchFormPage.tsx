import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Search, MapPin } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatKsh } from '../lib/utils';

const PITCH_TYPES = ['ASTRO_TURF', 'NATURAL_GRASS', 'CONCRETE', 'HYBRID'] as const;
const PITCH_SIZES = ['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE'] as const;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

interface Form {
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  type: typeof PITCH_TYPES[number];
  size: typeof PITCH_SIZES[number];
  pricePerHour: number;
  ownerId: string;
  ownerName: string;
  openDays: Set<string>;
  openTime: string;
  closeTime: string;
  amenityNames: Set<string>;
  autoVerify: boolean;
}

export function PitchFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ['admin', 'pitch', id],
    queryFn: () => ADMIN.pitches.get(id!),
    enabled: isEdit,
  });
  const { data: amenities } = useQuery({ queryKey: ['admin', 'amenities'], queryFn: ADMIN.amenities.list });

  const [form, setForm] = useState<Form>({
    name: '', description: '',
    address: '', city: 'Nairobi',
    latitude: -1.286389, longitude: 36.817223,
    type: 'ASTRO_TURF', size: 'SEVEN_A_SIDE',
    pricePerHour: 2500,
    ownerId: '', ownerName: '',
    openDays: new Set(DAYS),
    openTime: '06:00', closeTime: '22:00',
    amenityNames: new Set(),
    autoVerify: false,
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!existing.data) return;
    const p = existing.data;
    const oh = (p as any).operatingHours || {};
    const openDays = new Set<string>(Object.keys(oh));
    const firstDay = openDays.values().next().value as string | undefined;
    setForm(f => ({
      ...f,
      name: p.name,
      description: p.description || '',
      address: p.address, city: p.city,
      latitude: p.latitude, longitude: p.longitude,
      type: p.type as any, size: p.size as any,
      pricePerHour: p.pricePerHour,
      ownerId: p.owner?.id || '', ownerName: p.owner?.name || '',
      openDays: openDays.size ? openDays : new Set(DAYS),
      openTime: firstDay ? oh[firstDay]?.open || '06:00' : '06:00',
      closeTime: firstDay ? oh[firstDay]?.close || '22:00' : '22:00',
      amenityNames: new Set((p.amenities || []).map(a => a.name)),
    }));
  }, [existing.data]);

  const buildPayload = () => {
    const operatingHours: Record<string, { open: string; close: string }> = {};
    for (const day of form.openDays) operatingHours[day] = { open: form.openTime, close: form.closeTime };
    const amenityList = [...form.amenityNames].map(n => {
      const a = amenities?.find(x => x.name === n);
      return { name: n, icon: a?.icon || '⚽' };
    });
    return {
      name: form.name.trim(), description: form.description.trim() || undefined,
      address: form.address.trim(), city: form.city.trim() || 'Nairobi', county: 'Nairobi',
      latitude: form.latitude, longitude: form.longitude,
      type: form.type, size: form.size,
      pricePerHour: form.pricePerHour,
      ...(isEdit ? {} : { ownerId: form.ownerId }),
      operatingHours,
      amenities: amenityList,
      ...(isEdit ? {} : { autoVerify: form.autoVerify }),
    };
  };

  const create = useMutation({
    mutationFn: () => ADMIN.pitches.create(buildPayload()),
    onSuccess: (p: any) => {
      qc.invalidateQueries({ queryKey: ['admin', 'pitches'] });
      nav(`/pitches/${p.id}`);
    },
    onError: e => setErr(errorMessage(e)),
  });
  const update = useMutation({
    mutationFn: () => ADMIN.pitches.update(id!, buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pitches'] });
      qc.invalidateQueries({ queryKey: ['admin', 'pitch', id] });
      nav(`/pitches/${id}`);
    },
    onError: e => setErr(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim() || form.name.trim().length < 3) return setErr('Name must be at least 3 characters.');
    if (!form.address.trim() || form.address.trim().length < 5) return setErr('Address must be at least 5 characters.');
    if (!isEdit && !form.ownerId) return setErr('Please select an owner.');
    if (form.pricePerHour < 500 || form.pricePerHour > 20000) return setErr('Price must be KSh 500–20,000.');
    if (!form.openDays.size) return setErr('Pick at least one open day.');
    if (form.openTime >= form.closeTime) return setErr('Closing time must be after opening time.');
    if (isEdit) update.mutate(); else create.mutate();
  };

  const toggle = <K extends keyof Form>(key: K, value: any) => setForm(f => ({ ...f, [key]: value }));
  const toggleSet = (set: 'openDays' | 'amenityNames', value: string) => setForm(f => {
    const next = new Set(f[set]);
    if (next.has(value)) next.delete(value); else next.add(value);
    return { ...f, [set]: next };
  });

  const busy = create.isPending || update.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to={isEdit ? `/pitches/${id}` : '/pitches'} className="btn-ghost btn-sm w-fit"><ArrowLeft className="w-4 h-4" />Back</Link>
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit pitch' : 'New pitch'}</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">
          {isEdit ? 'Update pitch details. Status changes use the actions on the pitch detail page.' : 'Create a pitch on behalf of an owner. You can auto-verify it to skip the queue.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {!isEdit && (
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Owner</h2>
            <OwnerPicker
              selectedId={form.ownerId}
              selectedName={form.ownerName}
              onPick={(u) => setForm(f => ({ ...f, ownerId: u.id, ownerName: u.name }))}
            />
          </div>
        )}

        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">Basic info</h2>
          <div><label className="label">Pitch name</label><input className="input mt-1" value={form.name} onChange={e => toggle('name', e.target.value)} required minLength={3} maxLength={100} /></div>
          <div><label className="label">Description</label><textarea className="textarea mt-1 min-h-[80px]" value={form.description} onChange={e => toggle('description', e.target.value)} maxLength={1000} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Address</label><input className="input mt-1" value={form.address} onChange={e => toggle('address', e.target.value)} required minLength={5} /></div>
            <div><label className="label">City</label><input className="input mt-1" value={form.city} onChange={e => toggle('city', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Latitude</label>
              <input className="input mt-1" type="number" step="any" value={form.latitude} onChange={e => toggle('latitude', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input className="input mt-1" type="number" step="any" value={form.longitude} onChange={e => toggle('longitude', Number(e.target.value))} />
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`}
            target="_blank" rel="noreferrer"
            className="text-sm text-brand inline-flex items-center gap-1 hover:underline"
          ><MapPin className="w-3.5 h-3.5" />Preview on map</a>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">Surface, size, pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Surface type</label>
              <select aria-label="Surface type" className="select mt-1" value={form.type} onChange={e => toggle('type', e.target.value)}>
                {PITCH_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pitch size</label>
              <select aria-label="Pitch size" className="select mt-1" value={form.size} onChange={e => toggle('size', e.target.value)}>
                {PITCH_SIZES.map(s => <option key={s} value={s}>{s.replace(/_/g, '-')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Price per hour (KSh)</label>
            <input className="input mt-1" type="number" min="500" max="20000" step="100" value={form.pricePerHour} onChange={e => toggle('pricePerHour', Number(e.target.value))} />
            <p className="text-xs text-[hsl(var(--muted-fg))] mt-1">Effective price: {formatKsh(form.pricePerHour)}/hr</p>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">Operating hours</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Opens</label>
              <select aria-label="Open time" className="select mt-1" value={form.openTime} onChange={e => toggle('openTime', e.target.value)}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Closes</label>
              <select aria-label="Close time" className="select mt-1" value={form.closeTime} onChange={e => toggle('closeTime', e.target.value)}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label mb-1.5 block">Open days</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map(d => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleSet('openDays', d)}
                  className={`badge cursor-pointer ${form.openDays.has(d) ? 'bg-brand text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--fg))]'}`}
                >
                  {d.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-3">Amenities</h2>
          {!amenities?.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No amenities in catalog yet. <Link to="/amenities" className="text-brand hover:underline">Add some</Link>.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {amenities.filter(a => a.isActive).map(a => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggleSet('amenityNames', a.name)}
                  className={`badge cursor-pointer ${form.amenityNames.has(a.name) ? 'bg-brand-muted text-brand border border-brand' : 'bg-[hsl(var(--muted))] text-[hsl(var(--fg))]'}`}
                >
                  {a.icon} {a.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isEdit && (
          <div className="card p-5">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-brand mt-0.5"
                checked={form.autoVerify}
                onChange={e => toggle('autoVerify', e.target.checked)}
              />
              <div>
                <div className="font-medium text-sm">Auto-verify (skip the queue)</div>
                <div className="text-xs text-[hsl(var(--muted-fg))] mt-0.5">
                  Pitch goes live immediately as ACTIVE/verified. Use for trusted owners or migration imports.
                </div>
              </div>
            </label>
          </div>
        )}

        {err && <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-300 text-sm text-red-600">{err}</div>}

        <div className="flex justify-end gap-2 sticky bottom-0 bg-[hsl(var(--bg))] py-3">
          <Link to={isEdit ? `/pitches/${id}` : '/pitches'} className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={busy}>
            <Save className="w-4 h-4" />
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create pitch'}
          </button>
        </div>
      </form>
    </div>
  );
}

function OwnerPicker({
  selectedId, selectedName, onPick,
}: { selectedId: string; selectedName: string; onPick: (u: { id: string; name: string }) => void }) {
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'owner-search', debounced],
    queryFn: () => ADMIN.users.list({ role: 'OWNER', search: debounced || undefined, limit: 10 }),
    enabled: !selectedId && q.length > 0,
  });

  if (selectedId) {
    return (
      <div className="flex items-center gap-2">
        <div className="card p-2.5 bg-[hsl(var(--muted))] flex-1">
          <div className="font-medium text-sm">{selectedName}</div>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onPick({ id: '', name: '' })}>Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-fg))]" />
      <input
        className="input pl-8"
        placeholder="Search by owner name or phone…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {q && (
        <div className="absolute top-full left-0 right-0 mt-1 card max-h-64 overflow-y-auto z-10 shadow-lg">
          {isLoading ? (
            <div className="p-3 text-sm text-[hsl(var(--muted-fg))]">Searching…</div>
          ) : !data?.users.length ? (
            <div className="p-3 text-sm text-[hsl(var(--muted-fg))]">No owners match.</div>
          ) : data.users.map(u => (
            <button
              type="button"
              key={u.id}
              onClick={() => { onPick({ id: u.id, name: u.name }); setQ(''); }}
              className="w-full text-left p-2.5 hover:bg-[hsl(var(--muted))] flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-full bg-brand-muted text-brand text-xs font-bold flex items-center justify-center">{u.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{u.name}</div>
                <div className="text-xs text-[hsl(var(--muted-fg))] truncate">{u.phone}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-[hsl(var(--muted-fg))] mt-1">
        Owner not yet on KAPASH? <Link to="/users/new" className="text-brand hover:underline">Create one first</Link>.
      </p>
    </div>
  );
}
