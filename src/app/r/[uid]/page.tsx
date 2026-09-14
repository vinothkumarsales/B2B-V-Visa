import PublicReferralLandingView from '@/views/PublicReferralLandingView';

export default async function PublicReferralPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <PublicReferralLandingView partnerUid={uid} />;
}
