import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ApplicationDetailView from '@/views/ApplicationDetailView';

export default async function PartnerUidApplicationDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="application-detail">
      <ApplicationDetailView />
    </PartnerUidRoute>
  );
}
