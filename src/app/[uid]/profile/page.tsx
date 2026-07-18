import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ProfileView from '@/views/ProfileView';

export default async function PartnerUidProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="profile">
      <ProfileView />
    </PartnerUidRoute>
  );
}
