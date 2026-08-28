import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ExploreView from '@/views/ExploreView';

export default async function PartnerUidExplorePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="explore">
      <ExploreView />
    </PartnerUidRoute>
  );
}
