import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import ProfileView from '@/views/ProfileView';

export default async function AdminUidProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="profile">
      <ProfileView />
    </AdminPartnerPortalRoute>
  );
}
