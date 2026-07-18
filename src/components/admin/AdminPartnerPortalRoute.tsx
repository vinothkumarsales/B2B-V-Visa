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
      <DashboardShell basePath={`/admin/${uid}`}>{children}</DashboardShell>
    </RouteScreen>
  );
}
