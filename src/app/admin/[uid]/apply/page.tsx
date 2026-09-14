import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import ApplyView from '@/views/ApplyView';

export default async function AdminUidApplyPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="apply">
      <ApplyView />
    </AdminPartnerPortalRoute>
  );
}
