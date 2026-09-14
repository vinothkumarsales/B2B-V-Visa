export type LangGraphNode =
  | 'start'
  | 'evaluate'
  | 'draft'
  | 'review'
  | 'revise'
  | 'ats'
  | 'complete'
  | 'failed'
  | 'hitl_review';

export type LangGraphTransition =
  | 'to_evaluate'
  | 'to_draft'
  | 'to_review'
  | 'to_revise'
  | 'to_ats'
  | 'to_complete'
  | 'to_failed'
  | 'to_hitl_review'
  | 'resume_after_hitl';

export type LangGraphState = {
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
  node: LangGraphNode;
  status: 'running' | 'paused' | 'completed' | 'failed';
  hitlApproved?: boolean;
  hitlNote?: string;
  input: {
    postingTrustScore: 'clean' | 'suspicious' | 'rejected';
    trustedBoundaryViolation?: boolean;
  };
  output: {
    overallFit?: 'strong' | 'moderate' | 'weak';
    blockers?: number;
    warnings?: number;
    atsKeywordDensity?: number;
    finalStatus?: 'reviewed' | 'revised' | 'failed';
  };
  checkpointKey?: string;
  updatedAt: string;
};

export type LangGraphCheckpoint = {
  key: string;
  state: LangGraphState;
  createdAt: string;
};
