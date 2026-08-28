import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { after } from 'next/server';
import { db } from '@/lib/db';
import { verifyFirebaseIdToken } from '@/lib/firebase-verify';
import { apiError, isApiResponse } from '@/lib/api-response';
import { auditLog } from '@/server/audit/audit-log';
import { createSession } from '@/server/auth/session';
import { queueTravelAgentCrmSync } from '@/server/integrations/zoho/travel-agent-sync';
import { drainZohoCrmOutbox } from '@/server/integrations/zoho/crm-outbox-worker';

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
    if (!decodedToken.email_verified) {
      return apiError('FORBIDDEN', 'Your email address is not verified yet.', 403);
    }

    const email = decodedToken.email?.toLowerCase();
    if (!email) return apiError('INVALID_INPUT', 'Invalid auth token', 400);

    const existingUser = await db.user.findUnique({
      where: { email },
      include: { memberships: { include: { agency: true } } },
    });

    const fullName = `${firstName} ${lastName}`;

    const result = await db.$transaction(async (tx) => {
      if (existingUser) {
        const agencyId = existingUser.memberships[0]?.agencyId;
        const user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: fullName,
            phone,
            firstName,
            lastName,
            gender,
            designation,
          },
        });

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
              memberships: {
                create: {
                  userId: user.id,
                  role: 'AGENCY_OWNER',
                  isDefault: true,
                },
              },
              wallets: {
                create: { currency: 'INR' },
              },
            },
          });
        }
        return { user, agency };
      } else {
        const user = await tx.user.create({
          data: {
            name: fullName,
            email,
            phone,
            firstName,
            lastName,
            gender,
            designation,
            passwordHash: '', // managed by Firebase
          },
        });

        const agency = await tx.agency.create({
          data: {
            name: businessName,
            email,
            phone,
            status: 'DRAFT',
            gstNumber: billingType === 'GST' ? gstNumber : null,
            billingType,
            country,
            memberships: {
              create: {
                userId: user.id,
                role: 'AGENCY_OWNER',
                isDefault: true,
              },
            },
            wallets: {
              create: { currency: 'INR' },
            },
          },
        });

        return { user, agency };
      }
    });

    await createSession(result.user.id);

    await auditLog({
      agencyId: result.agency.id,
      actorUserId: result.user.id,
      action: 'REGISTER',
      resourceType: 'Agency',
      resourceId: result.agency.id,
    });

    after(async () => {
      try {
        await queueTravelAgentCrmSync({ agencyId: result.agency.id, idempotencySuffix: result.user.id });
        await drainZohoCrmOutbox(5);
      } catch (error) {
        console.error('REGISTER_CRM_SYNC_FAILED', error instanceof Error ? error.message : 'CRM sync failed');
      }
    });

    return NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      agency: result.agency,
      role: 'AGENCY_OWNER',
      message: 'Registration successful',
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('REGISTER_FAILED_ERROR', {
        name: error.name,
        message: error.message,
      });
    } else {
      console.error('REGISTER_FAILED_ERROR', String(error));
    }
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to complete onboarding', 400);
  }
}
