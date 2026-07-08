export type CareersDemoTimelineItem = {
  label: string;
  detail: string;
};

export type CareersDemoJob = {
  role: string;
  company: string;
  location: string;
  score: string;
  sponsorship: string;
  status: string;
  nextStep: string;
};

export type CareersDemoMaterial = {
  title: string;
  status: string;
  snippet: string;
};

export const careersDemoCandidate = {
  name: 'Manoj Kumar',
  targetRegion: 'Europe',
  targetRoles: ['Software Engineer', 'Backend Engineer', 'Full Stack Developer'],
  experience: '5 years',
  skills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'PostgreSQL', 'REST APIs', 'Cloud basics'],
  missingInformation: ['Preferred interview slots', 'Notice period confirmation', 'Work authorization declaration'],
  reviewStatus: 'Internal review ready',
};

export const careersDemoTimeline: CareersDemoTimelineItem[] = [
  { label: 'Resume uploaded', detail: 'Private fixture resume received for demo preview.' },
  { label: 'Profile extracted', detail: 'Candidate details, roles, skills, and missing fields identified.' },
  { label: 'Package selected', detail: 'Europe Job Search Pro selected in fixture mode.' },
  { label: 'Fixture payment captured', detail: 'No real payment processed; captured event is simulated.' },
  { label: 'Service activated', detail: 'Subscription and service request shown as active for the demo.' },
  { label: 'Setup queued', detail: 'Activation handoff is waiting for future workspace preparation.' },
  { label: 'Jobs discovered', detail: 'Fixture opportunities loaded from demo data only.' },
  { label: 'Applications prepared', detail: 'Application materials preview generated as static demo content.' },
  { label: 'Internal review', detail: 'Team review checkpoint shown before any submission claim.' },
  { label: 'Applications submitted', detail: 'Demo-only status; no external portal was contacted.' },
  { label: 'Employer response received', detail: 'Fixture employer response shown for presentation.' },
  { label: 'Interview task created', detail: 'Candidate action preview created without calendar integration.' },
];

export const careersDemoJobs: CareersDemoJob[] = [
  {
    role: 'Backend Engineer',
    company: 'Northbridge Labs GmbH',
    location: 'Berlin, Germany',
    score: '4.6',
    sponsorship: 'Sponsorship unclear/review',
    status: 'Submitted',
    nextStep: 'Await employer response',
  },
  {
    role: 'Full Stack Developer',
    company: 'CanalWorks Studio',
    location: 'Amsterdam, Netherlands',
    score: '4.4',
    sponsorship: 'Relocation possible',
    status: 'Application kit preparing',
    nextStep: 'Review tailored resume',
  },
  {
    role: 'Platform Engineer',
    company: 'HarborGrid Cloud',
    location: 'Dublin, Ireland',
    score: '4.2',
    sponsorship: 'Existing work rights unclear',
    status: 'Internal review',
    nextStep: 'Check eligibility notes',
  },
  {
    role: 'Software Engineer',
    company: 'Nordline Systems',
    location: 'Stockholm, Sweden',
    score: '4.1',
    sponsorship: 'Review needed',
    status: 'Shortlisted',
    nextStep: 'Prepare application kit',
  },
  {
    role: 'Node.js Developer',
    company: 'Vistula Tech',
    location: 'Warsaw, Poland',
    score: '4.0',
    sponsorship: 'Good role fit',
    status: 'Evaluated',
    nextStep: 'Shortlist decision',
  },
  {
    role: 'React Engineer',
    company: 'Atlantic Product Co.',
    location: 'Lisbon, Portugal',
    score: '3.9',
    sponsorship: 'Below shortlist threshold',
    status: 'Awaiting employer response',
    nextStep: 'Keep as backup',
  },
];

export const careersDemoMetrics = [
  ['Resume uploaded', '1'],
  ['Jobs discovered', '48'],
  ['Jobs evaluated', '18'],
  ['Shortlisted', '6'],
  ['Application kits prepared', '4'],
  ['Submitted', '3'],
  ['Employer responses', '1'],
  ['Interviews requested', '1'],
] as const;

export const careersDemoMaterials: CareersDemoMaterial[] = [
  {
    title: 'Tailored resume',
    status: 'Internal review approved',
    snippet: 'Prepared for Backend Engineer - Berlin with Node.js, PostgreSQL, REST APIs, and cloud project emphasis.',
  },
  {
    title: 'Cover letter',
    status: 'No unsupported claims found',
    snippet: 'Focused on backend ownership, API reliability, and cross-functional delivery without inventing experience.',
  },
  {
    title: 'Recruiter email',
    status: 'Candidate action not required',
    snippet: 'Concise introduction for the hiring team with role fit, availability note, and resume attachment placeholder.',
  },
  {
    title: 'Application answers',
    status: 'Internal review approved',
    snippet: 'Prepared answers for work mode, relocation interest, experience summary, and sponsorship review requirements.',
  },
];

export const careersDemoEuropeBenefits = [
  'Access to multiple job markets',
  'Demand for skilled professionals',
  'Mature hiring ecosystems',
  'International career exposure',
  'Long-term career mobility',
  'Relocation or sponsorship possibilities depending on role and employer',
];
