export type MittoFeatureStatus = 'Available' | 'Demo mode' | 'Behind feature flag' | 'Coming next';

export const mittoJourney = [
  ['Upload résumé', 'Submit your résumé and basic career preferences.'],
  ['Profile intelligence', 'We extract skills, experience, target roles, and missing information.'],
  ['Job discovery', 'Relevant opportunities are discovered and scored against your profile.'],
  ['Application kit', 'Tailored CV, cover letter, recruiter email, and answers are prepared.'],
  ['Human review + tracking', 'Nothing moves forward without review. You see progress and next actions.'],
] as const;

export const mittoFeatures: Array<{ title: string; detail: string; status: MittoFeatureStatus }> = [
  { title: 'Candidate onboarding', detail: 'Structured profile, role, country, sponsorship, and relocation intake.', status: 'Available' },
  { title: 'Résumé upload', detail: 'Private document intake attached to the candidate workspace.', status: 'Available' },
  { title: 'Package + activation', detail: 'Fixture checkout, signed webhook foundation, subscription, and service handoff.', status: 'Available' },
  { title: 'CareerOps workspace', detail: 'Isolated candidate workspace with validated manifests and state transitions.', status: 'Available' },
  { title: 'Discovery interface', detail: 'Provider boundary, fixture jobs, normalization, scoring, and duplicate protection.', status: 'Available' },
  { title: 'Agent review team', detail: 'Researcher, analyst, reviewer, and Hermes orchestration activity.', status: 'Demo mode' },
  { title: 'Résumé intelligence', detail: 'Extraction preview, missing fields, fit signals, and sponsorship review.', status: 'Demo mode' },
  { title: 'Application kit', detail: 'Tailored CV, cover letter, recruiter email, and application answers.', status: 'Behind feature flag' },
  { title: 'Human approval', detail: 'Immutable preview hashes, approval/resume, evidence, and duplicate guards.', status: 'Behind feature flag' },
  { title: 'Live discovery', detail: 'Firecrawl provider and external discovery remain explicitly gated.', status: 'Behind feature flag' },
  { title: 'Application execution', detail: 'Controlled portal execution exists but stays disabled until approved.', status: 'Coming next' },
  { title: 'Response + interview sync', detail: 'Employer monitoring, calendar tasks, Zoho CRM, and WorkDrive sync.', status: 'Coming next' },
];

export const prohibitedMittoClaims = ['guaranteed job', 'guaranteed visa', 'automatic job submission live'];
