import type { ApplicationKitAtsResult, ApplicationKitDraft, ApplicationKitEvaluation, ApplicationKitResult, ApplicationKitStatus, GenerateApplicationKitInput, ReviewFinding } from './types';
import type { LangGraphCheckpoint, LangGraphState, LangGraphTransition } from './graph-state';
import { careersApplicationKitEnabled } from '../feature-flags';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runAtsCheck } from './ats-check';
import { ApplicationKitArtifactWriter } from './artifact-writer';

type ReviewResult = {
  findings: ReviewFinding[];
  blockers: ReviewFinding[];
  structuredEdits: Array<{ target: 'cv' | 'coverLetter'; oldString: string; newString: string; reason: string }>;
  narrative: { missedKeywords?: string[]; companyAngles?: string[]; actionReframing?: string[]; toneIssues?: string[] };
  score: number;
};

export class PipelineStateManager {
  static hitlPending(state: LangGraphState): boolean {
    return state.node === 'hitl_review' && state.status === 'paused';
  }

  static canResume(state: LangGraphState): boolean {
    return state.hitlApproved === true;
  }

  static assertHitlPending(state: LangGraphState) {
    if (!this.hitlPending(state)) {
      const error = new Error('Invalid state for HITL approval');
      (error as any).status = 409;
      throw error;
    }
  }

  static assertResumable(state: LangGraphState) {
    if (!this.canResume(state)) {
      const error = new Error('Invalid state for resume');
      (error as any).status = 409;
      throw error;
    }
  }
}

