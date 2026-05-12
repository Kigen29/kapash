import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => ADMIN.settings.list(),
  });

  const [commissionRate, setCommissionRate] = useState('0.13');
  const [payoutHours, setPayoutHours] = useState('24');
  const [autoVerify, setAutoVerify] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!settings) return;
    if (typeof settings.commission_rate === 'number') setCommissionRate(String(settings.commission_rate));
    if (typeof settings.payout_schedule_hours === 'number') setPayoutHours(String(settings.payout_schedule_hours));
    if (typeof settings.auto_verify_pitches === 'boolean') setAutoVerify(settings.auto_verify_pitches);
  }, [settings]);

  const update = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => ADMIN.settings.update(key, value),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      setSavedKey(vars.key);
      setError('');
      setTimeout(() => setSavedKey(null), 2000);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (isLoading) return <div className="h-32 bg-[hsl(var(--muted))] rounded animate-pulse" />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="w-6 h-6 text-brand" />Settings</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Platform-wide configuration. Changes apply immediately.</p>
      </div>

      <SettingCard
        title="Commission rate"
        body="Fraction of each booking kept by the platform. E.g. 0.13 = 13%."
        saved={savedKey === 'commission_rate'}
      >
        <div className="flex gap-2">
          <input
            type="number"
            className="input w-32"
            step="0.01"
            min="0" max="0.5"
            value={commissionRate}
            onChange={e => setCommissionRate(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={() => {
              const n = Number(commissionRate);
              if (isNaN(n) || n < 0 || n > 0.5) return setError('Commission must be between 0 and 0.5');
              update.mutate({ key: 'commission_rate', value: n });
            }}
          ><Save className="w-4 h-4" />Save</button>
        </div>
      </SettingCard>

      <SettingCard
        title="Payout schedule (hours)"
        body="How long after a booking is completed before the payout is scheduled."
        saved={savedKey === 'payout_schedule_hours'}
      >
        <div className="flex gap-2">
          <input
            type="number"
            className="input w-32"
            min="0" max="168"
            value={payoutHours}
            onChange={e => setPayoutHours(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={() => {
              const n = Number(payoutHours);
              if (isNaN(n) || n < 0) return setError('Must be a non-negative number');
              update.mutate({ key: 'payout_schedule_hours', value: n });
            }}
          ><Save className="w-4 h-4" />Save</button>
        </div>
      </SettingCard>

      <SettingCard
        title="Auto-verify new pitches"
        body="When ON, new pitches skip the verification queue and go live immediately. Use only in dev/staging."
        saved={savedKey === 'auto_verify_pitches'}
      >
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="w-4 h-4 accent-brand"
            checked={autoVerify}
            onChange={e => {
              setAutoVerify(e.target.checked);
              update.mutate({ key: 'auto_verify_pitches', value: e.target.checked });
            }}
          />
          <span className="text-sm">{autoVerify ? 'Enabled' : 'Disabled'}</span>
        </label>
      </SettingCard>

      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
}

function SettingCard({
  title, body, children, saved,
}: { title: string; body: string; children: React.ReactNode; saved?: boolean }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1 max-w-md">{body}</p>
        </div>
        {saved && <span className="badge bg-green-100 text-green-800">Saved</span>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
