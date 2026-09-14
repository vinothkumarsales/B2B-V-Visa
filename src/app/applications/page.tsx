import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ApplicationsView from '@/views/ApplicationsView';

export default function ApplicationsPage() {
  return (
    <RouteScreen view="applications" authenticated>
      <DashboardShell>
        <ApplicationsView />
      </DashboardShell>
    </RouteScreen>
  );
}
