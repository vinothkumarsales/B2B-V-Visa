import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { mockAgency } from '@/lib/mock-data';
import { auditLog } from '@/server/audit/audit-log';
import { requireAgencyMembership } from '@/server/auth/session';
import { queueTravelAgentCrmSync } from '@/server/integrations/zoho/travel-agent-sync';
import { adminDb } from '@/lib/firebase-admin';

const profileSchema = z.object({
  // Agency fields
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
  logoUrl: z.string().optional(),

  // Personal / Onboarding fields
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  gender: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  aadhaarNumber: z.string().max(40).optional(),
  aadhaarName: z.string().max(100).optional(),
  aadhaarAddress: z.string().max(300).optional(),
  businessName: z.string().max(200).optional(),
  billingType: z.enum(['GST', 'NON_GST']).optional(),
});

function nullableTrim(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export async function GET() {
  if (isDemoMode) return NextResponse.json({ agency: mockAgency, mode: 'demo' });
  try {
    const session = await requireAgencyMembership();
    
    return NextResponse.json({ 
      agency: session.agency,
      userProfile: {
        firstName: (session.user as any).firstName || (session.user.name?.split(' ')[0] ?? ''),
        lastName: (session.user as any).lastName || (session.user.name?.split(' ').slice(1).join(' ') ?? ''),
        gender: (session.user as any).gender || 'Male',
        designation: (session.user as any).designation || '',
        aadhaarNumber: (session.user as any).aadhaarNumber || '',
        aadhaarName: (session.user as any).aadhaarName || '',
        aadhaarAddress: (session.user as any).aadhaarAddress || '',
      },
      businessProfile: {
        businessName: session.agency.name,
        billingType: ((session.agency as any).billingType as 'GST' | 'NON_GST') || 'NON_GST',
        logoUrl: (session.agency as any).logoUrl || '',
      }
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('FORBIDDEN', 'Unable to retrieve profile details', 403);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (isDemoMode) return NextResponse.json({ agency: mockAgency, mode: 'demo' });

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid profile details', 400);

    const session = await requireAgencyMembership(['AGENCY_OWNER', 'AGENCY_ADMIN']);
    const {
      phone,
      whatsapp,
      country,
      gstNumber,
      panCard,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      logoUrl,
      firstName,
      lastName,
      gender,
      designation,
      aadhaarNumber,
      aadhaarName,
      aadhaarAddress,
      businessName,
      billingType,
    } = parsed.data;

    // Update User details locally in Postgres
    const computedName = (firstName || lastName) ? `${firstName || ''} ${lastName || ''}`.trim() : undefined;
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: computedName,
        phone: nullableTrim(phone),
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        gender: gender !== undefined ? gender : undefined,
        designation: designation !== undefined ? designation : undefined,
        aadhaarNumber: aadhaarNumber !== undefined ? nullableTrim(aadhaarNumber) : undefined,
        aadhaarName: aadhaarName !== undefined ? nullableTrim(aadhaarName) : undefined,
        aadhaarAddress: aadhaarAddress !== undefined ? nullableTrim(aadhaarAddress) : undefined,
      },
    });

    // Update Agency profile details locally in Postgres
    const agency = await db.agency.update({
      where: { id: session.agencyId },
      data: {
        name: nullableTrim(businessName) ?? undefined,
        phone: nullableTrim(phone),
        whatsapp: nullableTrim(whatsapp),
        country: nullableTrim(country) ?? 'India',
        gstNumber: billingType === 'NON_GST' ? null : (nullableTrim(gstNumber) ?? undefined),
        billingType: billingType !== undefined ? billingType : undefined,
        logoUrl: logoUrl !== undefined ? nullableTrim(logoUrl) : undefined,
        panCard: nullableTrim(panCard),
        addressLine1: nullableTrim(addressLine1),
        addressLine2: nullableTrim(addressLine2),
        city: nullableTrim(city),
        state: nullableTrim(state),
        zipCode: nullableTrim(zipCode),
        syncStatus: 'PENDING',
      },
    });

    // Run non-blocking integrations asynchronously after HTTP response is sent
    after(async () => {
      // Mirror updates to Firestore collections
      try {
        await adminDb.collection('users').doc(session.user.id).set({
          firstName: firstName ?? '',
          lastName: lastName ?? '',
          gender: gender ?? '',
          designation: designation ?? '',
          aadhaarNumber: aadhaarNumber ?? '',
          aadhaarName: aadhaarName ?? '',
          aadhaarAddress: aadhaarAddress ?? '',
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          email: session.user.email,
          phone: phone ?? '',
        }, { merge: true });

        await adminDb.collection('agencies').doc(session.agencyId).set({
          name: agency.name,
          phone: agency.phone ?? '',
          country: country ?? 'India',
          billingType: billingType ?? 'NON_GST',
          gstNumber: agency.gstNumber ?? '',
          logoUrl: logoUrl ?? '',
        }, { merge: true });
      } catch (firestoreError) {
        console.error('FIRESTORE_PROFILE_SYNC_FAILED', firestoreError);
      }

      try {
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
      } catch (syncError) {
        console.error('INTEGRATION_SYNC_FAILED', syncError);
      }
    });

    return NextResponse.json({ agency, message: 'Profile updated' });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to update profile', 400);
  }
}
