export type NormalizedTravelAgentIdentifiers = {
  portalTravelAgentId: string;
  email?: string;
  mobileE164?: string;
  mobileDisplay?: string;
  gstNumber?: string;
  companyRegistrationId?: string;
  companyName?: string;
};

export type TravelAgentMatchCandidate =
  | { type: 'PORTAL_UID'; value: string }
  | { type: 'MOBILE'; value: string }
  | { type: 'EMAIL'; value: string }
  | { type: 'GST'; value: string }
  | { type: 'COMPANY_REGISTRATION'; value: string };

export function normalizeTravelAgentIdentifiers(input: {
  portalTravelAgentId: string;
  email?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  companyRegistrationId?: string | null;
  companyName?: string | null;
}): NormalizedTravelAgentIdentifiers {
  return {
    portalTravelAgentId: input.portalTravelAgentId,
    email: normalizeEmail(input.email),
    mobileE164: normalizeIndianMobile(input.mobile),
    mobileDisplay: input.mobile?.trim() || undefined,
    gstNumber: normalizeUpper(input.gstNumber),
    companyRegistrationId: normalizeUpper(input.companyRegistrationId),
    companyName: normalizeCompanyName(input.companyName),
  };
}

export function buildTravelAgentMatchOrder(
  identifiers: NormalizedTravelAgentIdentifiers,
): TravelAgentMatchCandidate[] {
  const candidates: TravelAgentMatchCandidate[] = [
    { type: 'PORTAL_UID', value: identifiers.portalTravelAgentId },
  ];
  if (identifiers.mobileE164) candidates.push({ type: 'MOBILE', value: identifiers.mobileE164 });
  if (identifiers.email) candidates.push({ type: 'EMAIL', value: identifiers.email });
  if (identifiers.gstNumber) candidates.push({ type: 'GST', value: identifiers.gstNumber });
  if (identifiers.companyRegistrationId) {
    candidates.push({ type: 'COMPANY_REGISTRATION', value: identifiers.companyRegistrationId });
  }
  return candidates;
}

function normalizeEmail(value?: string | null) {
  const email = value?.trim().toLowerCase();
  if (!email) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function normalizeIndianMobile(value?: string | null) {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (!digits) return undefined;
  const lastTen = digits.length >= 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(lastTen)) return undefined;
  return `+91${lastTen}`;
}

function normalizeUpper(value?: string | null) {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, '');
  return normalized || undefined;
}

function normalizeCompanyName(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
}
