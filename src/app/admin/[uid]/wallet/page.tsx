import { AdminPartnerPortalRoute } from '@/components/admin/AdminPartnerPortalRoute';
import WalletView from '@/views/WalletView';

export default async function AdminUidWalletPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <AdminPartnerPortalRoute uid={uid} view="wallet">
      <WalletView />
    </AdminPartnerPortalRoute>
  );
}
