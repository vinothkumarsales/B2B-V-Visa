import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import AllianceView from '@/views/AllianceView';

export default function AlliancePage() {
  return (
    <RouteScreen view="alliance" authenticated>
      <DashboardShell>
        <AllianceView />
      </DashboardShell>
    </RouteScreen>
  );
}
