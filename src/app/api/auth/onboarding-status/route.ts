import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyFirebaseIdToken } from '@/lib/firebase-verify';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ onboarded: false }, { status: 400 });

    const decodedToken = await verifyFirebaseIdToken(token);
    const email = decodedToken.email?.toLowerCase();
    if (!email) return NextResponse.json({ onboarded: false }, { status: 400 });

    // Check if user exists in local Postgres database with memberships
    const user = await db.user.findUnique({
      where: { email },
      include: { memberships: { include: { agency: true } } },
    });

    const onboarded = !!(user && user.memberships && user.memberships.length > 0);

    return NextResponse.json({ onboarded });
  } catch (error) {
    console.error('ONBOARDING_STATUS_CHECK_FAILED', error);
    return NextResponse.json({ onboarded: false });
  }
}
