import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTokenOrCode, isEmailVerified } from '@/server/auth/verification-token';
import { auditLog } from '@/server/audit/audit-log';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';

const verifySchema = z.object({
  token: z.string().optional(),
  code: z.string().optional(),
  email: z.string().email().optional(),
}).refine(data => data.token || (data.code && data.email), {
  message: 'Either verification token or code with email must be provided.',
});

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema().catch(() => {});

    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? 'Invalid verification data' } },
        { status: 400 }
      );
    }

    const result = await verifyTokenOrCode(parsed.data);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VERIFICATION_FAILED', message: result.error || 'Verification failed' } },
        { status: 400 }
      );
    }

    // Audit log
    await auditLog({
      action: 'EMAIL_VERIFIED',
      resourceType: 'User',
      resourceId: result.email || 'unknown',
      metadata: {
        method: parsed.data.token ? 'TOKEN_LINK' : 'OTP_CODE',
        email: result.email,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      verified: true,
      email: result.email,
      message: 'Email verified successfully.',
    });
  } catch (error: any) {
    console.error('[VERIFY_EMAIL_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Verification failed' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token') || undefined;
  const code = searchParams.get('code') || undefined;
  const email = searchParams.get('email') || undefined;
  const checkOnly = searchParams.get('check') === 'true';

  if (checkOnly && email) {
    const verified = await isEmailVerified(email);
    return NextResponse.json({ email, verified });
  }

  if (!token && (!code || !email)) {
    return NextResponse.redirect(new URL('/register?error=missing_verification_params', request.url));
  }

  const result = await verifyTokenOrCode({ token, code, email });
  if (result.success) {
    return NextResponse.redirect(
      new URL(`/register?verified=true&email=${encodeURIComponent(result.email || email || '')}`, request.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/register?error=${encodeURIComponent(result.error || 'verification_failed')}`, request.url)
  );
}
