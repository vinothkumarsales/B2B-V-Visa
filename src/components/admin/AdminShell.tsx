'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  BadgeIndianRupee,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  Database,
  FileClock,
  Globe,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState, type ReactNode } from 'react';

const groups = [
  {
    label: 'DASHBOARD',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/admin/analytics', label: 'Analytics', icon: LineChart },
      { href: '/admin/partners', label: 'Partners', icon: Users },
      { href: '/admin/applications', label: 'Applications', icon: Archive },
      { href: '/admin/careers', label: 'Careers', icon: BriefcaseBusiness },
    ],
  },
  {
    label: 'CATALOGUE',
    items: [
      { href: '/admin/visa-products', label: 'Visa Products', icon: BookOpen },
      { href: '/admin/jurisdictions', label: 'Countries', icon: Globe },
      { href: '/admin/document-checklists', label: 'Documents', icon: ClipboardList },
      { href: '/admin/pricing', label: 'Pricing', icon: BadgeIndianRupee },
      { href: '/admin/services', label: 'Services', icon: Wrench },
    ],
  },
  {
    label: 'EXPERIENCE',
    items: [
      { href: '/admin/dashboard-editor', label: 'Partner Portal', icon: LayoutDashboard },
      { href: '/admin/application-statuses', label: 'App Statuses', icon: ClipboardList },
      { href: '/admin/announcements', label: 'Announcements', icon: Bell },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/admin/wallets', label: 'Wallets', icon: WalletCards },
      { href: '/admin/users', label: 'Admin Users', icon: Users },
      { href: '/admin/audit-logs', label: 'Audit Log', icon: ShieldCheck },
      { href: '/admin/import-export', label: 'Import / Export', icon: FileClock },
      { href: '/admin/system-settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;

function isItemActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || (href !== '/admin' && pathname.startsWith(href));
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
      {groups.map((group) => {
        const activeGroup = group.items.some((item) => isItemActive(pathname, item.href, 'exact' in item ? item.exact : false));
        return (
          <details key={group.label} open={activeGroup || group.label === 'DASHBOARD' || group.label === 'CATALOGUE'} className="group/nav mb-5">
            <summary className="flex h-7 cursor-pointer list-none items-center justify-between px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors select-none">
              {group.label}
              <ChevronDown className="size-3 transition-transform group-open/nav:rotate-180" />
            </summary>
            <div className="mt-1.5 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item.href, 'exact' in item ? item.exact : false);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all ${
                      active
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-100/80'
                        : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`size-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
}

function currentTitle(pathname: string) {
  for (const group of groups) {
    for (const item of group.items) {
      const exact = 'exact' in item ? item.exact : false;
      if (isItemActive(pathname, item.href, exact)) return item.label;
    }
  }
  return 'Admin';
}

export function AdminShell({
  children,
  admin,
}: {
  children: ReactNode;
  admin: { email: string; role: string; writesEnabled?: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const title = currentTitle(pathname);

  const SidebarContent = () => (
    <>
      <div className="flex h-14 items-center gap-2.5 px-5 shrink-0 border-b border-slate-100">
        <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shrink-0">
          <ShieldCheck className="size-3.5" />
        </div>
        <p className="text-base font-black tracking-tight text-slate-900">V-VISA</p>
        <span className="ml-auto text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Admin</span>
      </div>

      <NavLinks />

      <div className="p-3 shrink-0 border-t border-slate-100">
        <div className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-100 p-2.5 shadow-sm">
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
            {admin.email.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900 text-xs">{admin.email.split('@')[0]}</p>
            <p className="truncate text-[10px] font-medium text-slate-500 capitalize">
              {admin.role.replaceAll('_', ' ')}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Exit to portal"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-console min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col bg-slate-50 border-r border-slate-100 md:flex">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="md:pl-[240px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white/80 border-b border-slate-100 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-slate-600 h-8 w-8">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[240px] flex-col border-r border-slate-100 bg-slate-50 p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <SidebarContent />
                {/* Override NavLinks to close on navigate */}
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex h-14 items-center gap-2.5 px-5 shrink-0 border-b border-slate-100">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shrink-0">
                      <ShieldCheck className="size-3.5" />
                    </div>
                    <p className="text-base font-black tracking-tight text-slate-900">V-VISA</p>
                    <span className="ml-auto text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Admin</span>
                  </div>
                  <NavLinks onNavigate={() => setOpen(false)} />
                  <div className="p-3 shrink-0 border-t border-slate-100">
                    <div className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-100 p-2.5 shadow-sm">
                      <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                        {admin.email.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-slate-900 text-xs">{admin.email.split('@')[0]}</p>
                        <p className="truncate text-[10px] font-medium text-slate-500 capitalize">
                          {admin.role.replaceAll('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-sm font-bold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/explore"
              target="_blank"
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              View Partner Portal ↗
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
