import { create } from 'zustand';
import type { ViewRoute, Agency, VisaApplication, WalletTransaction, VisaType, DashboardStats, AllianceLink, OverstayCase } from '@/types';

interface AppState {
  // Navigation
  currentView: ViewRoute;
  previousView: ViewRoute | null;
  navigate: (view: ViewRoute) => void;
  goBack: () => void;

  // Auth
  isAuthenticated: boolean;
  agency: Agency | null;
  login: (agency: Agency) => void;
  logout: () => void;

  // Selected visa/application context
  selectedVisaType: VisaType | null;
  setSelectedVisaType: (visa: VisaType | null) => void;
  selectedApplicationId: string | null;
  setSelectedApplicationId: (id: string | null) => void;

  // Applications
  applications: VisaApplication[];
  setApplications: (apps: VisaApplication[]) => void;

  // Wallet
  walletBalance: number;
  transactions: WalletTransaction[];
  setWalletBalance: (balance: number) => void;
  setTransactions: (txns: WalletTransaction[]) => void;

  // Stats
  stats: DashboardStats;
  setStats: (stats: DashboardStats) => void;

  // Alliance
  allianceLinks: AllianceLink[];
  setAllianceLinks: (links: AllianceLink[]) => void;

  // Overstay
  overstayCases: OverstayCase[];
  setOverstayCases: (cases: OverstayCase[]) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'landing',
  previousView: null,
  navigate: (view) => set({ previousView: get().currentView, currentView: view }),
  goBack: () => {
    const prev = get().previousView;
    if (prev) set({ currentView: prev, previousView: null });
  },

  // Auth
  isAuthenticated: false,
  agency: null,
  login: (agency) => set({ isAuthenticated: true, agency, currentView: 'dashboard', previousView: null }),
  logout: () => set({ isAuthenticated: false, agency: null, currentView: 'landing', previousView: null }),

  // Selected visa
  selectedVisaType: null,
  setSelectedVisaType: (visa) => set({ selectedVisaType: visa }),
  selectedApplicationId: null,
  setSelectedApplicationId: (id) => set({ selectedApplicationId: id }),

  // Applications
  applications: [],
  setApplications: (apps) => set({ applications: apps }),

  // Wallet
  walletBalance: 28040,
  transactions: [],
  setWalletBalance: (balance) => set({ walletBalance: balance }),
  setTransactions: (txns) => set({ transactions: txns }),

  // Stats
  stats: { totalApplications: 47, approvedThisMonth: 25, walletBalance: 28040, pendingPayment: 2 },
  setStats: (stats) => set({ stats }),

  // Alliance
  allianceLinks: [],
  setAllianceLinks: (links) => set({ allianceLinks: links }),

  // Overstay
  overstayCases: [],
  setOverstayCases: (cases) => set({ overstayCases: cases }),

  // Sidebar
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));