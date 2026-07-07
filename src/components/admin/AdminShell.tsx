'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  BadgeIndianRupee,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  Database,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
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
import { Separator } from '@/components/ui/separator';
import { useState, type ReactNode } from 'react';
import type { AdminFeatureFlag } from '@/server/admin/feature-flags';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/partners', label: 'Partners', icon: Users },
  { href: '/admin/applications', label: 'Applications', icon: Archive },
  { href: '/admin/catalogue', label: 'Countries & Visas', icon: BookOpen },
  { href: '/admin/services', label: 'Services', icon: BriefcaseBusiness },
  { href: '/admin/pricing', label: 'Pricing', icon: BadgeIndianRupee },
  { href: '/admin/document-checklists', label: 'Document Checklists', icon: ClipboardList },
  { href: '/admin/jurisdictions', label: 'Jurisdictions', icon: Database },
  { href: '/admin/dashboard-editor', label: 'Dashboard Editor', icon: LayoutDashboard },
  { href: '/admin/application-statuses', label: 'Application Status Manager', icon: ClipboardList },
  { href: '/admin/wallets', label: 'Wallet Management', icon: WalletCards },
  { href: '/admin/announcements', label: 'Announcements', icon: Bell },
  { href: '/admin/import-export', label: 'Imports & Exports', icon: FileClock },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { href: '/admin/users', label: 'Admin Users', icon: Users },
  { href: '/admin/settings', label: 'System Settings', icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2 py-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground'
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  children,
  admin,
}: {
  children: ReactNode;
  admin: { email: string; role: string; writesEnabled?: boolean; flags?: Record<AdminFeatureFlag, boolean> };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const enabledSections = [
    ['Catalogue', admin.flags?.ADMIN_CATALOG_WRITES_ENABLED],
    ['Dashboard', admin.flags?.ADMIN_DASHBOARD_WRITES_ENABLED],
    ['Statuses', admin.flags?.ADMIN_STATUS_WRITES_ENABLED],
    ['Partners', admin.flags?.ADMIN_PARTNER_WRITES_ENABLED],
    ['Pricing', admin.flags?.ADMIN_PRICING_WRITES_ENABLED],
    ['Documents', admin.flags?.ADMIN_DOCUMENT_WRITES_ENABLED],
    ['Jurisdictions', admin.flags?.ADMIN_JURISDICTION_WRITES_ENABLED],
    ['Services', admin.flags?.ADMIN_SERVICE_WRITES_ENABLED],
  ];
  const disabledSensitiveSections = [
    ['Support', admin.flags?.ADMIN_PARTNER_SUPPORT_ENABLED],
    ['On behalf', admin.flags?.ADMIN_APPLICATION_ON_BEHALF_ENABLED],
    ['Wallet', admin.flags?.ADMIN_WALLET_WRITES_ENABLED],
    ['Admin roles', admin.flags?.ADMIN_ADMIN_USER_WRITES_ENABLED],
  ];

  return (
    <div className="min-h-screen bg-vvisa-surface-2 text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-vvisa-border-subtle bg-vvisa-surface md:block">
        <div className="flex h-16 items-center gap-3 border-b border-vvisa-border-subtle px-4">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Admin Console</p>
            <p className="truncate text-xs text-vvisa-text-muted">VVisa B2B operations</p>
          </div>
        </div>
        <NavLinks />
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-vvisa-border-subtle bg-[var(--vvisa-backdrop)] px-4 backdrop-blur-xl lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-vvisa-border-subtle bg-vvisa-surface p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <NavLinks onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-semibold">Admin Console</h1>
                <Badge className="rounded-md bg-red-600 text-white hover:bg-red-600">Production</Badge>
                <Badge variant="outline" className="rounded-md">Global Writes: {admin.writesEnabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
              <p className="truncate text-xs text-vvisa-text-muted">{admin.email} · {admin.role.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden w-72 items-center gap-2 rounded-md border border-vvisa-border-subtle bg-vvisa-surface px-3 md:flex">
              <Search className="size-4 text-vvisa-text-muted" />
              <Input className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" placeholder="Search UID, application, country" />
            </div>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Theme">
              <Moon className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              <LogOut className="mr-2 size-4" />
              Exit Admin
            </Button>
          </div>
        </header>
        <section className="border-b border-vvisa-border-subtle bg-vvisa-surface px-4 py-3 lg:px-6">
          <div className="flex flex-wrap gap-2 text-xs">
            {enabledSections.map(([label, enabled]) => (
              <Badge key={String(label)} variant={enabled ? 'default' : 'outline'} className="rounded-md">
                {label}: {enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            ))}
            {disabledSensitiveSections.map(([label, enabled]) => (
              <Badge key={String(label)} variant={enabled ? 'destructive' : 'outline'} className="rounded-md">
                {label}: {enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            ))}
          </div>
        </section>
        <main className="mx-auto max-w-[1440px] px-4 py-5 lg:px-6">
          {children}
        </main>
      </div>
      <Separator className="hidden" />
    </div>
  );
}
