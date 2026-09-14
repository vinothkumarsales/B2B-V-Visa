import DashboardShell from '@/components/dashboard/DashboardShell';
import { RouteScreen } from '@/components/RouteScreen';
import MarketplaceView from '@/views/MarketplaceView';

export default function PartnerMarketplacePage() {
  return (
    <RouteScreen view="partner-marketplace" authenticated>
      <DashboardShell>
        <MarketplaceView />
      </DashboardShell>
    </RouteScreen>
  );
}
