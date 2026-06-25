import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ChangePasswordView from '@/views/ChangePasswordView';

export default function ChangePasswordPage() {
  return (
    <RouteScreen view="change-password" authenticated>
      <DashboardShell>
        <ChangePasswordView />
      </DashboardShell>
    </RouteScreen>
  );
}
