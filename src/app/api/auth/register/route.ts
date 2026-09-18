import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { after } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { verifyFirebaseIdToken } from '@/lib/firebase-verify';
import { apiError, isApiResponse } from '@/lib/api-response';
import { auditLog } from '@/server/audit/audit-log';
import { createSession } from '@/server/auth/session';
import { queueTravelAgentCrmSync } from '@/server/integrations/zoho/travel-agent-sync';
import { drainZohoCrmOutbox } from '@/server/integrations/zoho/crm-outbox-worker';
import { findZohoTravelAgentByEmail } from '@/server/integrations/zoho/find-travel-agent';
import { generateAgencyUid, serializeAgency } from '@/lib/uid';
import { isEmailVerified } from '@/server/auth/verification-token';

const registerSchema = z.object({
  token: z.string(),
  phone: z.string().min(10).max(30),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  gender: z.string().min(1).max(20),
  designation: z.string().min(1).max(80),
  country: z.string().min(2).max(80),
  operatingCountry: z.string().min(2).max(80).optional(),
  businessName: z.string().min(2).max(160),
  billingType: z.enum(['GST', 'NON_GST']),
  gstNumber: z.string().max(20).optional(),
}).refine(data => data.billingType === 'NON_GST' || (data.billingType === 'GST' && data.gstNumber && data.gstNumber.trim().length > 0), {
  message: 'GST number is required for GST Invoice billing.',
  path: ['gstNumber']
});

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid onboarding details', 400);
    }

    const {
      token,
      phone,
      firstName,
      lastName,
      gender,
      designation,
      country,
      operatingCountry,
      businessName,
      billingType,
      gstNumber,
    } = parsed.data;

    // Verify Firebase Token
    const decodedToken = await verifyFirebaseIdToken(token);
    const email = decodedToken.email?.toLowerCase().trim();
    if (!email) return apiError('INVALID_INPUT', 'Invalid auth token', 400);

    const emailVerified = Boolean(decodedToken.email_verified) || (await isEmailVerified(email));
    if (!emailVerified) {
      return apiError('FORBIDDEN', 'Your email address is not verified yet.', 403);
    }

    // ── SYNCHRONOUS ZOHO EMAIL LOOKUP ──────────────────────────────────────
    let zohoMatch: { zohoRecordId: string; vvisaUid: string | null } | null = null;
    try {
      zohoMatch = await findZohoTravelAgentByEmail(email);
      if (zohoMatch) {
        console.log('[ONBOARDING] Existing Zoho Travel Agent found', {
          email,
          zohoRecordId: zohoMatch.zohoRecordId,
          hasUid: Boolean(zohoMatch.vvisaUid),
        });
      } else {
        console.log('[ONBOARDING] No existing Zoho Travel Agent for email', { email });
      }
    } catch (zohoError) {
      console.warn(
        '[ONBOARDING] Zoho CRM lookup unavailable during registration. Proceeding with local UID generation and queueing CRM sync to outbox:',
        zohoError instanceof Error ? zohoError.message : String(zohoError),
      );
    }

    // ── EXISTING USER & AGENCY LOOKUP ──────────────────────────────────────
    const [existingUser, existingAgencyByEmail] = await Promise.all([
      db.user.findUnique({
        where: { email },
        include: { memberships: { include: { agency: true } } },
      }),
      db.agency.findUnique({
        where: { email },
        include: { memberships: true },
      }),
    ]);

    const fullName = `${firstName} ${lastName}`;

    const result = await db.$transaction(async (tx) => {
      const existingAgency = existingUser?.memberships[0]?.agency ?? existingAgencyByEmail ?? null;
      const agencyId = existingAgency?.id;

      // ── UID CONFLICT CHECK ─────────────────────────────────────────────
      if (
        existingAgency?.vvisaUid &&
        zohoMatch?.vvisaUid &&
        existingAgency.vvisaUid !== zohoMatch.vvisaUid
      ) {
        console.warn('[VVISA_UID_SYNC_CONFLICT]', {
          email,
          localVvisaUid: existingAgency.vvisaUid,
          zohoVvisaUid: zohoMatch.vvisaUid,
          zohoRecordId: zohoMatch.zohoRecordId,
        });
      }

      // Determine UID: prefer Zoho UID, then existing local UID, then generate new
      const resolvedUid =
        zohoMatch?.vvisaUid ??
        existingAgency?.vvisaUid ??
        generateAgencyUid();

      // Upsert User
      const user = await tx.user.upsert({
        where: { email },
        create: {
          name: fullName,
          email,
          phone,
          firstName,
          lastName,
          gender,
          designation,
          passwordHash: '', // managed by Firebase
        },
        update: {
          name: fullName,
          phone,
          firstName,
          lastName,
          gender,
          designation,
        },
      });

      // Upsert Agency
      let agency;
      if (agencyId) {
        agency = await tx.agency.update({
          where: { id: agencyId },
          data: {
            name: businessName,
            phone,
            gstNumber: billingType === 'GST' ? gstNumber : null,
            billingType,
            country,
            ...(zohoMatch?.zohoRecordId ? { zohoRecordId: zohoMatch.zohoRecordId } : {}),
            ...(!existingAgency?.vvisaUid ? { vvisaUid: resolvedUid } : {}),
          },
        });
      } else {
        agency = await tx.agency.create({
          data: {
            name: businessName,
            email,
            phone,
            status: 'DRAFT',
            gstNumber: billingType === 'GST' ? gstNumber : null,
            billingType,
            country,
            vvisaUid: resolvedUid,
            zohoRecordId: zohoMatch?.zohoRecordId ?? null,
            memberships: {
              create: { userId: user.id, role: 'AGENCY_OWNER', isDefault: true },
            },
            wallets: { create: { currency: 'INR' } },
          },
        });
      }

      // Ensure membership exists
      await tx.agencyMembership.upsert({
        where: {
          userId_agencyId: {
            userId: user.id,
            agencyId: agency.id,
          },
        },
        create: {
          userId: user.id,
          agencyId: agency.id,
          role: 'AGENCY_OWNER',
          isDefault: true,
        },
        update: {},
      });

      // Ensure wallet exists
      const existingWallet = await tx.wallet.findFirst({
        where: { agencyId: agency.id },
      });
      if (!existingWallet) {
        await tx.wallet.create({
          data: { agencyId: agency.id, currency: 'INR' },
        });
      }

      return {
        user,
        agency,
        existingPartner: Boolean(existingUser || existingAgencyByEmail || zohoMatch),
      };
    });

    await createSession(result.user.id);

    await auditLog({
      agencyId: result.agency.id,
      actorUserId: result.user.id,
      action: 'REGISTER',
      resourceType: 'Agency',
      resourceId: result.agency.id,
      metadata: {
        vvisaUid: result.agency.vvisaUid,
        zohoMatch: zohoMatch ? { zohoRecordId: zohoMatch.zohoRecordId, hadUid: Boolean(zohoMatch.vvisaUid) } : null,
        existingPartner: result.existingPartner,
      },
    });

    after(async () => {
      try {
        await queueTravelAgentCrmSync({
          agencyId: result.agency.id,
          idempotencySuffix: result.user.id,
          existingZohoRecordId: zohoMatch?.zohoRecordId ?? undefined,
        });
        await drainZohoCrmOutbox(5);
      } catch (error) {
        console.error('REGISTER_CRM_SYNC_FAILED', error instanceof Error ? error.message : 'CRM sync failed');
      }
    });

    const uid = result.agency.vvisaUid;
    const partnerUrl = uid ? `https://business.vvisa.in/${uid}/profile` : null;

    console.log('[ONBOARDING] Registration successful', { email, uid, partnerUrl });

    return NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      agency: serializeAgency(result.agency),
      role: 'AGENCY_OWNER',
      uid,
      partnerUrl,
      existingPartner: result.existingPartner,
      message: 'Registration successful',
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    const message = error instanceof Error ? error.message : 'Unable to complete onboarding';
    console.error('REGISTER_FAILED_ERROR', error);
    return apiError('INVALID_INPUT', `Unable to complete onboarding: ${message}`, 400);
  }
}
