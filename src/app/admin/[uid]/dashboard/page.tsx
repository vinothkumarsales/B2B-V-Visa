import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import DashboardView from '@/views/DashboardView';

export default async function AdminUidDashboardPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="dashboard">
      <DashboardView />
    </AdminPartnerPortalRoute>
  );
}
