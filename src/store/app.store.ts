import { create } from 'zustand';
import type { ViewRoute, Agency, VisaApplication, WalletTransaction, VisaType, DashboardStats, AllianceLink, OverstayCase, Traveler } from '@/types';

const CLIENT_ID = 'enKOdaUD6df8RHXgzoP723VOvHA2';
const CLIENT_PREFIX = CLIENT_ID.slice(0, 5); // "enKOd"

// Counter for unique transaction IDs within this session
let _submissionCounter = 0;

/** Generate a unique transaction ID derived from the client ID.
 *  Format: {CLIENT_PREFIX}-APP-{timestamp_hex}-{counter_hex}
 *  Example: enKOd-APP-678abc12-0001
 */
export function generateTransactionId(): string {
  _submissionCounter += 1;
  const ts = Date.now().toString(16).slice(-8);       // last 8 hex chars of epoch ms
  const seq = _submissionCounter.toString(16).padStart(4, '0'); // 4-digit zero-padded hex
  return `${CLIENT_PREFIX}-APP-${ts}-${seq}`;
}

/** Generate a unique application ID for the new submission. */
export function generateApplicationId(): string {
  const ts = Date.now().toString(16).slice(-8);
  const seq = _submissionCounter.toString(16).padStart(4, '0');
  return `app-${ts}-${seq}`;
}

interface SubmitApplicationPayload {
  internalId: string;
  groupName: string;
  destination: string;
  visaType: string;
  visaCategory: string;
  travelDate?: string;
  returnDate?: string;
  totalPrice: number;
  travelers: Traveler[];
}

interface SubmitResult {
  success: boolean;
  transactionId: string;
  applicationId: string;
  error?: string;
}

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
  clearUserScopedState: () => void;

  // Selected visa/application context
  selectedVisaType: VisaType | null;
  setSelectedVisaType: (visa: VisaType | null) => void;
  selectedApplicationId: string | null;
  setSelectedApplicationId: (id: string | null) => void;

  // Applications
  applications: VisaApplication[];
  setApplications: (apps: VisaApplication[]) => void;

  // Submit application
  submitApplication: (payload: SubmitApplicationPayload) => SubmitResult;

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
  logout: () => get().clearUserScopedState(),
  clearUserScopedState: () => set({
    isAuthenticated: false,
    agency: null,
    currentView: 'login',
    previousView: null,
    selectedVisaType: null,
    selectedApplicationId: null,
    applications: [],
    walletBalance: 0,
    transactions: [],
    stats: { totalApplications: 0, approvedThisMonth: 0, walletBalance: 0, pendingPayment: 0 },
    allianceLinks: [],
    overstayCases: [],
  }),

  // Selected visa
  selectedVisaType: null,
  setSelectedVisaType: (visa) => set({ selectedVisaType: visa }),
  selectedApplicationId: null,
  setSelectedApplicationId: (id) => set({ selectedApplicationId: id }),

  // Applications
  applications: [],
  setApplications: (apps) => set({ applications: apps }),

  // Submit application — generates client-ID-based transaction ID, creates app + wallet txn
  submitApplication: (payload) => {
    const state = get();

    // Check wallet balance
    if (state.walletBalance < payload.totalPrice) {
      return { success: false, transactionId: '', applicationId: '', error: 'Insufficient wallet balance. Please add funds first.' };
    }

    // Validate at least one traveler has a passport number
    if (payload.travelers.length === 0 || !payload.travelers.some((t) => t.passportNumber.trim())) {
      return { success: false, transactionId: '', applicationId: '', error: 'At least one traveler must have a passport number.' };
    }

    const txnId = generateTransactionId();
    const appId = generateApplicationId();
    const now = new Date().toISOString();

    // Create new application
    const newApp: VisaApplication = {
      id: appId,
      agencyId: 'agency-001',
      groupId: payload.groupName ? `grp-${Date.now().toString(16).slice(-6)}` : undefined,
      internalId: payload.internalId || undefined,
      groupName: payload.groupName || undefined,
      destination: payload.destination,
      visaType: payload.visaType,
      visaCategory: payload.visaCategory as any,
      travelDate: payload.travelDate,
      returnDate: payload.returnDate,
      status: 'PAYMENT_PENDING',
      totalPrice: payload.totalPrice,
      travelers: payload.travelers.map((t) => ({
        ...t,
        isChild: false,
        status: 'PAYMENT_PENDING' as const,
      })),
      createdAt: now,
      updatedAt: now,
    };

    // Create wallet transaction
    const newTxn: WalletTransaction = {
      id: txnId,
      type: 'PAYMENT',
      amount: payload.totalPrice,
      method: 'WALLET',
      status: 'COMPLETED',
      description: `${payload.destination} Visa — ${payload.groupName || payload.travelers[0]?.firstName + ' ' + payload.travelers[0]?.lastName} (${payload.travelers.length} traveler${payload.travelers.length > 1 ? 's' : ''})`,
      createdAt: now,
    };

    // Update state
    const newBalance = state.walletBalance - payload.totalPrice;
    const newStats = { ...state.stats, totalApplications: state.stats.totalApplications + 1, pendingPayment: state.stats.pendingPayment + 1 };

    set({
      applications: [newApp, ...state.applications],
      walletBalance: newBalance,
      transactions: [newTxn, ...state.transactions],
      stats: newStats,
    });

    return { success: true, transactionId: txnId, applicationId: appId };
  },

  // Wallet
  walletBalance: 28040,
  transactions: [],
  setWalletBalance: (balance) => set({ walletBalance: balance }),
  setTransactions: (txns) => set({ transactions: txns }),

  // Stats
  stats: { totalApplications: 12, approvedThisMonth: 6, walletBalance: 28040, pendingPayment: 2 },
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
