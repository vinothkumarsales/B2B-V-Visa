import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import WalletView from '@/views/WalletView';

export default async function PartnerUidWalletPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="wallet">
      <WalletView />
    </PartnerUidRoute>
  );
}
