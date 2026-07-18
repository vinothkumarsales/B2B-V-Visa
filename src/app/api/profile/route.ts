import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { mockAgency } from '@/lib/mock-data';
import { auditLog } from '@/server/audit/audit-log';
import { requireAgencyMembership } from '@/server/auth/session';
import { queueTravelAgentCrmSync } from '@/server/integrations/zoho/travel-agent-sync';

const profileSchema = z.object({
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  country: z.string().max(80).optional(),
  gstNumber: z.string().max(40).optional(),
  panCard: z.string().max(40).optional(),
  addressLine1: z.string().max(240).optional(),
  addressLine2: z.string().max(240).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
});

function nullableTrim(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export async function GET() {
  if (isDemoMode) return NextResponse.json({ agency: mockAgency, mode: 'demo' });
  const session = await requireAgencyMembership();
  return NextResponse.json({ agency: session.agency });
}

export async function PATCH(request: NextRequest) {
  try {
    if (isDemoMode) return NextResponse.json({ agency: mockAgency, mode: 'demo' });

    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid profile details', 400);

    const session = await requireAgencyMembership(['AGENCY_OWNER', 'AGENCY_ADMIN']);
    const agency = await db.agency.update({
      where: { id: session.agencyId },
      data: {
        phone: nullableTrim(parsed.data.phone),
        whatsapp: nullableTrim(parsed.data.whatsapp),
        country: nullableTrim(parsed.data.country) ?? 'India',
        gstNumber: nullableTrim(parsed.data.gstNumber),
        panCard: nullableTrim(parsed.data.panCard),
        addressLine1: nullableTrim(parsed.data.addressLine1),
        addressLine2: nullableTrim(parsed.data.addressLine2),
        city: nullableTrim(parsed.data.city),
        state: nullableTrim(parsed.data.state),
        zipCode: nullableTrim(parsed.data.zipCode),
        syncStatus: 'PENDING',
      },
    });

    await auditLog({
      agencyId: session.agencyId,
      actorUserId: session.user.id,
      action: 'AGENCY_PROFILE_UPDATED',
      resourceType: 'Agency',
      resourceId: session.agencyId,
    });

    await queueTravelAgentCrmSync({
      agencyId: session.agencyId,
      eventType: 'TRAVEL_AGENT_PROFILE_UPDATED',
    });

    return NextResponse.json({ agency, message: 'Profile updated' });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to update profile', 400);
  }
}
