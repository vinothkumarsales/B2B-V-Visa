import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ApplicationDetailView from '@/views/ApplicationDetailView';

export default function ApplicationDetailPage() {
  return (
    <RouteScreen view="application-detail" authenticated>
      <DashboardShell>
        <ApplicationDetailView />
      </DashboardShell>
    </RouteScreen>
  );
}
