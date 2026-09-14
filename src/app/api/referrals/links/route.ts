import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { apiError, isApiResponse } from '@/lib/api-response';
import { getPartnerReferralLinks } from '@/server/referrals/referral.service';
import { isVvisaUid, generateAgencyUid } from '@/lib/uid';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    let partnerUid = session.agency.vvisaUid;
    if (!partnerUid || !isVvisaUid(partnerUid)) {
      partnerUid = generateAgencyUid();
      await db.agency.update({
        where: { id: session.agencyId },
        data: { vvisaUid: partnerUid },
      }).catch(() => {});
    }

    const linkData = await getPartnerReferralLinks(session.agencyId, partnerUid);

    // Fetch active products for product-specific referral link options
    const products = await db.visaProduct.findMany({
      where: { isActive: true },
      select: { id: true, name: true, destination: true, category: true },
      orderBy: { displayOrder: 'asc' },
      take: 20,
    });

    return NextResponse.json({
      ...linkData,
      partnerUid,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        destination: p.destination,
        category: p.category,
        url: `${linkData.baseUrl}/r/${partnerUid}/${encodeURIComponent(p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`,
      })),
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API/REFERRALS/LINKS] GET error:', error);
    return apiError('INVALID_INPUT', 'Failed to fetch referral links', 500);
  }
}
