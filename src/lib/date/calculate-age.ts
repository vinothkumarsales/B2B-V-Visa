type DateInput = Date | string;

export type PassportValidityStatus = 'valid' | 'expires-within-six-months' | 'expired' | 'unknown';
export type PassportValidityRule =
  | 'SIX_MONTHS_FROM_TRAVEL'
  | 'SIX_MONTHS_FROM_ARRIVAL'
  | 'SIX_MONTHS_FROM_RETURN'
  | 'THREE_MONTHS_FROM_DEPARTURE'
  | 'VALID_FOR_STAY_DURATION'
  | 'MANUAL_RULE'
  | 'UNKNOWN';

export type PassportValidityReviewStatus = 'VALID' | 'EXPIRED' | 'BELOW_SIX_MONTHS' | 'MANUAL_REVIEW';

function parseCalendarDate(value?: DateInput): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

export function calculateAge(dateOfBirth?: DateInput, asOf: DateInput = new Date()): number | null {
  const birthDate = parseCalendarDate(dateOfBirth);
  const checkDate = parseCalendarDate(asOf);
  if (!birthDate || !checkDate || birthDate > checkDate) return null;

  let age = checkDate.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    checkDate.getMonth() > birthDate.getMonth() ||
    (checkDate.getMonth() === birthDate.getMonth() && checkDate.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) age -= 1;
  return age;
}

export function isMinorOnDate(dateOfBirth?: DateInput, travelDate: DateInput = new Date()): boolean {
  const age = calculateAge(dateOfBirth, travelDate);
  return age !== null && age < 18;
}

export function getPassportValidityStatus(
  passportExpiry?: DateInput,
  travelDate: DateInput = new Date(),
  requiredMonths = 6
): PassportValidityStatus {
  const expiryDate = parseCalendarDate(passportExpiry);
  const checkDate = parseCalendarDate(travelDate);
  if (!expiryDate || !checkDate) return 'unknown';
  if (expiryDate < checkDate) return 'expired';

  const requiredUntil = addCalendarMonths(checkDate, requiredMonths);
  return expiryDate < requiredUntil ? 'expires-within-six-months' : 'valid';
}

export function getPassportValidityMessage(status: PassportValidityStatus): string | null {
  if (status === 'expired') return 'Passport expired before the travel/check date.';
  if (status === 'expires-within-six-months') return 'Passport has less than six months validity.';
  return null;
}

export function evaluatePassportValidity({
  passportExpiryDate,
  travelDate,
  today = new Date(),
  rule = 'UNKNOWN',
}: {
  passportExpiryDate?: string;
  travelDate?: string;
  today?: Date;
  rule?: PassportValidityRule;
}): { status: PassportValidityReviewStatus; message?: string; blocksProgress: boolean } {
  const status = getPassportValidityStatus(passportExpiryDate, travelDate || today);

  if (status === 'expired') {
    return {
      status: 'EXPIRED',
      blocksProgress: true,
      message: 'This passport has expired. Upload a valid renewed passport to continue.',
    };
  }

  if (status === 'expires-within-six-months') {
    const ruleRequiresBlock = rule === 'SIX_MONTHS_FROM_TRAVEL' || rule === 'SIX_MONTHS_FROM_ARRIVAL';
    return {
      status: rule === 'UNKNOWN' ? 'MANUAL_REVIEW' : 'BELOW_SIX_MONTHS',
      blocksProgress: ruleRequiresBlock,
      message:
        'Passport validity is less than six months from the intended travel date. Many destinations require at least six months of passport validity. Please renew the passport or upload a newer passport before continuing.',
    };
  }

  return { status: 'VALID', blocksProgress: false };
}
