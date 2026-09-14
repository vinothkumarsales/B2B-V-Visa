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
  applicationKitStatus: string;
  internalReviewStatus: string;
  applicationStage: string;
  status: string;
  nextStep: string;
};

export type CareersDemoMaterial = {
  title: string;
  status: string;
  snippet: string;
};

export type CareersDemoAgent = {
  name: string;
  status: 'Completed' | 'In progress' | 'Review required' | 'Approved with notes';
  action: string;
  result: string;
  output: string;
  completedAt: string;
  confidence: string;
  next: string;
};

export type CareersDemoApplicationAnswer = {
  question: string;
  answer: string;
  status: string;
};

export const careersDemoCandidate = {
  name: 'Manoj Kumar',
  currentRole: 'Software Engineer',
  targetRegion: 'Europe',
  targetRoles: ['Backend Engineer', 'Full Stack Developer', 'Software Engineer'],
  experience: '5 years',
  skills: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'PostgreSQL', 'REST APIs', 'Git', 'Cloud basics', 'Agile delivery', 'API integrations'],
  preferredCountries: ['Germany', 'Netherlands', 'Ireland', 'Sweden'],
  missingInformation: ['Notice period', 'Expected salary', 'Relocation preference confirmation', 'Work authorisation details'],
  reviewStatus: 'Internal review ready',
  confidenceScore: '91%',
  professionalSummary: 'Software Engineer with 5 years of experience building API-driven web applications using Node.js, TypeScript, React, PostgreSQL, and REST integrations.',
  workExperience: ['Backend API development', 'React product interfaces', 'PostgreSQL data modelling', 'Agile delivery with cross-functional teams'],
};

export const careersDemoAgents: CareersDemoAgent[] = [
  {
    name: 'Candidate Intake Agent',
    status: 'Completed',
    action: 'Created candidate profile from resume and onboarding preferences.',
    result: 'Candidate profile created from resume',
    output: '92% profile completeness',
    completedAt: '09:02 AM demo time',
    confidence: 'High',
    next: 'Missing current notice period',
  },
  {
    name: 'Resume Extraction Agent',
    status: 'Completed',
    action: 'Extracted work history, skills, target roles, and missing fields.',
    result: '5 years experience, 10 skills, 3 target roles extracted',
    output: '91% extraction confidence',
    completedAt: '09:03 AM demo time',
    confidence: 'High',
    next: 'Confirm salary and authorisation details',
  },
  {
    name: 'Job Discovery Agent',
    status: 'Completed',
    action: 'Loaded fixture Europe opportunities without contacting external portals.',
    result: '48 fixture jobs discovered',
    output: '18 jobs moved to evaluation',
    completedAt: '09:04 AM demo time',
    confidence: 'Demo fixture',
    next: 'Evaluate match and eligibility',
  },
  {
    name: 'Job Evaluation Agent',
    status: 'Completed',
    action: 'Scored opportunities against target roles, skills, and location preferences.',
    result: '6 jobs shortlisted',
    output: 'Top fit score 4.6',
    completedAt: '09:05 AM demo time',
    confidence: 'High',
    next: 'Review sponsorship language',
  },
  {
    name: 'Sponsorship Fit Agent',
    status: 'Review required',
    action: 'Flagged sponsorship and work-authorisation uncertainty for human review.',
    result: '4 roles require eligibility review',
    output: 'No legal answer auto-filled',
    completedAt: '09:06 AM demo time',
    confidence: 'Conservative',
    next: 'Candidate must confirm authorisation details',
  },
  {
    name: 'Application Kit Agent',
    status: 'Completed',
    action: 'Prepared cover letter, recruiter email draft, and application answers.',
    result: '4 cover letters, 4 email drafts, 12 answers prepared',
    output: 'Unsupported claims: 0',
    completedAt: '09:07 AM demo time',
    confidence: 'High',
    next: 'Route generated material to internal review',
  },
  {
    name: 'Internal Review Agent',
    status: 'Approved with notes',
    action: 'Checked generated content for unsupported claims and missing candidate inputs.',
    result: '4 application kits reviewed',
    output: '3 approved, 1 needs candidate input',
    completedAt: '09:08 AM demo time',
    confidence: 'Human-review ready',
    next: 'Do not submit salary/sponsorship answers without confirmation',
  },
  {
    name: 'Tracking Agent',
    status: 'In progress',
    action: 'Tracks fixture application stages, employer response, and candidate tasks.',
    result: '3 demo submissions tracked, 1 employer response',
    output: '2 candidate tasks open',
    completedAt: '09:09 AM demo time',
    confidence: 'Demo fixture',
    next: 'Candidate confirms interview availability',
  },
];

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
    applicationKitStatus: 'Application kit ready',
    internalReviewStatus: 'Internal review approved',
    applicationStage: 'Submitted demo',
    status: 'Submitted',
    nextStep: 'Await employer response',
  },
  {
    role: 'Full Stack Developer',
    company: 'CanalWorks Studio',
    location: 'Amsterdam, Netherlands',
    score: '4.4',
    sponsorship: 'Relocation possible',
    applicationKitStatus: 'Application kit ready',
    internalReviewStatus: 'Internal review approved',
    applicationStage: 'Awaiting demo submission',
    status: 'Application kit preparing',
    nextStep: 'Review tailored resume',
  },
  {
    role: 'Platform Engineer',
    company: 'HarborGrid Cloud',
    location: 'Dublin, Ireland',
    score: '4.2',
    sponsorship: 'Existing work rights unclear',
    applicationKitStatus: 'Application answers prepared',
    internalReviewStatus: 'Review required',
    applicationStage: 'Candidate action required',
    status: 'Internal review',
    nextStep: 'Check eligibility notes',
  },
  {
    role: 'Software Engineer',
    company: 'Nordline Systems',
    location: 'Stockholm, Sweden',
    score: '4.1',
    sponsorship: 'Review needed',
    applicationKitStatus: 'Application kit preparing',
    internalReviewStatus: 'Pending review',
    applicationStage: 'Shortlisted',
    status: 'Shortlisted',
    nextStep: 'Prepare application kit',
  },
  {
    role: 'Node.js Developer',
    company: 'Vistula Tech',
    location: 'Warsaw, Poland',
    score: '4.0',
    sponsorship: 'Good role fit',
    applicationKitStatus: 'Not started',
    internalReviewStatus: 'Not reviewed',
    applicationStage: 'Evaluated',
    status: 'Evaluated',
    nextStep: 'Shortlist decision',
  },
  {
    role: 'React Engineer',
    company: 'Atlantic Product Co.',
    location: 'Lisbon, Portugal',
    score: '3.9',
    sponsorship: 'Below shortlist threshold',
    applicationKitStatus: 'Not prepared',
    internalReviewStatus: 'Below threshold',
    applicationStage: 'Below threshold',
    status: 'Awaiting employer response',
    nextStep: 'Keep as backup',
  },
];

