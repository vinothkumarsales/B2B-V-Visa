import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import AllianceView from '@/views/AllianceView';

export default async function PartnerUidAlliancePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="alliance">
      <AllianceView />
    </PartnerUidRoute>
  );
}
