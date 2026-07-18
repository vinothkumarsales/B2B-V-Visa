import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import DashboardView from '@/views/DashboardView';

export default async function PartnerUidHomePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="dashboard">
      <DashboardView />
    </PartnerUidRoute>
  );
}
