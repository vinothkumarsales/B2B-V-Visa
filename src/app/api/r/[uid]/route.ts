import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  try {
    const { uid } = await params;

    // Lookup partner agency by canonical vvisaUid or legacy id
    const agency = await db.agency.findFirst({
      where: { OR: [{ vvisaUid: uid }, { id: uid }] },
      select: {
        id: true,
        vvisaUid: true,
        name: true,
        logoUrl: true,
        country: true,
        city: true,
      },
    });

    if (!agency) {
      return NextResponse.json({ error: 'Partner link not found' }, { status: 404 });
    }

    // Increment click count on ReferralLink
    const partnerUid = agency.vvisaUid || uid;
    try {
      await db.referralLink.upsert({
        where: { code: partnerUid },
        update: { clicks: { increment: 1 } },
        create: {
          code: partnerUid,
          partnerAgencyId: agency.id,
          partnerUid,
          clicks: 1,
        },
      });
    } catch (err) {
      console.warn('[API/R/[UID]] Could not update click count:', err);
    }

    // Return eligible active products for public view
    const products = await db.visaProduct.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        destination: true,
        category: true,
        amountMinor: true,
        currency: true,
        processingTime: true,
        validity: true,
        shortDescription: true,
        isFeatured: true,
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
      take: 24,
    });

    return NextResponse.json({
      partner: {
        name: agency.name,
        uid: partnerUid,
        logoUrl: agency.logoUrl,
        city: agency.city,
      },
      products,
    });
  } catch (error) {
    console.error('[API/R/[UID]] GET error:', error);
    return NextResponse.json({ error: 'Failed to process referral link' }, { status: 500 });
  }
}
