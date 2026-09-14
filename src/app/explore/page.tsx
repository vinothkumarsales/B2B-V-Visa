import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ExploreView from '@/views/ExploreView';

export default function ExplorePage() {
  return (
    <RouteScreen view="explore" authenticated>
      <DashboardShell>
        <ExploreView />
      </DashboardShell>
    </RouteScreen>
  );
}
