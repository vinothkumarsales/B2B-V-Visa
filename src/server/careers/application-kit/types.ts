export type ApplicationKitStatus = 'pending' | 'drafted' | 'reviewed' | 'revised' | 'completed' | 'failed' | 'paused' | 'ready_for_review';

export type ApplicationKitEvaluation = {
  overallFit: 'strong' | 'moderate' | 'weak';
  skillsMatch: string[];
  skillsGaps: string[];
  experienceMatch: string[];
  behavioralMatch: string[];
  salaryBenchmark?: string;
};

export type ApplicationKitDraft = {
  id: string;
  runId: string;
  candidateId: string;
  jobId?: string;
  status: ApplicationKitStatus;
  tailoredCvMarkdown: string;
  coverLetterMarkdown: string;
  reviewFindings: ReviewFinding[];
  revisionNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewFinding = {
  id: string;
  severity: 'info' | 'warning' | 'blocker';
  category: 'keyword' | 'honesty_gap' | 'length' | 'structure' | 'tone';
  message: string;
  suggestion?: string;
};

export type ApplicationKitResult = {
  requestHash: string;
  status: ApplicationKitStatus;
  evaluation?: {
    overallFit: 'strong' | 'moderate' | 'weak';
    skillsMatch: string[];
    skillsGaps: string[];
    experienceMatch: string[];
    behavioralMatch: string[];
    salaryBenchmark?: string;
  };
  ats?: ApplicationKitAtsResult;
  draft?: ApplicationKitDraft;
  review?: {
    findings: ReviewFinding[];
    score: number;
    structuredEdits?: Array<{
      target: 'cv' | 'coverLetter';
      oldString: string;
      newString: string;
      reason: string;
    }>;
    narrative?: {
      missedKeywords?: string[];
      companyAngles?: string[];
      actionReframing?: string[];
      toneIssues?: string[];
    };
  };
  warnings: string[];
  errors: string[];
  startedAt: string;
  completedAt: string;
};

export type GenerateApplicationKitInput = {
  runId: string;
  candidateId: string;
  jobId?: string;
  jobSummary?: {
    title: string;
    company: string;
    descriptionText: string;
    requiredSkills: string[];
    preferredSkills: string[];
    country: string;
    workMode: string;
  };
};

export type ApplicationKitAtsResult = {
  readable: boolean;
  keywordHits: string[];
  keywordMisses: string[];
  keywordDensity: number;
  warnings: string[];
  errors: string[];
  keywordStatuses?: Array<{
    keyword: string;
    priority: 'required' | 'preferred';
    status: 'covered' | 'synonym-only' | 'missing (have it)' | 'missing (gap)';
    note?: string;
  }>;
};
