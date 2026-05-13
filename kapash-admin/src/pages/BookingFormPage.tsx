import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Search, Check } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatKsh } from '../lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export function BookingFormPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [user, setUser] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [pitch, setPitch] = useState<{ id: string; name: string; pricePerHour: number } | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const create = useMutation({
    mutationFn: () => ADMIN.bookings.create({
      userId: user!.id, pitchId: pitch!.id,
      date, startTime, endTime, notes: notes || undefined,
    }),
    onSuccess: (b: any) => nav(`/bookings/${b.id}`),
    onError: e => setErr(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!user || !pitch) return setErr('Pick a user and pitch first.');
    if (startTime >= endTime) return setErr('End time must be after start time.');
    create.mutate();
  };

  const [sh] = startTime.split(':').map(Number);
  const [eh] = endTime.split(':').map(Number);
  const hours = eh - sh;
  const estimatedTotal = pitch && hours > 0 ? pitch.pricePerHour * hours : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/bookings" className="btn-ghost btn-sm w-fit"><ArrowLeft className="w-4 h-4" />Back</Link>
      <div>
        <h1 className="text-2xl font-bold">New booking (admin)</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Create a booking on behalf of any user. Payment is recorded out-of-band.</p>
      </div>

      <Stepper step={step} />

      {step === 1 && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">1. Pick a user</h2>
          <UserPicker
            selected={user}
            onPick={(u) => { setUser(u); setStep(2); }}
          />
        </div>
      )}

      {step === 2 && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">2. Pick a pitch</h2>
          <PitchPicker
            selected={pitch}
            onPick={(p) => { setPitch(p); setStep(3); }}
          />
          <button type="button" className="btn-ghost btn-sm" onClick={() => setStep(1)}>← Back to user</button>
        </div>
      )}

      {step === 3 && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">3. Pick a date and time</h2>
          <div>
            <label className="label">Date</label>
            <input aria-label="Date" type="date" className="input mt-1 w-44" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start</label>
              <select aria-label="Start time" className="select mt-1" value={startTime} onChange={e => setStartTime(e.target.value)}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="label">End</label>
              <select aria-label="End time" className="select mt-1" value={endTime} onChange={e => setEndTime(e.target.value)}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="textarea mt-1 min-h-[60px]" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} />
          </div>
          <div className="flex justify-between mt-3">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setStep(2)}>← Back to pitch</button>
            <button type="button" className="btn-primary" onClick={() => setStep(4)}>Review →</button>
          </div>
        </div>
      )}

      {step === 4 && user && pitch && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <h2 className="font-semibold">4. Confirm</h2>
          <Row label="User" value={`${user.name} · ${user.phone || ''}`} />
          <Row label="Pitch" value={pitch.name} />
          <Row label="Date" value={date} />
          <Row label="Time" value={`${startTime} – ${endTime} (${hours}h)`} />
          <Row label="Estimated total" value={formatKsh(estimatedTotal)} highlight />
          {notes && <Row label="Notes" value={notes} />}

          {err && <div className="text-sm text-red-500">{err}</div>}

          <div className="flex justify-between">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setStep(3)}>← Edit</button>
            <button type="submit" className="btn-primary" disabled={create.isPending}>
              <Save className="w-4 h-4" />{create.isPending ? 'Creating…' : 'Create booking'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ['User', 'Pitch', 'Time', 'Confirm'];
  return (
    <div className="flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${done ? 'bg-brand text-white' : active ? 'bg-brand-muted text-brand border border-brand' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-fg))]'}`}>
              {done ? <Check className="w-3 h-3" /> : n}
            </div>
            <span className={active ? 'font-medium' : 'text-[hsl(var(--muted-fg))]'}>{label}</span>
            {i < labels.length - 1 && <span className="text-[hsl(var(--muted-fg))]">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline border-b border-[hsl(var(--border))]/40 pb-2 last:border-0">
      <span className="text-xs text-[hsl(var(--muted-fg))]">{label}</span>
      <span className={highlight ? 'font-bold text-brand text-lg' : 'font-medium'}>{value}</span>
    </div>
  );
}

function UserPicker({
  selected, onPick,
}: { selected: any; onPick: (u: { id: string; name: string; phone: string | null }) => void }) {
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-search', debounced],
    queryFn: () => ADMIN.users.list({ search: debounced || undefined, limit: 10 }),
    enabled: q.length > 0,
  });

  if (selected) {
    return (
      <div className="card p-2.5 bg-[hsl(var(--muted))] flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{selected.name}</div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">{selected.phone}</div>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onPick({ id: '', name: '', phone: null })}>Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-fg))]" />
      <input className="input pl-8" placeholder="Search by name, phone, or email…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
      {q && (
        <div className="absolute top-full left-0 right-0 mt-1 card max-h-72 overflow-y-auto z-10 shadow-lg">
          {isLoading ? <div className="p-3 text-sm text-[hsl(var(--muted-fg))]">Searching…</div>
          : !data?.users.length ? <div className="p-3 text-sm text-[hsl(var(--muted-fg))]">No users match.</div>
          : data.users.map(u => (
            <button
              type="button"
              key={u.id}
              onClick={() => onPick({ id: u.id, name: u.name, phone: u.phone })}
              className="w-full text-left p-2.5 hover:bg-[hsl(var(--muted))] flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-full bg-brand-muted text-brand text-xs font-bold flex items-center justify-center">{u.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{u.name} <span className="text-xs text-[hsl(var(--muted-fg))]">· {u.role}</span></div>
                <div className="text-xs text-[hsl(var(--muted-fg))] truncate">{u.phone}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PitchPicker({
  selected, onPick,
}: { selected: any; onPick: (p: { id: string; name: string; pricePerHour: number }) => void }) {
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'pitch-search', debounced],
    queryFn: () => ADMIN.pitches.list({ status: 'ACTIVE', search: debounced || undefined, limit: 10 }),
    enabled: q.length > 0,
  });

  if (selected) {
    return (
      <div className="card p-2.5 bg-[hsl(var(--muted))] flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{selected.name}</div>
          <div className="text-xs text-[hsl(var(--muted-fg))]">{formatKsh(selected.pricePerHour)}/hr</div>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onPick({ id: '', name: '', pricePerHour: 0 })}>Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-fg))]" />
      <input className="input pl-8" placeholder="Search by pitch name or address…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
      {q && (
        <div className="absolute top-full left-0 right-0 mt-1 card max-h-72 overflow-y-auto z-10 shadow-lg">
          {isLoading ? <div className="p-3 text-sm text-[hsl(var(--muted-fg))]">Searching…</div>
          : !data?.pitches.length ? <div className="p-3 text-sm text-[hsl(var(--muted-fg))]">No active pitches match.</div>
          : data.pitches.map(p => (
            <button
              type="button"
              key={p.id}
              onClick={() => onPick({ id: p.id, name: p.name, pricePerHour: p.pricePerHour })}
              className="w-full text-left p-2.5 hover:bg-[hsl(var(--muted))]"
            >
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-xs text-[hsl(var(--muted-fg))] flex justify-between"><span>{p.address}</span><span>{formatKsh(p.pricePerHour)}/hr</span></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
