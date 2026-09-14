import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import ExploreView from '@/views/ExploreView';

export default async function AdminUidExplorePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="explore">
      <ExploreView />
    </AdminPartnerPortalRoute>
  );
}
