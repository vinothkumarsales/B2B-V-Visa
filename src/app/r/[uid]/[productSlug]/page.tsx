import PublicReferralLandingView from '@/views/PublicReferralLandingView';

export default async function PublicProductReferralPage({
  params,
}: {
  params: Promise<{ uid: string; productSlug: string }>;
}) {
  const { uid, productSlug } = await params;
  return <PublicReferralLandingView partnerUid={uid} productSlug={productSlug} />;
}
