import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/utils';

interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const TIER_STYLE: Record<string, string> = {
  SUPER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  OPERATIONS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  FINANCE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  SUPPORT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
};

export function ProfileMenu({ theme, onToggleTheme }: Props) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;
  const tier = user.adminTier || 'ADMIN';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-brand-muted text-brand flex items-center justify-center text-xs font-bold">
          {(user.name || 'A')[0].toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium leading-tight">{user.name}</div>
          <div className="text-[10px] text-[hsl(var(--muted-fg))] leading-tight">{tier}</div>
        </div>
        <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-fg))]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 z-50 card shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-muted text-brand flex items-center justify-center text-sm font-bold">
                {(user.name || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{user.name}</div>
                <div className="text-xs text-[hsl(var(--muted-fg))] truncate">{user.phone || user.email}</div>
              </div>
            </div>
            {user.adminTier && (
              <span className={cn('badge mt-3', TIER_STYLE[user.adminTier])}>{user.adminTier}</span>
            )}
          </div>
          <div className="p-1">
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 h-9 rounded-md text-sm hover:bg-[hsl(var(--muted))]"
            >
              <UserCircle className="w-4 h-4" /> Settings
            </Link>
            <button
              type="button"
              onClick={() => { onToggleTheme(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 h-9 rounded-md text-sm hover:bg-[hsl(var(--muted))]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </button>
            <button
              type="button"
              onClick={async () => { await logout(); nav('/login'); }}
              className="w-full flex items-center gap-2 px-3 h-9 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
