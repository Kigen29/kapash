import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon, title, body,
}: { icon?: LucideIcon; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-brand-muted flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-brand" />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {body && <p className="text-sm text-[hsl(var(--muted-fg))] mt-1 max-w-md">{body}</p>}
    </div>
  );
}
