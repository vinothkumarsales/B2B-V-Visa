import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ProfileView from '@/views/ProfileView';

export default function ProfilePage() {
  return (
    <RouteScreen view="profile" authenticated>
      <DashboardShell>
        <ProfileView />
      </DashboardShell>
    </RouteScreen>
  );
}
