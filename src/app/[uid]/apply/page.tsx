import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ApplyView from '@/views/ApplyView';

export default async function PartnerUidApplyPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="apply">
      <ApplyView />
    </PartnerUidRoute>
  );
}
