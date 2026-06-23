'use client';

import { useState, useEffect, type ReactNode } from 'react';
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
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
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
    <nav className="flex flex-col gap-1 px-2 mt-2">
      {items.map((item) => {
        const isActive = activeRoute === item.route;
        const Icon = item.icon;

        if (item.danger) {
          return (
            <button
              key={item.label}
              onClick={() => item.route && onNavigate(item.route)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer w-full text-left
                ${collapsed ? 'justify-center' : ''}
                text-red-400 hover:bg-red-950/30
              `}
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-vvisa-text-muted cursor-not-allowed opacity-60
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </div>
          );
        }

        return (
          <button
            key={item.label}
            onClick={() => onNavigate(item.route)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer w-full text-left
              ${collapsed ? 'justify-center' : ''}
              ${isActive
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground'
              }
            `}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && (
              <span className="flex-1 text-left">{item.label}</span>
            )}
            {!collapsed && item.badge && (
              <span className="text-xs text-vvisa-text-muted">{item.badge}</span>
            )}
            {!collapsed && isActive && <ChevronRight className="size-3.5 shrink-0 text-primary" />}
          </button>
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
}: {
  onNavigate: (route: ViewRoute) => void;
  activeRoute: ViewRoute;
  collapsed: boolean;
  onLogout: () => void;
}) {
  const agency = useAppStore((s) => s.agency);
  const walletBalance = useAppStore((s) => s.walletBalance);

  const initials = agency ? getInitials(agency.name) : 'AG';

  const navItems: NavItem[] = [
    { label: 'Profile', icon: User, route: 'profile' },
    { label: 'Alliance Dashboard', icon: LayoutDashboard, route: 'alliance' },
    { label: 'Dashboard', icon: LayoutDashboard, route: 'dashboard' as ViewRoute },
    { label: 'Applications', icon: Archive, route: 'applications' as ViewRoute },
    { label: 'Wallet', icon: Wallet, route: 'wallet', badge: `₹${walletBalance.toLocaleString('en-IN')}` },
    { label: 'Overstay', icon: FileText, route: 'overstay' },
    { label: 'Change Password', icon: Lock, route: 'change-password' },
    { label: 'Sign Out', icon: LogOut, route: 'landing' as ViewRoute, danger: true },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Agency Info */}
      <div className={`p-4 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
          <Avatar className="size-9 shrink-0 bg-primary">
            <AvatarFallback className="bg-primary text-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {agency?.name ?? 'Agency'}
              </p>
              <p className="text-xs text-vvisa-text-muted truncate">
                {agency?.email ?? 'email@agency.com'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Explore Visas Button */}
      <div className={`px-4 mb-2 ${collapsed ? '' : ''}`}>
        <Button
          onClick={() => onNavigate('explore')}
          className={`bg-primary hover:bg-indigo-500 text-foreground font-medium transition-colors cursor-pointer
            ${collapsed ? 'w-10 h-10 p-0 flex items-center justify-center' : 'w-full h-10'}
          `}
        >
          {collapsed ? <Zap className="size-4" /> : 'Explore Visas'}
        </Button>
      </div>

      <Separator className="bg-vvisa-border mx-4" />

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-2">
        <SidebarNav
          items={navItems.filter((i) => !i.danger)}
          activeRoute={activeRoute}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </div>

      {/* Sign Out at bottom */}
      <Separator className="bg-vvisa-border mx-4" />
      <div className="p-2 pb-4">
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer w-full text-left
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

const CLIENT_ID = 'enKOdaUD6df8RHXgzoP723VOvHA2';

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
  const currentView = useAppStore((s) => s.currentView);
  const agency = useAppStore((s) => s.agency);
  const walletBalance = useAppStore((s) => s.walletBalance);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAppStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Update browser URL with view path + client ID
  useEffect(() => {
    const basePath = routeToPath[currentView] || '/dashboard';
    window.history.replaceState(null, '', `${basePath}/${CLIENT_ID}`);
  }, [currentView]);

  const handleNavigate = (route: ViewRoute) => {
    if (route === 'landing') {
      logout();
    } else {
      navigate(route);
    }
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
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

  return (
    <div className="min-h-screen flex bg-vvisa-bg">
      {/* Desktop Sidebar — full on lg+, collapsed on md */}
      <aside className="hidden md:flex flex-col w-60 lg:w-60 bg-sidebar border-r border-sidebar-border shrink-0">
        <SidebarContent
          onNavigate={handleNavigate}
          activeRoute={currentView}
          collapsed={false}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav */}
        <header className="h-14 border-b border-vvisa-border bg-background flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          {/* Left: Mobile hamburger + title */}
          <div className="flex items-center gap-3">
            {/* Mobile Sheet */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-vvisa-text-secondary hover:text-foreground hover:bg-vvisa-surface-2 cursor-pointer"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 bg-sidebar border-sidebar-border p-0"
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

            <h1 className="text-base font-semibold text-foreground">{title}</h1>
          </div>

          {/* Right: Theme Toggle, Help, Wallet, Notifications, Avatar */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Need help? */}
            <button className="hidden sm:flex items-center gap-1.5 text-xs text-vvisa-text-muted hover:text-vvisa-text-secondary transition-colors cursor-pointer">
              <HelpCircle className="size-3.5" />
              <span>Need help?</span>
            </button>

            {/* Wallet Chip */}
            <div className="hidden sm:flex items-center gap-1.5 bg-vvisa-surface-2 rounded-full px-3 py-1.5 border border-vvisa-border">
              <Wallet className="size-3.5 text-vvisa-text-muted" />
              <span className="text-xs font-medium text-foreground">
                {formatCurrency(walletBalance)}
              </span>
            </div>

            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-vvisa-text-secondary hover:text-foreground hover:bg-vvisa-surface-2 cursor-pointer"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </Button>

            {/* Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 cursor-pointer">
                  <Avatar className="size-8 bg-primary">
                    <AvatarFallback className="bg-primary text-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-vvisa-surface border-vvisa-border"
              >
                <DropdownMenuLabel className="text-xs text-vvisa-text-muted font-normal">
                  {agency?.email ?? 'email@agency.com'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-vvisa-border" />
                <DropdownMenuItem
                  onClick={() => handleNavigate('profile')}
                  className="text-sm text-vvisa-text-secondary focus:text-foreground focus:bg-vvisa-surface-2 cursor-pointer"
                >
                  <User className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavigate('wallet')}
                  className="text-sm text-vvisa-text-secondary focus:text-foreground focus:bg-vvisa-surface-2 cursor-pointer"
                >
                  <Wallet className="size-4 mr-2" />
                  Wallet
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavigate('change-password')}
                  className="text-sm text-vvisa-text-secondary focus:text-foreground focus:bg-vvisa-surface-2 cursor-pointer"
                >
                  <Lock className="size-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-vvisa-border" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-sm text-red-400 focus:text-red-400 focus:bg-red-950/30 cursor-pointer"
                >
                  <LogOut className="size-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 lg:p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}