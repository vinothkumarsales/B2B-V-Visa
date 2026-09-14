import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import ApplicationsView from '@/views/ApplicationsView';

export default async function AdminUidApplicationsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="applications">
      <ApplicationsView />
    </AdminPartnerPortalRoute>
  );
}
