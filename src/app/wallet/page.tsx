import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import WalletView from '@/views/WalletView';

export default function WalletPage() {
  return (
    <RouteScreen view="wallet" authenticated>
      <DashboardShell>
        <WalletView />
      </DashboardShell>
    </RouteScreen>
  );
}
