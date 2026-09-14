import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import MarketplaceView from '@/views/MarketplaceView';

export default async function PartnerUidMarketplacePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="partner-marketplace">
      <MarketplaceView />
    </PartnerUidRoute>
  );
}
