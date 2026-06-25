'use client';

import { useEffect, type ReactNode } from 'react';
import { useAppStore } from '@/store/app.store';
import { mockApplications, mockTransactions } from '@/lib/mock-data';
import { demoAgency } from '@/lib/demo-data';
import type { ViewRoute } from '@/types';

export function RouteScreen({
  view,
  authenticated = false,
  children,
}: {
  view: ViewRoute;
  authenticated?: boolean;
  children: ReactNode;
}) {
  const setApplications = useAppStore((s) => s.setApplications);
  const setTransactions = useAppStore((s) => s.setTransactions);
  const setWalletBalance = useAppStore((s) => s.setWalletBalance);
  const login = useAppStore((s) => s.login);
  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    setApplications(mockApplications);
    setTransactions(mockTransactions);
    setWalletBalance(28040);
    if (authenticated) login(demoAgency);
    navigate(view);
  }, [authenticated, login, navigate, setApplications, setTransactions, setWalletBalance, view]);

  return <>{children}</>;
}
