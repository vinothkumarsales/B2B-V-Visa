import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ApplicationsView from '@/views/ApplicationsView';

export default async function PartnerUidApplicationsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="applications">
      <ApplicationsView />
    </PartnerUidRoute>
  );
}
