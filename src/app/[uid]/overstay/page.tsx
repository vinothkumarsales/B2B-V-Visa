import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import OverstayView from '@/views/OverstayView';

export default async function PartnerUidOverstayPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="overstay">
      <OverstayView />
    </PartnerUidRoute>
  );
}
