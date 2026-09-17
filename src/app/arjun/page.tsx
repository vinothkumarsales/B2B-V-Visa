import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import ArjunChatView from '@/views/ArjunChatView';

export default function ArjunPage() {
  return (
    <RouteScreen view="clarify" authenticated>
      <DashboardShell>
        <ArjunChatView />
      </DashboardShell>
    </RouteScreen>
  );
}
