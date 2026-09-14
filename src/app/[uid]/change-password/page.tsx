import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ChangePasswordView from '@/views/ChangePasswordView';

export default async function PartnerUidChangePasswordPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="change-password">
      <ChangePasswordView />
    </PartnerUidRoute>
  );
}
