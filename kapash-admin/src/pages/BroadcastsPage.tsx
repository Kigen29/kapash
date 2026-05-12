import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Megaphone, Send, CheckCircle2 } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';
import type { UserRole } from '../api/types';

type AudienceKind = 'all' | 'role';

export function BroadcastsPage() {
  const [kind, setKind] = useState<AudienceKind>('all');
  const [role, setRole] = useState<UserRole>('PLAYER');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [lastResult, setLastResult] = useState<{ recipients: number; pushDelivered: number } | null>(null);
  const [error, setError] = useState('');

  const send = useMutation({
    mutationFn: () => ADMIN.broadcast({
      audience: kind === 'all' ? { kind: 'all' } : { kind: 'role', role },
      title: title.trim(),
      body: body.trim(),
    }),
    onSuccess: (res) => {
      setLastResult(res);
      setTitle('');
      setBody('');
      setError('');
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const canSend = title.trim().length >= 1 && body.trim().length >= 1 && !send.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-brand" />Broadcasts</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Send a notification to all users or a specific role.</p>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="label">Audience</label>
          <div className="flex gap-2 mt-2">
            <button
              className={kind === 'all' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setKind('all')}
            >Everyone</button>
            <button
              className={kind === 'role' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setKind('role')}
            >By role</button>
          </div>
          {kind === 'role' && (
            <select aria-label="Role" className="select w-40 mt-2" value={role} onChange={e => setRole(e.target.value as UserRole)}>
              <option value="PLAYER">Players</option>
              <option value="OWNER">Owners</option>
              <option value="ADMIN">Admins</option>
            </select>
          )}
        </div>

        <div>
          <label className="label">Title</label>
          <input
            className="input mt-1"
            placeholder="e.g. New feature: location-based search"
            maxLength={120}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Body</label>
          <textarea
            className="textarea mt-1 min-h-[120px]"
            placeholder="Write the notification body. Max 500 characters."
            maxLength={500}
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <div className="text-xs text-[hsl(var(--muted-fg))] text-right mt-1">{body.length} / 500</div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        {lastResult && (
          <div className="card bg-green-50 dark:bg-green-900/20 border-green-300 p-4 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <div className="font-semibold">Broadcast sent</div>
              <div className="text-[hsl(var(--muted-fg))]">
                Delivered to {lastResult.recipients} user{lastResult.recipients !== 1 ? 's' : ''}
                {' '}({lastResult.pushDelivered} via push).
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button className="btn-primary" disabled={!canSend} onClick={() => send.mutate()}>
            <Send className="w-4 h-4" />
            {send.isPending ? 'Sending…' : 'Send broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}
