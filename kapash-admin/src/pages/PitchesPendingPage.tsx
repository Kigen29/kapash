import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, MapPin, ExternalLink, CheckCircle2, XCircle, Star, Banknote } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';
import type { AdminPitch } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatKsh } from '../lib/utils';

export function PitchesPendingPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'pitches', 'pending'],
    queryFn: () => ADMIN.pitches.listPending(),
  });
  const [active, setActive] = useState<AdminPitch | null>(null);

  const verify = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) =>
      ADMIN.pitches.verify(id, action, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pitches'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      setActive(null);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand" /> Verification queue
        </h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">
          Pitches awaiting admin approval. Click a tile to review and act.
        </p>
      </div>

      {error && (
        <div className="card border-red-300 bg-red-50 dark:bg-red-900/20 p-4 text-sm">
          {errorMessage(error)}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-72 animate-pulse bg-[hsl(var(--muted))]" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState icon={ShieldCheck} title="All clear" body="No pitches are waiting for verification." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map(p => (
            <PitchTile key={p.id} pitch={p} onClick={() => setActive(p)} />
          ))}
        </div>
      )}

      {active && (
        <PitchReviewModal
          pitch={active}
          onClose={() => setActive(null)}
          onApprove={() => verify.mutate({ id: active.id, action: 'approve' })}
          onReject={(reason) => verify.mutate({ id: active.id, action: 'reject', reason })}
          busy={verify.isPending}
        />
      )}
    </div>
  );
}

function PitchTile({ pitch, onClick }: { pitch: AdminPitch; onClick: () => void }) {
  const img = pitch.images?.[0]?.url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800';
  return (
    <button
      onClick={onClick}
      className="card overflow-hidden text-left hover:border-brand transition-colors flex flex-col"
    >
      <img src={img} alt={pitch.name} className="aspect-video w-full object-cover" />
      <div className="p-4 flex-1">
        <h3 className="font-semibold truncate">{pitch.name}</h3>
        <div className="text-xs text-[hsl(var(--muted-fg))] mt-1 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{pitch.address}</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted-fg))]">{pitch.owner?.name}</span>
          <span className="font-semibold text-brand">{formatKsh(pitch.pricePerHour)}/hr</span>
        </div>
      </div>
    </button>
  );
}

function PitchReviewModal({
  pitch, onClose, onApprove, onReject, busy,
}: {
  pitch: AdminPitch;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card w-full max-w-3xl my-8" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <h2 className="text-xl font-bold">{pitch.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-[hsl(var(--muted-fg))]">
            <MapPin className="w-3.5 h-3.5" />
            {pitch.address}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${pitch.latitude},${pitch.longitude}`}
              target="_blank" rel="noreferrer"
              className="text-brand inline-flex items-center gap-1 hover:underline ml-2"
            >
              View on map <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {pitch.images && pitch.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {pitch.images.map(img => (
                <img key={img.id} src={img.url} alt="" className="aspect-square object-cover rounded-md" />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Type"  value={pitch.type.replace(/_/g, ' ')} />
            <Stat label="Size"  value={pitch.size.replace(/_/g, ' ')} />
            <Stat label="Price" value={`${formatKsh(pitch.pricePerHour)}/hr`} icon={Banknote} />
            <Stat label="Rating" value={pitch.avgRating ? `★ ${pitch.avgRating.toFixed(1)}` : 'New'} icon={Star} />
          </div>

          {pitch.description && (
            <div>
              <div className="label mb-1">Description</div>
              <p className="text-sm leading-relaxed">{pitch.description}</p>
            </div>
          )}

          {pitch.amenities && pitch.amenities.length > 0 && (
            <div>
              <div className="label mb-2">Amenities</div>
              <div className="flex flex-wrap gap-1.5">
                {pitch.amenities.map(a => (
                  <span key={a.id} className="badge bg-[hsl(var(--muted))] text-[hsl(var(--fg))]">
                    {a.icon} {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 bg-[hsl(var(--muted))]">
            <div className="label mb-2">Owner</div>
            <div className="font-medium">{pitch.owner?.name}</div>
            <div className="text-sm text-[hsl(var(--muted-fg))]">{pitch.owner?.phone} · {pitch.owner?.email}</div>
          </div>
        </div>

        <div className="p-6 border-t border-[hsl(var(--border))] flex flex-wrap items-center justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Close</button>
          <ConfirmDialog
            trigger={<button className="btn-danger" disabled={busy}><XCircle className="w-4 h-4" />Reject</button>}
            title="Reject this pitch?"
            body="The owner will be notified. They can edit and resubmit."
            confirmLabel="Reject"
            destructive
            needsReason
            reasonPlaceholder="Why is this pitch being rejected? (visible to owner)"
            onConfirm={(reason) => onReject(reason || 'Did not meet our standards.')}
          />
          <button className="btn-primary" onClick={onApprove} disabled={busy}>
            <CheckCircle2 className="w-4 h-4" /> Approve & list
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<any> }) {
  return (
    <div className="card p-3 bg-[hsl(var(--muted))]">
      <div className="label">{label}</div>
      <div className="font-medium flex items-center gap-1 mt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-brand" />}
        {value}
      </div>
    </div>
  );
}
