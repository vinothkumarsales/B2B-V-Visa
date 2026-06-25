'use client';

import { useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockApplications, mockTransactions, mockVisaTypes } from '@/lib/mock-data';

// Eager imports for critical paths
import LandingView from '@/views/LandingView';
import LoginView from '@/views/LoginView';
import SignupView from '@/views/SignupView';
import DashboardShell from '@/components/dashboard/DashboardShell';

// Lazy imports for dashboard views (code splitting)
const DashboardView = lazy(() => import('@/views/DashboardView'));
const ExploreView = lazy(() => import('@/views/ExploreView'));
const ApplyView = lazy(() => import('@/views/ApplyView'));
const ApplicationsView = lazy(() => import('@/views/ApplicationsView'));
const ApplicationDetailView = lazy(() => import('@/views/ApplicationDetailView'));
const WalletView = lazy(() => import('@/views/WalletView'));
const ProfileView = lazy(() => import('@/views/ProfileView'));
const AllianceView = lazy(() => import('@/views/AllianceView'));
const OverstayView = lazy(() => import('@/views/OverstayView'));
const ChangePasswordView = lazy(() => import('@/views/ChangePasswordView'));

function DashboardContent() {
  const currentView = useAppStore((s) => s.currentView);

  const viewMap: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    explore: <ExploreView />,
    apply: <ApplyView />,
    applications: <ApplicationsView />,
    'application-detail': <ApplicationDetailView />,
    wallet: <WalletView />,
    profile: <ProfileView />,
    alliance: <AllianceView />,
    overstay: <OverstayView />,
    'change-password': <ChangePasswordView />,
  };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-vvisa-text-muted text-sm">Loading...</span>
          </div>
        </div>
      }
    >
      {viewMap[currentView] || <DashboardView />}
    </Suspense>
  );
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
} as const;

export default function Home() {
  const currentView = useAppStore((s) => s.currentView);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setApplications = useAppStore((s) => s.setApplications);
  const setTransactions = useAppStore((s) => s.setTransactions);
  const setWalletBalance = useAppStore((s) => s.setWalletBalance);

  // Initialize mock data on mount
  useEffect(() => {
    setApplications(mockApplications);
    setTransactions(mockTransactions);
    setWalletBalance(28040);
  }, [setApplications, setTransactions, setWalletBalance]);

  // Auth pages (outside dashboard shell)
  if (currentView === 'login') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="login" {...pageTransition}>
          <LoginView />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (currentView === 'signup') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="signup" {...pageTransition}>
          <SignupView />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Landing page (default, not authenticated)
  if (!isAuthenticated || currentView === 'landing') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="landing" {...pageTransition}>
          <LandingView />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Dashboard pages (authenticated, wrapped in shell)
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-screen"
      >
        <DashboardShell>
          <DashboardContent />
        </DashboardShell>
      </motion.div>
    </AnimatePresence>
  );
}
