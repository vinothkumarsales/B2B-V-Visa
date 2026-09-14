import { PartnerUidRoute } from '@/components/partner/PartnerUidRoute';
import ComingSoonView from '@/views/ComingSoonView';

export default async function PartnerUidClarifyPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  return (
    <PartnerUidRoute uid={uid} view="clarify">
      <ComingSoonView
        type="clarify"
        badge="Phase 3 Preview"
        title="Clarify AI Assistant"
        subtitle="Instant embassy rules lookup, document validation intelligence, and multi-country visa checklist recommendations powered by advanced AI."
      />
    </PartnerUidRoute>
  );
}