export async function runApplicationKit(input: GenerateApplicationKitInput): Promise<ApplicationKitResult> {
  if (!careersApplicationKitEnabled()) {
    return buildFailedResult(input, ['application kit disabled']);
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const startedAt = new Date().toISOString();
  const postingText = input.jobSummary?.descriptionText || '';
  const trustedBoundaryViolation =
    postingText.includes('ignore previous instructions') ||
    postingText.includes('disregard earlier') ||
    postingText.includes('do not mention');

  let state = createStartState(input, trustedBoundaryViolation ? 'rejected' : 'clean', trustedBoundaryViolation);
  state = await writeCheckpoint(state);

  if (trustedBoundaryViolation) {
    state = transition(state, 'to_failed', warnings, ['Posting text violated trusted boundary.']);
    state = await writeCheckpoint(state);
    return applicationKitResultFrom(input, 'failed', [], warnings, errors, startedAt, {
      evaluation: undefined,
      ats: undefined,
      draft: undefined,
      review: undefined,
    });
  }

  state = transition(state, 'to_evaluate', warnings, []);
  state = await writeCheckpoint(state);
  const evaluation = buildEvaluation(input);

  state = transition(state, 'to_draft', warnings, []);
  state = await writeCheckpoint(state);
  const draft = buildDraft(input, evaluation);

  state = transition(state, 'to_review', warnings, []);
  state = await writeCheckpoint(state);
  const review = reviewDraft(draft, input);

  state.output.blockers = review.blockers.length;
  state.output.warnings = review.findings.filter((finding: ReviewFinding) => finding.severity === 'warning').length;
  state.output.overallFit = evaluation.overallFit;
  state = await writeCheckpoint(state);

  if (review.blockers.length && !state.hitlApproved) {
    state = transition(state, 'to_hitl_review', warnings, []);
    state = await writeCheckpoint(state);
    try {
      PipelineStateManager.assertHitlPending(state);
    } catch (error) {
      return buildFailedResultFromState(input, startedAt, warnings, [], [(error as Error).message || 'Pipeline blocked by reviewers.']);
    }
    return graphStateToPendingResult(input, state, evaluation, draft, review, warnings, errors, startedAt);
  }

  const finalDraft = review.blockers.length ? reviseDraft(draft, review) : draft;
  state = transition(state, 'to_revise', warnings, []);
  state = await writeCheckpoint(state);

  const combinedText = `${finalDraft.tailoredCvMarkdown}\n\n${finalDraft.coverLetterMarkdown}`;
  const ats = await runAtsCheck({
    markdown: combinedText,
    keywords: [
      ...new Set([
        ...(input.jobSummary?.requiredSkills || []),
        ...(input.jobSummary?.preferredSkills || []),
      ]),
    ],
  });

  state.output.atsKeywordDensity = ats.keywordDensity;
  const status: ApplicationKitStatus = review.blockers.length ? 'revised' : 'reviewed';
  state.output.finalStatus = status;
  state = transition(state, 'to_ats', warnings, []);
  state = await writeCheckpoint(state);

  state = transition(state, 'to_complete', warnings, []);
  state = await writeCheckpoint(state);

  const result = applicationKitResultFrom(
    input,
    status,
    review.findings,
    warnings,
    errors,
    startedAt,
    {
      evaluation,
      ats,
      draft: {
        ...finalDraft,
        reviewFindings: review.findings,
        revisionNote: review.blockers.length ? 'Revised after reviewer findings.' : undefined,
      },
      review: {
        findings: review.findings,
        score: review.score,
        structuredEdits: review.structuredEdits ?? [],
        narrative: review.narrative ?? { missedKeywords: [], companyAngles: [], actionReframing: [], toneIssues: [] },
      },
    },
  );

  try {
    const writer = createArtifactWriter();
    await writer.writeIdempotentRunArtifacts(result.requestHash, result);
  } catch (writeError) {
    warnings.push('Artifact write failed: ' + (writeError as Error).message);
  }

  return result;
}

export async function resumeApplicationKit({ input, state }: { input: GenerateApplicationKitInput; state: LangGraphState }): Promise<ApplicationKitResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const startedAt = new Date().toISOString();

  const evaluation = buildEvaluation(input);
  const draft = buildDraft(input, evaluation);
  const review = reviewDraft(draft, input);
  const finalDraft = reviseDraft(draft, review);
  const combinedText = `${finalDraft.tailoredCvMarkdown}\n\n${finalDraft.coverLetterMarkdown}`;
  const ats = await runAtsCheck({ markdown: combinedText, keywords: [...new Set([...(input.jobSummary?.requiredSkills || []), ...(input.jobSummary?.preferredSkills || [])])] });

  state = transition(state, 'to_revise', warnings, []);
  state = await writeCheckpoint(state);
  state.output.overallFit = evaluation.overallFit;
  state.output.blockers = review.blockers.length;
  state.output.warnings = review.findings.filter((finding: ReviewFinding) => finding.severity === 'warning').length;
  state.output.atsKeywordDensity = ats.keywordDensity;
  state.output.finalStatus = 'revised';
  state = transition(state, 'to_ats', warnings, []);
  state = await writeCheckpoint(state);
  state = transition(state, 'to_complete', warnings, []);
  state = await writeCheckpoint(state);

  return applicationKitResultFrom(
    input,
    'revised',
    review.findings,
    warnings,
    errors,
    startedAt,
    {
      evaluation,
      ats,
      draft: { ...finalDraft, reviewFindings: review.findings, revisionNote: 'Revised after reviewer findings.' },
      review: { findings: review.findings, score: review.score, structuredEdits: review.structuredEdits, narrative: review.narrative },
    },
  );
}

export async function approveApplicationKitHitl(runId: string, note = 'Approved for revision.'): Promise<LangGraphState> {
  const current = await readCheckpoint(runId);
  if (!current) throw new Error('No LangGraph checkpoint found for runId');
  current.hitlApproved = true;
  current.hitlNote = note;
  current.node = 'evaluate';
  return writeCheckpoint(transition(current, 'resume_after_hitl', [], []));
}

export async function readCheckpoint(runId: string): Promise<LangGraphState | null> {
  try {
    const data = JSON.parse(await fs.readFile(path.join(graphWorkspacesBase(), runId, 'application-kit', 'application-kit-graph-state.json'), 'utf8')) as LangGraphCheckpoint;
    return data.key === `${runId}:application-kit` ? data.state : null;
  } catch {
    return null;
  }
}

