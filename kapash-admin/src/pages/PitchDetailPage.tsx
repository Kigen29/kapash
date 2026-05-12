import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Star, Phone, Mail, ExternalLink } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { StatusBadge } from '../components/StatusBadge';
import { formatKsh, formatDateTime } from '../lib/utils';

export function PitchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: pitch, isLoading, error } = useQuery({
    queryKey: ['admin', 'pitch', id],
    queryFn: () => ADMIN.pitches.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="space-y-4"><div className="h-8 w-48 bg-[hsl(var(--muted))] rounded animate-pulse" /><div className="h-64 bg-[hsl(var(--muted))] rounded animate-pulse" /></div>;
  if (error || !pitch) return <p className="text-sm text-red-500">Pitch not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/pitches" className="btn-ghost btn-sm"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <StatusBadge value={pitch.status} />
      </div>

      <div className="card overflow-hidden">
        {pitch.images && pitch.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            {pitch.images.slice(0, 4).map(img => (
              <img key={img.id} src={img.url} alt="" className="aspect-video object-cover w-full" />
            ))}
          </div>
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold">{pitch.name}</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {pitch.address}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${pitch.latitude},${pitch.longitude}`}
              target="_blank" rel="noreferrer"
              className="text-brand ml-2 inline-flex items-center gap-1 hover:underline"
            >Open in map <ExternalLink className="w-3 h-3" /></a>
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 text-sm">
            <Field label="Type" value={pitch.type.replace(/_/g, ' ')} />
            <Field label="Size" value={pitch.size.replace(/_/g, ' ')} />
            <Field label="Price/hr" value={formatKsh(pitch.pricePerHour)} />
            <Field label="Avg rating" value={pitch.avgRating ? `★ ${pitch.avgRating.toFixed(1)} (${pitch.reviewCount})` : 'No reviews'} />
            <Field label="Revenue" value={formatKsh(pitch.revenue?.total ?? 0)} />
          </div>

          {pitch.description && (
            <div className="mt-5">
              <div className="label mb-1">About</div>
              <p className="text-sm leading-relaxed">{pitch.description}</p>
            </div>
          )}

          {pitch.amenities && pitch.amenities.length > 0 && (
            <div className="mt-5">
              <div className="label mb-2">Amenities</div>
              <div className="flex flex-wrap gap-1.5">
                {pitch.amenities.map(a => (
                  <span key={a.id} className="badge bg-[hsl(var(--muted))] text-[hsl(var(--fg))]">{a.icon} {a.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="label mb-3">Owner</div>
          <div className="font-semibold">{pitch.owner?.name}</div>
          {pitch.owner?.phone && (
            <div className="text-sm flex items-center gap-1 mt-1 text-[hsl(var(--muted-fg))]"><Phone className="w-3.5 h-3.5" />{pitch.owner.phone}</div>
          )}
          {pitch.owner?.email && (
            <div className="text-sm flex items-center gap-1 mt-1 text-[hsl(var(--muted-fg))]"><Mail className="w-3.5 h-3.5" />{pitch.owner.email}</div>
          )}
          {pitch.owner && (
            <Link to={`/users/${pitch.owner.id}`} className="btn-outline btn-sm mt-3">View owner</Link>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="label">Recent bookings</div>
          </div>
          {!(pitch as any).bookings?.length ? (
            <p className="text-sm text-[hsl(var(--muted-fg))]">No bookings yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Customer</th><th>Date · Time</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {(pitch as any).bookings.slice(0, 10).map((b: any) => (
                  <tr key={b.id}>
                    <td><Link to={`/bookings/${b.id}`} className="hover:underline">{b.user?.name}</Link></td>
                    <td className="text-[hsl(var(--muted-fg))]">{formatDateTime(b.date)} · {b.startTime}</td>
                    <td><StatusBadge value={b.status} /></td>
                    <td className="text-right font-medium">{formatKsh(b.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(pitch as any).reviews && (pitch as any).reviews.length > 0 && (
        <div className="card p-5">
          <div className="label mb-3 flex items-center gap-1"><Star className="w-3.5 h-3.5" />Reviews</div>
          <div className="space-y-3">
            {(pitch as any).reviews.slice(0, 5).map((r: any) => (
              <div key={r.id} className="border-b border-[hsl(var(--border))]/50 pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.user?.name}</span>
                  <span className="text-amber-500 text-sm">{'★'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 bg-[hsl(var(--muted))]">
      <div className="label">{label}</div>
      <div className="font-medium text-sm mt-0.5">{value}</div>
    </div>
  );
}
