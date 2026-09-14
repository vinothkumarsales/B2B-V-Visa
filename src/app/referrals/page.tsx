import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ReferralsView from '@/views/ReferralsView';

export default function ReferralsPage() {
  return (
    <RouteScreen view="referrals" authenticated>
      <DashboardShell>
        <ReferralsView />
      </DashboardShell>
    </RouteScreen>
  );
}
