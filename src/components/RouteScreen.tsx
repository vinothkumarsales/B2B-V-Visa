'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app.store';
import type { Agency, ApplicationStatus, ViewRoute, VisaApplication, WalletTransaction } from '@/types';

type ApiApplicant = {
  id: string;
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality?: string;
  sex?: string | null;
  dateOfBirth?: string | null;
};

type ApiApplication = {
  id: string;
  agencyId: string;
  internalId?: string | null;
  destination: string;
  visaType: string;
  status: ApplicationStatus;
  totalAmountMinor?: number;
  totalPrice?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  applicants?: ApiApplicant[];
  travelers?: VisaApplication['travelers'];
};

type ApiWalletEntry = {
  id: string;
  type: string;
  amountMinor?: number;
  amount?: number;
  description?: string | null;
  createdAt: string;
};

function toPortalAgency(agency: Partial<Agency> & { id: string; name: string; email: string }): Agency {
  return {
    id: agency.id,
    name: agency.name,
    email: agency.email,
    phone: agency.phone ?? '',
    country: agency.country ?? 'India',
    accountType: agency.accountType ?? 'b2b',
    gstNumber: agency.gstNumber,
    panCard: agency.panCard,
    addressLine1: agency.addressLine1,
    addressLine2: agency.addressLine2,
    city: agency.city,
    state: agency.state,
    zipCode: agency.zipCode,
    walletBalance: agency.walletBalance ?? 0,
  };
}

function toPortalApplication(application: ApiApplication): VisaApplication {
  const travelers = application.travelers ?? application.applicants?.map((applicant) => ({
    id: applicant.id,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    passportNumber: applicant.passportNumber,
    nationality: applicant.nationality ?? 'Indian',
    sex: applicant.sex ?? undefined,
    dateOfBirth: applicant.dateOfBirth ?? undefined,
    isChild: false,
    status: application.status,
  })) ?? [];

  return {
    id: application.id,
    agencyId: application.agencyId,
    internalId: application.internalId ?? undefined,
    groupName: travelers[0] ? `${travelers[0].firstName} ${travelers[0].lastName}` : undefined,
    destination: application.destination,
    visaType: application.visaType,
    status: application.status,
    totalPrice: application.totalPrice ?? (application.totalAmountMinor ?? 0) / 100,
    travelers,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function toPortalTransaction(entry: ApiWalletEntry): WalletTransaction {
  const amount = entry.amount ?? (entry.amountMinor ?? 0) / 100;
  return {
    id: entry.id,
    type: entry.type.includes('DEPOSIT') ? 'DEPOSIT' : entry.type.includes('REFUND') ? 'REFUND' : entry.type.includes('WITHDRAWAL') ? 'WITHDRAWAL' : 'PAYMENT',
    amount,
    status: 'COMPLETED',
    description: entry.description ?? entry.type.replaceAll('_', ' '),
    createdAt: entry.createdAt,
  };
}

export function RouteScreen({
  view,
  authenticated = false,
  children,
}: {
  view: ViewRoute;
  authenticated?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const agency = useAppStore((s) => s.agency);
  const setApplications = useAppStore((s) => s.setApplications);
  const setTransactions = useAppStore((s) => s.setTransactions);
  const setWalletBalance = useAppStore((s) => s.setWalletBalance);
  const setStats = useAppStore((s) => s.setStats);
  const login = useAppStore((s) => s.login);
  const clearUserScopedState = useAppStore((s) => s.clearUserScopedState);
  const navigate = useAppStore((s) => s.navigate);
  const [loading, setLoading] = useState(authenticated);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAuthenticatedRoute() {
      if (isAuthenticated && agency) {
        navigate(view);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch('/api/portal/bootstrap', { credentials: 'include', cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load account data');
        const payload = await response.json();
        if (!payload.agency) throw new Error('Partner profile required');
        if (cancelled) return;

        const applications = (payload.applications ?? []).map(toPortalApplication);
        const transactions = (payload.transactions ?? []).map(toPortalTransaction);
        const walletBalance = Number(payload.walletBalanceMinor ?? 0) / 100;

        login(toPortalAgency({ ...payload.agency, walletBalance }));
        setApplications(applications);
        setTransactions(transactions);
        setWalletBalance(walletBalance);
        setStats({
          totalApplications: applications.length,
          approvedThisMonth: applications.filter((app) => app.status === 'APPROVED').length,
          walletBalance,
          pendingPayment: applications.filter((app) => app.status === 'PAYMENT_PENDING').length,
        });
        navigate(view);
      } catch {
        if (!cancelled) {
          clearUserScopedState();
          router.replace('/login');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (authenticated) {
      hydrateAuthenticatedRoute();
    } else {
      navigate(view);
    }

    return () => {
      cancelled = true;
    };
  }, [agency, authenticated, clearUserScopedState, isAuthenticated, login, navigate, router, setApplications, setStats, setTransactions, setWalletBalance, view]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vvisa-bg text-sm text-vvisa-text-muted">
        Loading your account...
      </div>
    );
  }

  return <>{children}</>;
}
