import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createReferral } from '@/server/referrals/referral.service';
import { z } from 'zod';

const publicLeadSchema = z.object({
  partnerUid: z.string().min(1, 'Partner UID is required'),
  productId: z.string().min(1, 'Product selection is required'),
  clientName: z.string().min(2, 'Name is required'),
  clientMobile: z.string().min(8, 'Mobile number is required'),
  clientWhatsapp: z.string().optional(),
  clientEmail: z.string().email('Valid email address is required'),
  clientCountry: z.string().optional(),
  clientCity: z.string().optional(),
  notes: z.string().optional(),
  travelDate: z.string().optional(),
  numberOfApplicants: z.number().int().min(1).default(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publicLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid lead submission' },
        { status: 400 },
      );
    }

    const { partnerUid, ...leadData } = parsed.data;

    // Locate the partner agency
    const agency = await db.agency.findFirst({
      where: { OR: [{ vvisaUid: partnerUid }, { id: partnerUid }] },
      select: { id: true, vvisaUid: true, name: true },
    });

    if (!agency) {
      return NextResponse.json({ error: 'Invalid partner referral link' }, { status: 404 });
    }

    // Locate referral link record if existing
    const canonicalUid = agency.vvisaUid || partnerUid;
    const referralLink = await db.referralLink.findFirst({
      where: { code: canonicalUid },
    });

    const result = await createReferral({
      ...leadData,
      partnerAgencyId: agency.id,
      partnerUid: canonicalUid,
      referralLinkId: referralLink?.id,
      actor: 'Client (Public Link)',
      consent: true,
    });

    // Update submitted leads counter on referralLink
    if (referralLink) {
      await db.referralLink.update({
        where: { id: referralLink.id },
        data: { submittedLeads: { increment: 1 } },
      }).catch((e) => console.warn('[PUBLIC_LEAD_SUBMIT] Link counter error:', e));
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your request has been received. Our visa specialist will contact you shortly.',
      referralCode: result.referral.referralCode,
    }, { status: 201 });
  } catch (error) {
    console.error('[API/R/SUBMIT] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process inquiry. Please try again or contact support.' },
      { status: 500 },
    );
  }
}
