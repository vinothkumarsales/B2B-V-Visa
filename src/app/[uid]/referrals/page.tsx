import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ReferralsView from '@/views/ReferralsView';

export default async function PartnerUidReferralsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="referrals">
      <ReferralsView />
    </PartnerUidRoute>
  );
}
