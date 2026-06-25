import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import DashboardView from '@/views/DashboardView';

export default function DashboardPage() {
  return (
    <RouteScreen view="dashboard" authenticated>
      <DashboardShell>
        <DashboardView />
      </DashboardShell>
    </RouteScreen>
  );
}
