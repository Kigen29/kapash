import { useState, type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface Props {
  trigger: ReactNode;
  title: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
  needsReason?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => Promise<void> | void;
}

export function ConfirmDialog({
  trigger, title, body, confirmLabel = 'Confirm', destructive, needsReason, reasonPlaceholder, onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (needsReason && !reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(needsReason ? reason.trim() : undefined);
      setOpen(false);
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">{title}</h3>
            {body && <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">{body}</p>}
            {needsReason && (
              <textarea
                className="textarea mt-4 min-h-[80px]"
                placeholder={reasonPlaceholder || 'Reason'}
                value={reason}
                onChange={e => setReason(e.target.value)}
                autoFocus
              />
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button
                className={cn(destructive ? 'btn-danger' : 'btn-primary')}
                onClick={run}
                disabled={busy || (needsReason && !reason.trim())}
              >
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
