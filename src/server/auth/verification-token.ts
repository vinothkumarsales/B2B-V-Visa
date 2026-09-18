import crypto from 'node:crypto';
import { db } from '../../lib/db.ts';

export interface VerificationRecord {
  id: string;
  email: string;
  token: string;
  code: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
}

// In-memory fallback cache for development or when database is temporarily unavailable
const inMemoryTokens = new Map<string, VerificationRecord>();
const inMemoryVerifiedEmails = new Set<string>();

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const CODE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateNumericCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generates and stores a new verification token and 6-digit OTP code for an email.
 */
export async function generateVerificationToken(email: string): Promise<{
  token: string;
  code: string;
  expiresAt: Date;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const token = generateSecureToken();
  const code = generateNumericCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_MS);
  const id = crypto.randomUUID();

  const record: VerificationRecord = {
    id,
    email: normalizedEmail,
    token,
    code,
    expiresAt,
    verifiedAt: null,
    createdAt: now,
  };

  // Always store in in-memory fallback
  inMemoryTokens.set(token, record);

  // Store in PostgreSQL database if available
  try {
    const delegate = (db as any).emailVerificationToken;
    if (delegate?.create) {
      await delegate.create({
        data: {
          id,
          email: normalizedEmail,
          token,
          code,
          expiresAt,
        },
      });
    }
  } catch (err) {
    console.warn('[VERIFICATION_TOKEN] Database write failed, using in-memory store:', (err as Error)?.message);
  }

  return { token, code, expiresAt };
}

/**
 * Verifies either a token (from link) or a 6-digit code (from UI).
 */
export async function verifyTokenOrCode(input: {
  token?: string;
  code?: string;
  email?: string;
}): Promise<{ success: boolean; email?: string; error?: string }> {
  const { token, code, email } = input;
  const normalizedEmail = email?.toLowerCase().trim();
  const now = new Date();

  // 1. Verify via Link Token
  if (token) {
    let record: VerificationRecord | null = null;

    try {
      const delegate = (db as any).emailVerificationToken;
      if (delegate?.findUnique) {
        record = await delegate.findUnique({ where: { token } });
      }
    } catch {
      // Ignore DB error, fall back to memory
    }

    if (!record) {
      record = inMemoryTokens.get(token) ?? null;
    }

    if (!record) {
      return { success: false, error: 'Invalid or expired verification link.' };
    }

    if (new Date(record.expiresAt).getTime() < now.getTime()) {
      return { success: false, error: 'Verification link has expired. Please request a new one.' };
    }

    // Mark as verified
    inMemoryVerifiedEmails.add(record.email);
    try {
      const delegate = (db as any).emailVerificationToken;
      if (delegate?.update) {
        await delegate.update({
          where: { token },
          data: { verifiedAt: now },
        });
      }
    } catch {
      // Ignore update error
    }

    return { success: true, email: record.email };
  }

  // 2. Verify via 6-digit Code + Email
  if (code && normalizedEmail) {
    const cleanCode = code.trim();
    let record: VerificationRecord | null = null;

    try {
      const delegate = (db as any).emailVerificationToken;
      if (delegate?.findFirst) {
        record = await delegate.findFirst({
          where: {
            email: normalizedEmail,
            code: cleanCode,
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    } catch {
      // Ignore DB error, fall back to memory
    }

    if (!record) {
      // Search in memory
      for (const item of inMemoryTokens.values()) {
        if (item.email === normalizedEmail && item.code === cleanCode) {
          record = item;
          break;
        }
      }
    }

    if (!record) {
      return { success: false, error: 'Invalid verification code. Please check and try again.' };
    }

    const codeAge = now.getTime() - new Date(record.createdAt).getTime();
    if (codeAge > CODE_EXPIRY_MS) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    // Mark verified
    inMemoryVerifiedEmails.add(normalizedEmail);
    try {
      const delegate = (db as any).emailVerificationToken;
      if (delegate?.update) {
        await delegate.update({
          where: { id: record.id },
          data: { verifiedAt: now },
        });
      }
    } catch {
      // Ignore update error
    }

    return { success: true, email: normalizedEmail };
  }

  return { success: false, error: 'Missing verification credentials.' };
}

/**
 * Checks whether an email address is authoritative verified.
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check in-memory verified cache
  if (inMemoryVerifiedEmails.has(normalizedEmail)) {
    return true;
  }

  // Check database EmailVerificationToken
  try {
    const delegate = (db as any).emailVerificationToken;
    if (delegate?.findFirst) {
      const verifiedToken = await delegate.findFirst({
        where: {
          email: normalizedEmail,
          verifiedAt: { not: null },
        },
      });
      if (verifiedToken) {
        inMemoryVerifiedEmails.add(normalizedEmail);
        return true;
      }
    }
  } catch {
    // Ignore DB error
  }

  return false;
}

/**
 * Explicitly marks an email as verified.
 */
export async function markEmailAsVerified(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  inMemoryVerifiedEmails.add(normalizedEmail);

  try {
    const delegate = (db as any).emailVerificationToken;
    if (delegate?.updateMany) {
      await delegate.updateMany({
        where: { email: normalizedEmail },
        data: { verifiedAt: new Date() },
      });
    }
  } catch {
    // Ignore DB error
  }
}
