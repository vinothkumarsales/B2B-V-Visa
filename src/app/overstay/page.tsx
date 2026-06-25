import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import OverstayView from '@/views/OverstayView';

export default function OverstayPage() {
  return (
    <RouteScreen view="overstay" authenticated>
      <DashboardShell>
        <OverstayView />
      </DashboardShell>
    </RouteScreen>
  );
}
