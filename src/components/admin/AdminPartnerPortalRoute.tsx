import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import { getAdminSession } from '@/server/admin/auth';
import { getPartnerAdminProfile } from '@/server/admin/data';
import type { ViewRoute } from '@/types';

export async function AdminPartnerPortalRoute({
  uid,
  view,
  children,
}: {
  uid: string;
  view: ViewRoute;
  children: React.ReactNode;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect('/login');
  if (!admin.permissions.includes('partner.read')) redirect('/admin');

  const partner = await getPartnerAdminProfile(uid);
  if (!partner) notFound();

  return (
    <RouteScreen view={view} authenticated bootstrapUrl={`/api/admin/partners/${uid}/portal-bootstrap`}>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Admin View Banner */}
        <div className="z-[100] flex items-center justify-between bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-md">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              ADMIN VIEW MODE
            </span>
            <span className="opacity-90">You are viewing: {partner.name}</span>
            <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px] tracking-wider">
              UID: {uid}
            </span>
          </div>
          <Link
            href="/admin/users"
            className="rounded border border-white/20 bg-black/10 px-2 py-1 transition-colors hover:bg-black/20 hover:text-white"
          >
            Exit Agent View
          </Link>
        </div>

        {/* Normal Agent Dashboard Shell */}
        <div className="flex-1 relative">
          <DashboardShell basePath={`/admin/${uid}`}>{children}</DashboardShell>
        </div>
      </div>
    </RouteScreen>
  );
}
