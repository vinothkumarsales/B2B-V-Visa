import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ApplyView from '@/views/ApplyView';

export default function ApplyPage() {
  return (
    <RouteScreen view="apply" authenticated>
      <DashboardShell>
        <ApplyView />
      </DashboardShell>
    </RouteScreen>
  );
}
