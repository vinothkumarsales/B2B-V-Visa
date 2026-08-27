import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import AllianceView from '@/views/AllianceView';

export default async function AdminUidAlliancePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="alliance">
      <AllianceView />
    </AdminPartnerPortalRoute>
  );
}
