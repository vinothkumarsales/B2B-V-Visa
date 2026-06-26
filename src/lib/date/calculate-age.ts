export function calculateAge(dateOfBirth?: string, referenceDate?: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const reference = referenceDate ? new Date(referenceDate) : new Date();
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) return null;

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDelta = reference.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && reference.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function evaluatePassportValidity({
  passportExpiryDate,
  travelDate,
}: {
  passportExpiryDate?: string;
  travelDate?: string;
  rule?: string;
}): { status: 'VALID' | 'WARNING' | 'UNKNOWN'; message?: string; blocksSubmit: boolean; blocksProgress: boolean } {
  if (!passportExpiryDate) {
    return { status: 'UNKNOWN', message: 'Passport expiry date is required for validity check.', blocksSubmit: false, blocksProgress: false };
  }

  const expiry = new Date(passportExpiryDate);
  const reference = travelDate ? new Date(travelDate) : new Date();
  if (Number.isNaN(expiry.getTime()) || Number.isNaN(reference.getTime())) {
    return { status: 'UNKNOWN', message: 'Passport validity could not be checked.', blocksSubmit: false, blocksProgress: false };
  }

  const sixMonthsAfterReference = new Date(reference);
  sixMonthsAfterReference.setMonth(sixMonthsAfterReference.getMonth() + 6);

  if (expiry < sixMonthsAfterReference) {
    return {
      status: 'WARNING',
      message: 'Passport should usually be valid for at least 6 months from travel date.',
      blocksSubmit: false,
      blocksProgress: false,
    };
  }

  return { status: 'VALID', blocksSubmit: false, blocksProgress: false };
}
