import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star, Eye, EyeOff, Trash2 } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate } from '../lib/utils';

const LIMIT = 20;

export function ReviewsPage() {
  const qc = useQueryClient();
  const [isVisible, setIsVisible] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reviews', isVisible, page],
    queryFn: () => ADMIN.reviews.list({
      isVisible: isVisible === '' ? undefined : isVisible === 'true',
      page, limit: LIMIT,
    }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
  const setVisible = useMutation({ mutationFn: ({ id, v }: { id: string; v: boolean }) => ADMIN.reviews.setVisible(id, v), onSuccess: invalidate });
  const del = useMutation({ mutationFn: (id: string) => ADMIN.reviews.delete(id), onSuccess: invalidate });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="w-6 h-6 text-brand" />Reviews</h1>
        <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Moderate user reviews.</p>
      </div>

      <select aria-label="Visibility" className="select w-44" value={isVisible} onChange={e => { setPage(1); setIsVisible(e.target.value as any); }}>
        <option value="">All</option>
        <option value="true">Visible</option>
        <option value="false">Hidden</option>
      </select>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>User</th><th>Pitch</th><th>Rating</th><th>Comment</th><th>Visible</th><th>When</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-6 bg-[hsl(var(--muted))] rounded animate-pulse" /></td></tr>
              ))
            ) : !data?.reviews.length ? (
              <tr><td colSpan={7} className="text-center text-[hsl(var(--muted-fg))] py-12">No reviews match.</td></tr>
            ) : data.reviews.map(r => (
              <tr key={r.id}>
                <td>{r.user?.name}</td>
                <td><Link to={`/pitches/${r.pitch?.id}`} className="hover:underline">{r.pitch?.name}</Link></td>
                <td className="text-amber-500">{'★'.repeat(r.rating)}</td>
                <td className="max-w-md truncate">{r.comment || <span className="text-[hsl(var(--muted-fg))]">No comment</span>}</td>
                <td>{r.isVisible ? <span className="badge bg-green-100 text-green-800">Visible</span> : <span className="badge bg-slate-200 text-slate-700">Hidden</span>}</td>
                <td className="text-[hsl(var(--muted-fg))]">{formatDate(r.createdAt)}</td>
                <td>
                  <div className="flex justify-end gap-1">
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => setVisible.mutate({ id: r.id, v: !r.isVisible })}
                      title={r.isVisible ? 'Hide' : 'Show'}
                    >
                      {r.isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <ConfirmDialog
                      trigger={<button className="btn-ghost btn-sm" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                      title="Delete this review?"
                      body="This permanently removes the review."
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => del.mutateAsync(r.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />}
    </div>
  );
}
