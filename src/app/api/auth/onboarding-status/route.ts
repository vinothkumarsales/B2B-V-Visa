import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { verifyFirebaseIdToken } from '@/lib/firebase-verify';
import { findZohoTravelAgentByEmail } from '@/server/integrations/zoho/find-travel-agent';
import { generateAgencyUid } from '@/lib/uid';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const { token } = await request.json();
    if (!token) return NextResponse.json({ onboarded: false }, { status: 400 });

    const decodedToken = await verifyFirebaseIdToken(token);
    const email = decodedToken.email?.toLowerCase().trim();
    if (!email) return NextResponse.json({ onboarded: false }, { status: 400 });

    // 1. Check if user exists in local Postgres database with memberships
    const user = await db.user.findUnique({
      where: { email },
      include: { memberships: { include: { agency: true } } },
    });

    if (user && user.memberships && user.memberships.length > 0) {
      return NextResponse.json({ onboarded: true });
    }

    // 2. Check if an Agency already exists with this email
    const existingAgency = await db.agency.findUnique({
      where: { email },
    });

    if (existingAgency) {
      const name = decodedToken.name ?? email.split('@')[0];
      const localUser = user ?? await db.user.create({
        data: {
          name,
          email,
          phone: decodedToken.phone_number ?? null,
          passwordHash: '',
        },
      });

      await db.agencyMembership.upsert({
        where: {
          userId_agencyId: {
            userId: localUser.id,
            agencyId: existingAgency.id,
          },
        },
        create: {
          userId: localUser.id,
          agencyId: existingAgency.id,
          role: 'AGENCY_OWNER',
          isDefault: true,
        },
        update: {},
      });

      return NextResponse.json({ onboarded: true });
    }

    // 3. Check if partner is already stored in Zoho CRM
    try {
      const zohoMatch = await findZohoTravelAgentByEmail(email);
      if (zohoMatch) {
        console.log('[ONBOARDING_STATUS] Auto-recognizing existing Zoho CRM partner:', {
          email,
          zohoRecordId: zohoMatch.zohoRecordId,
        });

        const name = decodedToken.name ?? email.split('@')[0];
        const resolvedUid = zohoMatch.vvisaUid ?? generateAgencyUid();

        await db.$transaction(async (tx) => {
          const u = await tx.user.upsert({
            where: { email },
            create: {
              name,
              email,
              phone: decodedToken.phone_number ?? null,
              passwordHash: '',
            },
            update: {},
          });

          const agency = await tx.agency.upsert({
            where: { email },
            create: {
              name: `${name}'s Agency`,
              email,
              phone: decodedToken.phone_number ?? null,
              status: 'DRAFT',
              vvisaUid: resolvedUid,
              zohoRecordId: zohoMatch.zohoRecordId,
              memberships: {
                create: {
                  userId: u.id,
                  role: 'AGENCY_OWNER',
                  isDefault: true,
                },
              },
              wallets: {
                create: { currency: 'INR' },
              },
            },
            update: {
              zohoRecordId: zohoMatch.zohoRecordId,
              ...(!zohoMatch.vvisaUid ? {} : { vvisaUid: zohoMatch.vvisaUid }),
            },
          });

          await tx.agencyMembership.upsert({
            where: {
              userId_agencyId: {
                userId: u.id,
                agencyId: agency.id,
              },
            },
            create: {
              userId: u.id,
              agencyId: agency.id,
              role: 'AGENCY_OWNER',
              isDefault: true,
            },
            update: {},
          });
        });

        return NextResponse.json({ onboarded: true });
      }
    } catch (zohoError) {
      console.warn('[ONBOARDING_STATUS] Zoho CRM check warning:', zohoError);
    }

    return NextResponse.json({ onboarded: false });
  } catch (error) {
    console.error('ONBOARDING_STATUS_CHECK_FAILED', error);
    return NextResponse.json({ onboarded: false });
  }
}
