export type CareerProfileCompletionInput = {
  fullName: string;
  currentCountry: string;
  nationality: string;
  currentTitle: string;
  experienceYears: number;
  targetRoles: string[];
  sponsorshipRequired: boolean;
  relocationRequired: boolean;
};

export function careerProfileCompletion(input: CareerProfileCompletionInput) {
  const checks = [
    Boolean(input.fullName),
    Boolean(input.currentCountry),
    Boolean(input.nationality),
    Boolean(input.currentTitle),
    Number.isFinite(input.experienceYears),
    input.targetRoles.length > 0,
    typeof input.sponsorshipRequired === 'boolean',
    typeof input.relocationRequired === 'boolean',
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function careerCandidateFacingStatus(status: string) {
  const labels: Record<string, string> = {
    onboarding_started: 'Onboarding started',
    profile_processing: 'Profile processing',
    profile_needs_information: 'Your action is required',
    profile_ready: 'Profile ready',
    payment_pending: 'Payment pending',
    subscription_active: 'Search activated',
    blocked: 'Service paused',
    closed: 'Closed',
  };
  return labels[status] ?? 'Preparing your service';
}
