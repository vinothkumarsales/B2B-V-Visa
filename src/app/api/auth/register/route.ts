import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { mockAgency } from '@/lib/mock-data';
import { auditLog } from '@/server/audit/audit-log';
import { hashPassword } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { queueTravelAgentCrmSync } from '@/server/integrations/zoho/travel-agent-sync';

const registerSchema = z.object({
  phone: z.string().min(10).max(30),
  agencyName: z.string().min(2).max(160),
  email: z.string().email().max(180),
  password: z.string().min(8).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid registration details', 400);

    if (isDemoMode) {
      return NextResponse.json({ user: mockAgency, agency: mockAgency, mode: 'demo' });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const phone = parsed.data.phone.trim();
    const agencyName = parsed.data.agencyName.trim();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return apiError('INVALID_INPUT', 'An account already exists for this email', 409);

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: agencyName,
          email,
          phone,
          passwordHash: hashPassword(parsed.data.password),
        },
      });

      const agency = await tx.agency.create({
        data: {
          name: agencyName,
          email,
          phone,
          status: 'DRAFT',
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
    });

    await createSession(result.user.id);

    await auditLog({
      agencyId: result.agency.id,
      actorUserId: result.user.id,
      action: 'REGISTER',
      resourceType: 'Agency',
      resourceId: result.agency.id,
    });

    await queueTravelAgentCrmSync({ agencyId: result.agency.id });

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
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to register account', 400);
  }
}