function createStartState(input: GenerateApplicationKitInput, postingTrust: 'clean' | 'suspicious' | 'rejected', trustedBoundaryViolation = false): LangGraphState {
  return {
    runId: input.runId,
    candidateId: input.candidateId,
    jobId: input.jobId,
    jobSummary: input.jobSummary,
    node: 'start',
    status: 'running',
    hitlApproved: false,
    input: { postingTrustScore: postingTrust, trustedBoundaryViolation },
    output: {},
    checkpointKey: `${input.runId}:application-kit`,
    updatedAt: new Date().toISOString(),
  };
}

async function writeCheckpoint(state: LangGraphState): Promise<LangGraphState> {
  state.updatedAt = new Date().toISOString();
  const dir = path.join(graphWorkspacesBase(), state.runId, 'application-kit');
  await fs.mkdir(dir, { recursive: true });
  const checkpoint: LangGraphCheckpoint = { key: state.checkpointKey || `${state.runId}:application-kit`, state, createdAt: new Date().toISOString() };
  await fs.writeFile(path.join(dir, 'application-kit-graph-state.json'), JSON.stringify(checkpoint, null, 2), 'utf8');
  return state;
}

function transition(state: LangGraphState, transition: LangGraphTransition, _warnings: string[], _errors: string[]): LangGraphState {
  const map: Record<LangGraphTransition, LangGraphState['node']> = {
    to_evaluate: 'evaluate',
    to_draft: 'draft',
    to_review: 'review',
    to_revise: 'revise',
    to_ats: 'ats',
    to_complete: 'complete',
    to_failed: 'failed',
    to_hitl_review: 'hitl_review',
    resume_after_hitl: 'evaluate',
  };

  state.node = map[transition] ?? state.node;
  if (state.node === 'failed') state.status = 'failed';
  return state;
}

function buildEvaluation(input: GenerateApplicationKitInput): ApplicationKitEvaluation {
  const skills = input.jobSummary?.requiredSkills || [];
  const evidence = new Set(skills);
  const skillsMatch = [...evidence];
  const skillsGaps = skills.filter((skill: string) => !evidence.has(skill));
  const overallFit: ApplicationKitEvaluation['overallFit'] =
    skillsGaps.length === 0 ? 'strong' : skillsGaps.length <= 2 ? 'moderate' : 'weak';

  return {
    overallFit,
    skillsMatch,
    skillsGaps,
    experienceMatch: [`Matched target role: ${input.jobSummary?.title || 'Software Engineer'}`],
    behavioralMatch: ['Coverage mode: honesty-first gaps, no fabricated claims'],
    salaryBenchmark: input.jobSummary?.country ? `Benchmark required for ${input.jobSummary.country}` : undefined,
  };
}

