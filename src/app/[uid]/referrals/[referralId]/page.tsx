import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ReferralDetailView from '@/views/ReferralDetailView';

export default async function PartnerUidReferralDetailPage({
  params,
}: {
  params: Promise<{ uid: string; referralId: string }>;
}) {
  const { uid, referralId } = await params;
  return (
    <PartnerUidRoute uid={uid} view="referrals">
      <ReferralDetailView referralId={referralId} />
    </PartnerUidRoute>
  );
}
