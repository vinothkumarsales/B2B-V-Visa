import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ComingSoonView from '@/views/ComingSoonView';

export default function CommunityPage() {
  return (
    <RouteScreen view="community" authenticated>
      <DashboardShell>
        <ComingSoonView
          type="community"
          badge="Coming Soon"
          title="V-Visa Partner Community"
          subtitle="Connect with certified travel consultants, share ground intelligence on visa updates, and collaborate across international destinations."
        />
      </DashboardShell>
    </RouteScreen>
  );
}
