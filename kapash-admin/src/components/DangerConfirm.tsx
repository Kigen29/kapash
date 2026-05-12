import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  trigger: ReactNode;
  title: string;
  body?: string;
  /** Text the user must type to enable the confirm button. e.g. the entity name. */
  confirmText: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}

/**
 * High-friction confirmation for destructive operations. User must type the exact
 * `confirmText` (case-sensitive) to enable the button.
 */
export function DangerConfirm({
  trigger, title, body, confirmText, confirmLabel = 'Delete', onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const canConfirm = typed === confirmText && !busy;

  const run = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
      setTyped('');
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
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-300" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
            </div>
            {body && <p className="text-sm text-[hsl(var(--muted-fg))] mb-4">{body}</p>}
            <div className="text-sm">
              Type <span className="font-mono font-bold text-red-600">{confirmText}</span> to confirm:
            </div>
            <input
              autoFocus
              className="input mt-2"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={confirmText}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="button" className="btn-danger" onClick={run} disabled={!canConfirm}>
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