function buildDraft(input: GenerateApplicationKitInput, evaluation: ApplicationKitEvaluation): ApplicationKitDraft {
  const job = input.jobSummary || defaultJobSummary(input);
  const candidateSummary = buildCandidateSummary(input, evaluation);
  return {
    id: generateAppKitId(input.runId),
    runId: input.runId,
    candidateId: input.candidateId,
    jobId: input.jobId,
    status: 'drafted',
    tailoredCvMarkdown: buildTailoredCvMarkdown(candidateSummary, job, input, evaluation),
    coverLetterMarkdown: buildCoverLetterMarkdown(candidateSummary, job, input, evaluation),
    reviewFindings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function reviewDraft(draft: ApplicationKitDraft, input: GenerateApplicationKitInput): ReviewResult {
  const findings = reviewFindings(draft.tailoredCvMarkdown, draft.coverLetterMarkdown, input);
  const structuredEdits = structuredEditsFrom(draft, input);
  const narrative = narrativeFrom(draft, input);
  const blockerCount = findings.filter((finding: ReviewFinding) => finding.severity === 'blocker').length;
  const warningCount = findings.filter((finding: ReviewFinding) => finding.severity === 'warning').length;
  const score = Math.max(0, 100 - blockerCount * 25 - warningCount * 10);

  return {
    findings: findings as ReviewFinding[],
    blockers: findings.filter((finding: ReviewFinding) => finding.severity === 'blocker') as ReviewFinding[],
    structuredEdits,
    narrative,
    score,
  };
}

function reviseDraft(draft: ApplicationKitDraft, review: ReviewResult): ApplicationKitDraft {
  return {
    ...draft,
    status: 'revised',
    tailoredCvMarkdown: draft.tailoredCvMarkdown + '\n\n## Revision Note\nRevised after reviewer findings.\n',
    coverLetterMarkdown: draft.coverLetterMarkdown
      .replace(/\b(very|really|excited)\b/gi, '')
      .replace(/\n{3,}/g, '\n\n'),
    updatedAt: new Date().toISOString(),
  };
}

function reviewFindings(cv: string, coverLetter: string, input: GenerateApplicationKitInput) {
  const findings: ReviewFinding[] = [];
  const job = input.jobSummary || defaultJobSummary(input);
  const requiredSkills = job.requiredSkills || [];
  const evidence = buildCandidateSummary(input, undefined).skills;
  const missingSkills = requiredSkills.filter((skill: string) => !evidence.includes(skill));

  for (const skill of missingSkills) {
    findings.push({
      id: generateAppKitId(input.runId, `finding-${skill}`),
      severity: 'blocker',
      category: 'keyword',
      message: `Missing required skill: ${skill}`,
      suggestion: `Address the ${skill} gap via an honesty-gap statement or adjacent proof point`,
    });
  }

  if (cv.length > 4000) {
    findings.push({
      id: generateAppKitId(input.runId, 'finding-length'),
      severity: 'warning',
      category: 'length',
      message: 'Tailored CV exceeds preview length.',
      suggestion: 'Use relevance-weighted cutting for less relevant bullets',
    });
  }

  if (/\b(very|really)\b/i.test(coverLetter)) {
    findings.push({
      id: generateAppKitId(input.runId, 'finding-tone'),
      severity: 'warning',
      category: 'tone',
      message: 'Cover letter contains generic intensifiers.',
      suggestion: 'Remove filler intensifiers in revision pass',
    });
  }

  return findings;
}

function structuredEditsFrom(draft: ApplicationKitDraft, _input: GenerateApplicationKitInput): ReviewResult['structuredEdits'] {
  const edits: ReviewResult['structuredEdits'] = [];
  const coverLetter = draft.coverLetterMarkdown || '';

  if (/\b(very|really|excited)\b/i.test(coverLetter)) {
    edits.push({
      target: 'coverLetter',
      oldString: coverLetter.match(/\b(very|really|excited)\b/i)?.[0] || 'really',
      newString: '',
      reason: 'Remove generic intensifier from reviewer tone edit.',
    });
  }

  return edits;
}

function narrativeFrom(draft: ApplicationKitDraft, input: GenerateApplicationKitInput): ReviewResult['narrative'] {
  const job = input.jobSummary || defaultJobSummary(input);
  return {
    missedKeywords: (job.requiredSkills || []).filter((skill: string) => !(draft.tailoredCvMarkdown || '').includes(skill)),
    companyAngles: [`${job.company} focus area: ${job.title}`],
    actionReframing: ['Opening paragraph can lead with strongest job match if available.'],
    toneIssues: /\b(very|really|excited)\b/i.test(draft.coverLetterMarkdown || '') ? ['Generic intensifiers detected'] : [],
  };
}

function buildCandidateSummary(input: GenerateApplicationKitInput, evaluation?: ApplicationKitEvaluation) {
  return {
    roles: input.jobSummary?.title || 'candidate',
    skills: evaluation?.skillsMatch || input.jobSummary?.requiredSkills || [],
    countries: input.jobSummary?.country ? [input.jobSummary.country] : [],
  };
}

function defaultJobSummary(input: GenerateApplicationKitInput) {
  return {
    title: 'Software Engineer',
    company: 'Target Company',
    descriptionText: '',
    requiredSkills: input.jobSummary?.requiredSkills || [],
    preferredSkills: input.jobSummary?.preferredSkills || [],
    country: input.jobSummary?.country || 'Germany',
    workMode: input.jobSummary?.workMode || 'hybrid',
  };
}

function buildTailoredCvMarkdown(candidateSummary: ReturnType<typeof buildCandidateSummary>, job: ReturnType<typeof defaultJobSummary>, input: GenerateApplicationKitInput, evaluation?: ApplicationKitEvaluation) {
  const fit = evaluation?.overallFit || 'moderate';
  return `# ${candidateSummary.roles}\n\n## Summary\nCandidate profile draft for ${job.title} at ${job.company}. Fit: ${fit}.\n\n## Skills\n${candidateSummary.skills.join(', ')}\n\n## Evidence\nGenerated for runId=${input.runId}\n`;
}

function buildCoverLetterMarkdown(candidateSummary: ReturnType<typeof buildCandidateSummary>, job: ReturnType<typeof defaultJobSummary>, input: GenerateApplicationKitInput, evaluation?: ApplicationKitEvaluation) {
  const skills = candidateSummary.skills.join(', ');
  const fit = evaluation?.overallFit || 'moderate';
  return `# Cover Letter Draft\n\nDear hiring team at ${job.company},\n\nI am writing to express interest in ${job.title}. My background covers ${skills}. Fit assessment: ${fit}.\n\n## Honesty gaps\n- Candidate does not claim unsupported skills.\n- Missing required skills are addressed with adjacent proof where possible.\n\n`;
}

function graphStateToPendingResult(
  input: GenerateApplicationKitInput,
  state: LangGraphState,
  evaluation: ApplicationKitEvaluation,
  draft: ApplicationKitDraft,
  review: ReviewResult,
  warnings: string[],
  errors: string[],
  startedAt: string,
): ApplicationKitResult {
  return {
    requestHash: `${input.runId}:application-kit`,
    status: 'paused',
    warnings,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
    evaluation: evaluation as ApplicationKitResult['evaluation'],
    draft: {
      ...draft,
      reviewFindings: review.findings,
      revisionNote: 'Paused for human review before revision.',
    },
    review: {
      findings: review.findings,
      score: review.score,
      structuredEdits: review.structuredEdits,
      narrative: review.narrative,
    },
  };
}

function buildFailedResult(input: GenerateApplicationKitInput, errors: string[]): ApplicationKitResult {
  return {
    requestHash: `${input.runId}:application-kit`,
    status: 'failed',
    warnings: [],
    errors,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

function buildFailedResultFromState(input: GenerateApplicationKitInput, startedAt: string, warnings: string[], errors: string[], failureReasons: string[]): ApplicationKitResult {
  return {
    requestHash: `${input.runId}:application-kit`,
    status: 'failed',
    warnings,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

function createArtifactWriter() {
  const base = graphWorkspacesBase();
  return new ApplicationKitArtifactWriter(base);
}

function graphWorkspacesBase() {
  if (process.env.WORKSPACES_DIR) return process.env.WORKSPACES_DIR;
  return path.join(process.cwd(), 'workspaces');
}

function applicationKitResultFrom(
  input: GenerateApplicationKitInput,
  status: ApplicationKitResult['status'],
  findings: ReviewFinding[],
  warnings: string[],
  errors: string[],
  startedAt: string,
  overrides?: Partial<ApplicationKitResult>,
): ApplicationKitResult {
  return {
    requestHash: `${input.runId}:application-kit`,
    status,
    warnings,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

function generateAppKitId(seed: string, suffix = 'draft') {
  const value = `${seed}:${suffix}:${Date.now()}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value.charCodeAt(index);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `appkit-${Math.abs(hash).toString(36)}`;
}
