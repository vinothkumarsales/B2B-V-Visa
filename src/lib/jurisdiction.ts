import type { VisaJurisdictionRule, VisaType } from '@/types';

export type JurisdictionResolutionStatus = 'RESOLVED' | 'MANUAL_REVIEW' | 'NOT_REQUIRED';

export interface JurisdictionResolutionInput {
  residenceCountry?: string;
  residenceState?: string;
  residenceCity?: string;
  postalCode?: string;
  passportIssueState?: string;
  passportIssueCity?: string;
}

export interface JurisdictionResolution {
  status: JurisdictionResolutionStatus;
  rule?: VisaJurisdictionRule;
  reason?: string;
}

function normalize(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function includesNormalized(values: string[] | undefined, value?: string): boolean {
  const target = normalize(value);
  if (!target || !values?.length) return false;
  return values.some((entry) => normalize(entry) === target);
}

function postalMatches(prefixes: string[] | undefined, postalCode?: string): boolean {
  const target = normalize(postalCode).replace(/\s+/g, '');
  if (!target || !prefixes?.length) return false;
  return prefixes.some((prefix) => target.startsWith(normalize(prefix).replace(/\s+/g, '')));
}

export function resolveVisaJurisdiction(
  visa: VisaType,
  input: JurisdictionResolutionInput
): JurisdictionResolution {
  const rules = (visa.jurisdictions ?? [])
    .filter((rule) => rule.isActive)
    .sort((left, right) => left.priority - right.priority);

  if (!rules.length) return { status: 'NOT_REQUIRED' };

  const exactPostal = rules.find((rule) => postalMatches(rule.applicantPostalCodePrefixes, input.postalCode));
  if (exactPostal) return { status: 'RESOLVED', rule: exactPostal };

  const exactCity = rules.find((rule) => includesNormalized(rule.applicantResidenceCities, input.residenceCity));
  if (exactCity) return { status: 'RESOLVED', rule: exactCity };

  const exactState = rules.find(
    (rule) =>
      includesNormalized(rule.applicantResidenceStates, input.residenceState) ||
      includesNormalized(rule.applicantResidenceUnionTerritories, input.residenceState)
  );
  if (exactState) return { status: 'RESOLVED', rule: exactState };

  const passportRule = rules.find(
    (rule) =>
      includesNormalized(rule.passportIssueStates, input.passportIssueState) ||
      includesNormalized(rule.passportIssueCities, input.passportIssueCity)
  );
  if (passportRule) return { status: 'RESOLVED', rule: passportRule };

  const countryRule = rules.find((rule) => includesNormalized(rule.applicantResidenceCountries, input.residenceCountry));
  if (countryRule && !countryRule.isFallback) return { status: 'RESOLVED', rule: countryRule };

  const fallback = rules.find((rule) => rule.isFallback);
  if (fallback) {
    return fallback.verificationStatus === 'REVIEW_REQUIRED'
      ? { status: 'MANUAL_REVIEW', rule: fallback, reason: 'Jurisdiction verification required' }
      : { status: 'RESOLVED', rule: fallback };
  }

  return { status: 'MANUAL_REVIEW', reason: 'Jurisdiction verification required' };
}
