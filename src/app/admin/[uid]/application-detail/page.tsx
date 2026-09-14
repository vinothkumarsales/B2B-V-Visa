import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import ApplicationDetailView from '@/views/ApplicationDetailView';

export default async function AdminUidApplicationDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="application-detail">
      <ApplicationDetailView />
    </AdminPartnerPortalRoute>
  );
}
