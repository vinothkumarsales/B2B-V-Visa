import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import { AdminWalletAdjuster } from '@/components/admin/AdminWalletAdjuster';
import WalletView from '@/views/WalletView';

export default async function AdminUidWalletPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="wallet">
      <div className="p-4 md:p-6 pb-24 md:pb-8">
        <AdminWalletAdjuster uid={uid} />
        <WalletView />
      </div>
    </AdminPartnerPortalRoute>
  );
}
