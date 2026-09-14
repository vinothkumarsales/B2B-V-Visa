/**
 * V-VISA Partner UID utilities
 *
 * Format: VVAXXXXXXX
 * - Prefix: VVA
 * - Suffix: 7 uppercase alphanumeric characters (excluding ambiguous: 0, O, I, 1, L)
 * - No hyphens
 * - Total length: 10 characters
 * - ~33 billion combinations
 * - URL-safe
 */

const UID_PREFIX = 'VVA';
const UID_SUFFIX_LENGTH = 7;
const UID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 chars, no ambiguous 0,O,I,1,L
const UID_REGEX = /^VVA[A-HJ-KM-NP-Z2-9]{7}$/;

/**
 * Generate a new unique V-VISA partner UID.
 * Format: VVAXXXXXXX (10 chars total)
 *
 * Call within a retry loop when writing to DB to handle unlikely collisions:
 * ```ts
 * for (let attempt = 0; attempt < 3; attempt++) {
 *   try {
 *     const uid = generateAgencyUid();
 *     await db.agency.update({ where: { id }, data: { vvisaUid: uid } });
 *     break;
 *   } catch (e) {
 *     if (attempt === 2) throw e;
 *   }
 * }
 * ```
 */
export function generateAgencyUid(): string {
  let suffix = '';
  // Use crypto.getRandomValues if available (browser/edge), else Math.random
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(UID_SUFFIX_LENGTH);
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      suffix += UID_CHARS[byte % UID_CHARS.length];
    }
  } else {
    for (let i = 0; i < UID_SUFFIX_LENGTH; i++) {
      suffix += UID_CHARS[Math.floor(Math.random() * UID_CHARS.length)];
    }
  }
  return `${UID_PREFIX}${suffix}`;
}

/**
 * Returns true if the given string is a valid V-VISA partner UID.
 * Useful for routing: distinguish VVA UIDs from legacy cuids.
 */
export function isVvisaUid(value: string): boolean {
  return UID_REGEX.test(value);
}

/**
 * Generates a UID with retry support for DB unique constraint violations.
 * Retries up to `maxAttempts` times.
 */
export async function generateUniqueAgencyUid(
  checkExists: (uid: string) => Promise<boolean>,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const uid = generateAgencyUid();
    const exists = await checkExists(uid);
    if (!exists) return uid;
  }
  throw new Error('VVISA_UID_GENERATION_EXHAUSTED: Could not generate a unique UID after multiple attempts');
}

/**
 * Safely converts an Agency object for JSON responses by casting BigInt fields (such as totalRevenueMinor)
 * to strings. Avoids 'TypeError: Do not know how to serialize a BigInt'.
 */
export function serializeAgency<T extends Record<string, any> | null | undefined>(agency: T): T {
  if (!agency) return agency;
  return {
    ...agency,
    totalRevenueMinor: agency.totalRevenueMinor != null ? String(agency.totalRevenueMinor) : '0',
  } as T;
}

