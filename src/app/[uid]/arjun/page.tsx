import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ArjunChatView from '@/views/ArjunChatView';

export default async function PartnerUidArjunPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="clarify">
      <ArjunChatView />
    </PartnerUidRoute>
  );
}
