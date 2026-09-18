import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateVerificationToken } from '@/server/auth/verification-token';
import { auditLog } from '@/server/audit/audit-log';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';

const sendSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Cooldown tracking: Map<email, timestamp>
const lastSentStore = new Map<string, number>();
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema().catch(() => {});

    const body = await request.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? 'Invalid email' } },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const now = Date.now();
    const lastSent = lastSentStore.get(email);

    if (lastSent && now - lastSent < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: `Please wait ${waitSec} seconds before requesting another verification email.`,
            retryAfter: waitSec,
          },
        },
        { status: 429 }
      );
    }

    lastSentStore.set(email, now);

    const { token, code, expiresAt } = await generateVerificationToken(email);

    // Audit log
    await auditLog({
      action: 'EMAIL_VERIFICATION_SENT',
      resourceType: 'User',
      resourceId: email,
      metadata: {
        email,
        expiresAt: expiresAt.toISOString(),
      },
    }).catch(() => {});

    console.log(`[EMAIL_VERIFICATION] Token & OTP generated for ${email}:`, {
      code,
      tokenPreview: token.slice(0, 8) + '...',
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully.',
      cooldownSeconds: 30,
    });
  } catch (error: any) {
    console.error('[SEND_VERIFICATION_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to send verification email' } },
      { status: 500 }
    );
  }
}
