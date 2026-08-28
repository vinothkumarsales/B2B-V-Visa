import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import ChangePasswordView from '@/views/ChangePasswordView';

export default async function AdminUidChangePasswordPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="change-password">
      <ChangePasswordView />
    </AdminPartnerPortalRoute>
  );
}
