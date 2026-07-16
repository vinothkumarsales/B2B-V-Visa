'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  Zap,
  Wallet,
  LayoutDashboard,
  Archive,
  FileText,
  Lock,
  LogOut,
  Menu,
  Bell,
  HelpCircle,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SalesIqChatButton } from '@/components/SalesIqChatButton';
import type { ViewRoute } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  route: ViewRoute;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  badge?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function SidebarNav({
  items,
  activeRoute,
  onNavigate,
  collapsed,
}: {
  items: NavItem[];
  activeRoute: ViewRoute;
  onNavigate: (route: ViewRoute) => void;
  collapsed: boolean;
}) {
  return (
    <nav className="mt-2 flex flex-col gap-1.5 px-2">
      {items.map((item) => {
        const isActive = activeRoute === item.route;
        const Icon = item.icon;

        if (item.danger) {
          return (
            <button
              key={item.label}
              onClick={() => item.route && onNavigate(item.route)}
              className={`flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10 ${
                collapsed ? 'justify-center' : ''
              }`}
              disabled={item.disabled}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        }

        if (item.disabled) {
          return (
            <div
              key={item.label}
              className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-vvisa-text-muted opacity-60 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </div>
          );
        }

        const navButton = (
          <button
            key={item.label}
            onClick={() => onNavigate(item.route)}
            aria-label={collapsed ? item.label : undefined}
            className={`vv-interactive flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive
                ? 'bg-primary/10 font-semibold text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_26%,transparent)]'
                : 'text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground'
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="vv-tabular text-[11px] font-medium text-vvisa-text-muted">
                {item.badge}
              </span>
            )}
            {!collapsed && isActive && (
              <ChevronRight className="size-3.5 shrink-0 text-primary" />
            )}
          </button>
        );

        if (!collapsed) return navButton;

        return (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>{navButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  onNavigate,
  activeRoute,
  collapsed,
  onLogout,
  onToggleCollapse,
}: {
  onNavigate: (route: ViewRoute) => void;
  activeRoute: ViewRoute;
  collapsed: boolean;
  onLogout: () => void;
  onToggleCollapse?: () => void;
}) {
  const agency = useAppStore((s) => s.agency);
  const walletBalance = useAppStore((s) => s.walletBalance);

  const initials = agency ? getInitials(agency.name) : 'AG';

  const navItems: NavItem[] = [
    { label: 'Profile', icon: User, route: 'profile' },
    { label: 'Alliance Dashboard', icon: LayoutDashboard, route: 'alliance' },
    { label: 'Dashboard', icon: LayoutDashboard, route: 'dashboard' as ViewRoute },
    { label: 'Applications', icon: Archive, route: 'applications' as ViewRoute },
    { label: 'Wallet', icon: Wallet, route: 'wallet', badge: `INR ${walletBalance.toLocaleString('en-IN')}` },
    { label: 'Overstay', icon: FileText, route: 'overstay' },
    { label: 'Change Password', icon: Lock, route: 'change-password' },
    { label: 'Sign Out', icon: LogOut, route: 'landing' as ViewRoute, danger: true },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className={`p-4 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
          <Avatar className="size-10 shrink-0 bg-primary shadow-[var(--vvisa-shadow-sm)]">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {agency?.name ?? 'Agency'}
              </p>
              <p className="truncate text-xs text-vvisa-text-muted">
                {agency?.email ?? 'email@agency.com'}
              </p>
            </div>
          )}
        </div>
      </div>

      {onToggleCollapse && (
        <div className="px-3 pb-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`flex h-9 w-full items-center justify-center rounded-lg border border-vvisa-border-subtle bg-vvisa-surface text-vvisa-text-secondary transition-colors hover:bg-vvisa-surface-2 hover:text-foreground ${
                  collapsed ? 'px-0' : 'gap-2 px-3 text-xs font-medium'
                }`}
                aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              >
                {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                {!collapsed && <span>Collapse</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? 'Expand navigation' : 'Collapse navigation'}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="mb-3 px-4">
        <Button
          onClick={() => onNavigate('explore')}
          className={`cursor-pointer font-semibold ${
            collapsed ? 'flex h-10 w-10 items-center justify-center p-0' : 'h-10 w-full'
          }`}
        >
          {collapsed ? <Zap className="size-4" aria-label="Explore Visas" /> : 'Explore Visas'}
        </Button>
      </div>

      <Separator className="mx-4 bg-vvisa-border-subtle" />

      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav
          items={navItems.filter((i) => !i.danger)}
          activeRoute={activeRoute}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </div>

      <Separator className="mx-4 bg-vvisa-border-subtle" />
      <div className="p-2 pb-4">
        <button
          onClick={onLogout}
          className={`flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

function SupportPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hidden cursor-pointer items-center gap-1.5 text-xs text-vvisa-text-muted transition-colors hover:text-vvisa-text-secondary sm:flex">
          <HelpCircle className="size-3.5" />
          <span>Need help?</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 rounded-xl border-vvisa-border-subtle bg-vvisa-surface p-4 shadow-[var(--vvisa-shadow-lg)]"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Need help?</p>
            <p className="mt-1 text-xs leading-5 text-vvisa-text-muted">
              For any assistance, please reach out to:
            </p>
          </div>
          <div className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-vvisa-text-muted">
              Your Account Manager
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">Vinoth Kumar</p>
            <div className="mt-3 space-y-2">
              <a
                href="tel:+918610648309"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-vvisa-text-secondary transition-colors hover:bg-vvisa-surface hover:text-foreground"
              >
                <Phone className="size-4 text-primary" />
                <span>
                  <span className="block text-[11px] text-vvisa-text-muted">Phone</span>
                  86106 48309
                </span>
              </a>
              <a
                href="mailto:support@vvisa.in"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-vvisa-text-secondary transition-colors hover:bg-vvisa-surface hover:text-foreground"
              >
                <Mail className="size-4 text-primary" />
                <span>
                  <span className="block text-[11px] text-vvisa-text-muted">Email</span>
                  support@vvisa.in
                </span>
              </a>
              <SalesIqChatButton />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const routeToPath: Record<string, string> = {
  dashboard: '/dashboard',
  explore: '/explore',
  apply: '/apply',
  applications: '/applications',
  'application-detail': '/application-detail',
  wallet: '/wallet',
  alliance: '/alliance',
  overstay: '/overstay',
  profile: '/profile',
  'change-password': '/change-password',
};

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const currentView = useAppStore((s) => s.currentView);
  const agency = useAppStore((s) => s.agency);
  const walletBalance = useAppStore((s) => s.walletBalance);
  const selectedVisaType = useAppStore((s) => s.selectedVisaType);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAppStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [sidebarPreference, setSidebarPreference] = useState<'expanded' | 'collapsed' | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem('vvisa:sidebarPreference');
    return saved === 'expanded' || saved === 'collapsed' ? saved : null;
  });
  const [workflowDetailActive, setWorkflowDetailActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('vvisa:workflowDetailActive') === 'true';
  });

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then((response) => {
        if (active) setHasAdminAccess(response.ok);
      })
      .catch(() => {
        if (active) setHasAdminAccess(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onWorkflowDetailChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setWorkflowDetailActive(Boolean(customEvent.detail));
    };

    window.addEventListener('vvisa:workflow-detail-change', onWorkflowDetailChange);
    return () => window.removeEventListener('vvisa:workflow-detail-change', onWorkflowDetailChange);
  }, []);

  const handleNavigate = (route: ViewRoute) => {
    if (route === 'landing') {
      logout();
      router.push('/');
    } else {
      navigate(route);
      router.push(routeToPath[route] ?? '/dashboard');
    }
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
    setMobileOpen(false);
  };

  const initials = agency ? getInitials(agency.name) : 'AG';

  const pageTitle: Record<string, string> = {
    dashboard: 'Dashboard',
    explore: 'Explore Visas',
    apply: 'Apply for Visa',
    applications: 'Applications',
    'application-detail': 'Application Details',
    wallet: 'Wallet',
    alliance: 'Alliance Dashboard',
    overstay: 'Overstay Cases',
    profile: 'Agency Profile',
    'change-password': 'Change Password',
  };

  const title = pageTitle[currentView] ?? 'Dashboard';
  const workflowRoutes: ViewRoute[] = ['apply', 'application-detail'];
  const shouldAutoCollapse = workflowRoutes.includes(currentView) || Boolean(currentView === 'explore' && (selectedVisaType || workflowDetailActive));
  const sidebarCollapsed = sidebarPreference ? sidebarPreference === 'collapsed' : shouldAutoCollapse;

  const handleToggleSidebar = () => {
    const next = sidebarCollapsed ? 'expanded' : 'collapsed';
    setSidebarPreference(next);
    sessionStorage.setItem('vvisa:sidebarPreference', next);
  };

  return (
    <div className="vv-page flex min-h-screen">
      <aside className={`hidden shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/95 shadow-[var(--vvisa-shadow-sm)] transition-[width] duration-200 md:flex ${
        sidebarCollapsed ? 'w-16' : 'w-60 lg:w-60'
      }`}>
        <SidebarContent
          onNavigate={handleNavigate}
          activeRoute={currentView}
          collapsed={sidebarCollapsed}
          onLogout={handleLogout}
          onToggleCollapse={handleToggleSidebar}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-vvisa-border-subtle bg-[var(--vvisa-backdrop)] px-4 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground md:hidden"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 border-sidebar-border bg-sidebar p-0"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SidebarContent
                  onNavigate={handleNavigate}
                  activeRoute={currentView}
                  collapsed={false}
                  onLogout={handleLogout}
                />
              </SheetContent>
            </Sheet>

            <div>
              <p className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-vvisa-text-muted sm:block">
                VVisa B2B
              </p>
              <h1 className="text-base font-semibold leading-tight text-foreground">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAdminAccess && (
              <Button variant="outline" size="sm" onClick={() => router.push('/admin')}>
                <ShieldCheck className="mr-2 size-4" />
                Admin
              </Button>
            )}
            <ThemeToggle />
            <SupportPopover />

            <div className="hidden items-center gap-1.5 rounded-full border border-vvisa-border-subtle bg-vvisa-surface px-3 py-2 shadow-[var(--vvisa-shadow-sm)] sm:flex">
              <Wallet className="size-3.5 text-vvisa-text-muted" />
              <span className="vv-tabular text-xs font-semibold text-foreground">
                {formatCurrency(walletBalance)}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="relative cursor-pointer text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2">
                  <Avatar className="size-9 bg-primary shadow-[var(--vvisa-shadow-sm)]">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 border-vvisa-border-subtle bg-vvisa-surface shadow-[var(--vvisa-shadow-md)]"
              >
                <DropdownMenuLabel className="text-xs font-normal text-vvisa-text-muted">
                  {agency?.email ?? 'email@agency.com'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-vvisa-border-subtle" />
                <DropdownMenuItem
                  onClick={() => handleNavigate('profile')}
                  className="cursor-pointer text-sm text-vvisa-text-secondary focus:bg-vvisa-surface-2 focus:text-foreground"
                >
                  <User className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavigate('wallet')}
                  className="cursor-pointer text-sm text-vvisa-text-secondary focus:bg-vvisa-surface-2 focus:text-foreground"
                >
                  <Wallet className="mr-2 size-4" />
                  Wallet
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavigate('change-password')}
                  className="cursor-pointer text-sm text-vvisa-text-secondary focus:bg-vvisa-surface-2 focus:text-foreground"
                >
                  <Lock className="mr-2 size-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-vvisa-border-subtle" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-sm text-red-500 focus:bg-red-500/10 focus:text-red-500"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="p-4 sm:p-5 lg:p-7"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
