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
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, type ReactNode } from 'react';

const groups = [
  {
    label: 'Workspace',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
      { href: '/admin/partners', label: 'Partners', icon: Users },
      { href: '/admin/applications', label: 'Applications', icon: Archive },
      { href: '/admin/careers', label: 'Careers', icon: BriefcaseBusiness },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/visa-products', label: 'Visa products', icon: BookOpen },
      { href: '/admin/pricing', label: 'Pricing', icon: BadgeIndianRupee },
      { href: '/admin/document-checklists', label: 'Documents', icon: ClipboardList },
      { href: '/admin/jurisdictions', label: 'Jurisdictions', icon: Database },
      { href: '/admin/services', label: 'Services', icon: BriefcaseBusiness },
    ],
  },
  {
    label: 'Experience',
    items: [
      { href: '/admin/dashboard-editor', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/application-statuses', label: 'Statuses', icon: ClipboardList },
      { href: '/admin/announcements', label: 'Announcements', icon: Bell },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/wallets', label: 'Wallets', icon: WalletCards },
      { href: '/admin/import-export', label: 'Imports', icon: FileClock },
      { href: '/admin/audit-logs', label: 'Audit log', icon: ShieldCheck },
      { href: '/admin/users', label: 'Admin users', icon: Users },
      { href: '/admin/system-settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(href));
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        const activeGroup = group.items.some((item) => isItemActive(pathname, item.href));
        return (
          <details key={group.label} open={activeGroup || group.label === 'Workspace'} className="group/nav mb-2">
            <summary className="flex h-8 cursor-pointer list-none items-center justify-between rounded-md px-2 text-[11px] font-semibold uppercase text-vvisa-text-muted hover:bg-black/[0.03]">
              {group.label}
              <ChevronDown className="size-3 transition-transform group-open/nav:rotate-180" />
            </summary>
            <div className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex h-9 items-center gap-3 rounded-md px-2.5 text-[13px] transition-colors ${active ? 'bg-[#e8f0ff] font-semibold text-[#155bd7]' : 'text-[#4a5261] hover:bg-black/[0.035] hover:text-[#15171a]'}`}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={active ? 2.2 : 1.7} />
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
      if (isItemActive(pathname, item.href)) return item.label;
    }
  }
  return 'Admin';
}

export function AdminShell({ children, admin }: { children: ReactNode; admin: { email: string; role: string; writesEnabled?: boolean } }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const title = currentTitle(pathname);

  return (
    <div className="admin-console min-h-screen bg-[#f5f6f8] text-[#17191d]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-black/[0.07] bg-white/95 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex size-8 items-center justify-center rounded-md bg-[#1769e8] text-white shadow-sm"><ShieldCheck className="size-4" /></div>
          <div className="min-w-0"><p className="text-sm font-semibold tracking-tight">VVisa Admin</p><p className="truncate text-[11px] text-[#7a8290]">Business operations</p></div>
        </div>
        <NavLinks />
        <div className="border-t border-black/[0.06] p-3">
          <button onClick={() => router.push('/dashboard')} className="flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-left text-xs text-[#606877] hover:bg-black/[0.035] hover:text-[#17191d]">
            <div className="flex size-7 items-center justify-center rounded-full bg-[#edf1f7] text-[10px] font-semibold">{admin.email.slice(0, 1).toUpperCase()}</div>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium text-[#252931]">{admin.email}</span><span className="block truncate text-[10px] capitalize">{admin.role.replaceAll('_', ' ')}</span></span>
            <LogOut className="size-3.5" />
          </button>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/[0.06] bg-white/80 px-4 backdrop-blur-2xl lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="size-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="flex w-64 flex-col border-black/10 bg-white p-0"><SheetTitle className="sr-only">Admin navigation</SheetTitle><div className="flex h-16 items-center px-4 text-sm font-semibold">VVisa Admin</div><NavLinks onNavigate={() => setOpen(false)} /></SheetContent>
            </Sheet>
            <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1><Badge className="h-5 rounded-md border-0 bg-[#fff0ee] px-2 text-[10px] font-medium text-[#c43d2f] hover:bg-[#fff0ee]">Production</Badge></div><p className="hidden text-[11px] text-[#858c98] sm:block">{admin.writesEnabled ? 'Controlled writes active' : 'Read-only controls'}</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <form action="/admin/partners" className="hidden h-9 w-72 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,.03)] lg:flex"><Search className="size-3.5 text-[#8a919e]" /><Input name="q" className="h-8 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0" placeholder="Search partners or applications" /></form>
            <Button variant="ghost" size="icon" className="size-9 text-[#606877]" aria-label="Notifications"><Bell className="size-4" /></Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" className="hidden h-9 border-black/[0.09] bg-white text-xs shadow-sm sm:flex" onClick={() => router.push('/dashboard')}><LogOut className="size-3.5" />Portal</Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 py-5 lg:px-7 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