export const careersDemoMetrics = [
  ['Resume parsed', '1'],
  ['Extracted skills', '10'],
  ['Jobs discovered', '48'],
  ['Jobs evaluated', '18'],
  ['Shortlisted', '6'],
  ['Cover letters generated', '4'],
  ['Email drafts generated', '4'],
  ['Application answers prepared', '12'],
  ['Internal reviews completed', '4'],
  ['Demo submissions tracked', '3'],
  ['Employer responses', '1'],
  ['Candidate tasks', '2'],
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

export const careersDemoCoverLetter = {
  jobTitle: 'Backend Engineer',
  company: 'Northbridge Labs GmbH',
  location: 'Berlin, Germany',
  generatedBy: 'Application Kit Agent',
  reviewStatus: 'Approved',
  unsupportedClaims: '0',
  candidateActionRequired: 'No',
  body: [
    'Dear Hiring Team,',
    'I am writing to express interest in the Backend Engineer role at Northbridge Labs GmbH. My background in Node.js, TypeScript, REST API development, PostgreSQL, and production-focused web applications aligns well with the requirements of the role.',
    'In my recent work, I have contributed to API-driven product features, database-backed workflows, and integrations that require reliability, maintainability, and clear collaboration with product and operations teams.',
    'I would welcome the opportunity to discuss how my backend engineering experience can support your team in Berlin.',
    'Sincerely,',
    'Manoj Kumar',
  ],
};

export const careersDemoRecruiterEmail = {
  to: 'recruiter@example.com',
  subject: 'Application for Backend Engineer - Manoj Kumar',
  status: 'Internal review approved',
  mailboxDraft: 'Planned / demo only',
  attachments: ['Tailored resume', 'Cover letter'],
  bodyPreview: 'Hello, I am sharing Manoj Kumar for the Backend Engineer role at Northbridge Labs GmbH. His experience includes Node.js, TypeScript, REST APIs, PostgreSQL, and production web applications. Please find the tailored resume and cover letter prepared for review.',
};

export const careersDemoApplicationAnswers: CareersDemoApplicationAnswer[] = [
  {
    question: 'Why are you interested in this role?',
    answer: 'I am interested in this Backend Engineer role because it matches my experience in building API-driven applications using Node.js, TypeScript, and PostgreSQL, and it offers the opportunity to work on reliable backend systems in a European product environment.',
    status: 'Prepared',
  },
  {
    question: 'Do you require visa sponsorship?',
    answer: 'This requires candidate confirmation before submission.',
    status: 'Candidate input required',
  },
  {
    question: 'What is your expected salary?',
    answer: 'Candidate input required. Not auto-filled.',
    status: 'Blocked for candidate input',
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
