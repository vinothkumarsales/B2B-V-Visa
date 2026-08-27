import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import OverstayView from '@/views/OverstayView';

export default async function AdminUidOverstayPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="overstay">
      <OverstayView />
    </AdminPartnerPortalRoute>
  );
}
