import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ReferralDetailView from '@/views/ReferralDetailView';

export default async function ReferralDetailPage({ params }: { params: Promise<{ referralId: string }> }) {
  const { referralId } = await params;
  return (
    <RouteScreen view="referrals" authenticated>
      <DashboardShell>
        <ReferralDetailView referralId={referralId} />
      </DashboardShell>
    </RouteScreen>
  );
}
