import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ShieldCheck, MapPin, Users, CalendarCheck, Banknote, Star, Megaphone,
  ScrollText, Settings, Menu, X, Building2, Sparkles, Receipt, ListTree, ShieldAlert,
  PieChart, FileSpreadsheet, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ADMIN } from '../api/admin';
import { ProfileMenu } from '../components/ProfileMenu';
import { cn } from '../lib/utils';
import type { AdminTier } from '../api/types';

interface NavItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  badgeKey?: 'pendingPitches' | 'pendingPayouts';
  /** Tiers allowed to see this item. SUPER always sees everything. Empty = all tiers. */
  tiers?: AdminTier[];
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics',  icon: PieChart,        label: 'Analytics' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/pitches/pending', icon: ShieldCheck, label: 'Verification', badgeKey: 'pendingPitches', tiers: ['OPERATIONS', 'SUPPORT'] },
      { to: '/pitches',         icon: MapPin,      label: 'Pitches',      tiers: ['OPERATIONS', 'SUPPORT'] },
      { to: '/users',           icon: Users,       label: 'Users',        tiers: ['OPERATIONS', 'SUPPORT'] },
      { to: '/bookings',        icon: CalendarCheck, label: 'Bookings',   tiers: ['OPERATIONS', 'SUPPORT'] },
      { to: '/reviews',         icon: Star,        label: 'Reviews',      tiers: ['OPERATIONS', 'SUPPORT'] },
    ],
  },
  {
    title: 'Customers',
    items: [
      { to: '/corporates', icon: Building2, label: 'Corporates', tiers: ['OPERATIONS', 'FINANCE', 'SUPPORT'] },
      { to: '/events',     icon: Sparkles,  label: 'Events',     tiers: ['OPERATIONS', 'SUPPORT'] },
      { to: '/invoices',   icon: Receipt,   label: 'Invoices',   tiers: ['FINANCE', 'SUPPORT'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/payouts', icon: Banknote,        label: 'Payouts', badgeKey: 'pendingPayouts', tiers: ['FINANCE', 'SUPPORT'] },
      { to: '/reports', icon: FileSpreadsheet, label: 'Reports', tiers: ['FINANCE', 'OPERATIONS', 'SUPPORT'] },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/broadcasts', icon: Megaphone,   label: 'Broadcasts', tiers: ['OPERATIONS'] },
      { to: '/amenities',  icon: ListTree,    label: 'Amenities',  tiers: ['OPERATIONS'] },
      { to: '/admins',     icon: ShieldAlert, label: 'Admins',     tiers: [] /* SUPER only */ },
      { to: '/audit-log',  icon: ScrollText,  label: 'Audit log' },
      { to: '/settings',   icon: Settings,    label: 'Settings',   tiers: [] /* SUPER only */ },
    ],
  },
];

function canSee(item: NavItem, tier: AdminTier | null | undefined): boolean {
  if (tier === 'SUPER') return true;
  if (!item.tiers) return true; // visible to all tiers
  if (item.tiers.length === 0) return false; // SUPER-only
  return tier ? item.tiers.includes(tier) : false;
}

export function AdminLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('kapash_admin_theme') as 'light' | 'dark') || 'light',
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('kapash_admin_theme', theme);
  }, [theme]);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: ADMIN.stats,
    refetchInterval: 60_000,
  });

  const badgeFor = (key?: 'pendingPitches' | 'pendingPayouts') => {
    if (!stats || !key) return null;
    const n = (stats as any)[key];
    if (!n) return null;
    return (
      <span className="ml-auto badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
        {n}
      </span>
    );
  };

  const tier = user?.adminTier;

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2 px-4 h-14 border-b border-[hsl(var(--border))]">
        <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center text-white font-bold text-sm">K</div>
        <span className="font-semibold">KAPASH admin</span>
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(i => canSee(i, tier));
          if (!visibleItems.length) return null;
          const collapsed = !!collapsedGroups[group.title];
          return (
            <div key={group.title} className="mb-2">
              <button
                type="button"
                onClick={() => setCollapsedGroups(c => ({ ...c, [group.title]: !c[group.title] }))}
                className="w-full flex items-center px-2 mt-2 mb-1 text-[10px] uppercase tracking-wider text-[hsl(var(--muted-fg))] font-semibold hover:text-[hsl(var(--fg))]"
              >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span className="ml-1">{group.title}</span>
              </button>
              {!collapsed && (
                <div className="space-y-0.5">
                  {visibleItems.map(({ to, icon: Icon, label, badgeKey }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => cn(
                        'flex items-center gap-2.5 px-3 h-9 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-muted text-brand'
                          : 'text-[hsl(var(--fg))] hover:bg-[hsl(var(--muted))]',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                      {badgeFor(badgeKey)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="h-full flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {SidebarContent}
      </aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 flex flex-col bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]">
            <button
              type="button"
              className="absolute top-3 right-3 btn-ghost btn-sm"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[hsl(var(--border))] flex items-center px-4 gap-2 bg-[hsl(var(--card))]">
          <button type="button" className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold lg:hidden">KAPASH admin</h1>
          <div className="ml-auto flex items-center gap-2">
            <ProfileMenu theme={theme} onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
