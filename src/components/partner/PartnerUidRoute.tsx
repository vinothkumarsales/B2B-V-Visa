import { notFound, redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import { resolvePartnerUidAccess } from '@/server/partner/uid-access';
import type { ViewRoute } from '@/types';

export async function PartnerUidRoute({
  uid,
  view,
  children,
}: {
  uid: string;
  view: ViewRoute;
  children: React.ReactNode;
}) {
  const access = await resolvePartnerUidAccess(uid);

  if (access.status === 'unauthenticated') redirect('/login');
  if (access.status === 'not_found') notFound();
  if (access.status === 'admin') redirect(`/admin/${uid}`);
  if (access.status === 'forbidden') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vvisa-bg p-6">
        <div className="max-w-md rounded-xl border border-vvisa-border-subtle bg-vvisa-surface p-6 text-center shadow-[var(--vvisa-shadow-md)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-500">403</p>
          <h1 className="mt-2 text-xl font-semibold text-foreground">You cannot access this partner account.</h1>
          <p className="mt-2 text-sm text-vvisa-text-secondary">
            Please open your own partner URL or ask an admin to start an audited support session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RouteScreen view={view} authenticated>
      <DashboardShell>{children}</DashboardShell>
    </RouteScreen>
  );
}
