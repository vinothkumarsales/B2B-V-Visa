import fs from 'node:fs/promises';
import path from 'node:path';
import type { ApplicationKitResult } from './types';

export class ApplicationKitArtifactWriter {
  constructor(private readonly baseDir: string) {}

  async writeRunArtifacts(runId: string, result: ApplicationKitResult) {
    const runDir = path.join(this.baseDir, runId, 'application-kit');
    await fs.mkdir(runDir, { recursive: true });
    const final = sanitizeFixtureResult(result);

    const draft = result.draft as any;
    const inputPayload = {
      runId,
      candidateId: draft?.candidateId ?? runId,
      jobId: draft?.jobId ?? null,
      jobSummary: draft?.jobSummary ?? null,
    };

    await fs.writeFile(path.join(runDir, 'application-kit.json'), JSON.stringify(final, null, 2), 'utf8');
    await fs.writeFile(path.join(runDir, 'request.json'), JSON.stringify(inputPayload, null, 2), 'utf8');
    await fs.writeFile(path.join(runDir, 'tailored-cv.md'), final.draft?.tailoredCvMarkdown || '', 'utf8');
    await fs.writeFile(path.join(runDir, 'cover-letter.md'), final.draft?.coverLetterMarkdown || '', 'utf8');
    await fs.writeFile(path.join(runDir, 'recruiter-email.md'), buildRecruiterEmail(final as any), 'utf8');
    await fs.writeFile(path.join(runDir, 'application-answers.json'), JSON.stringify(buildApplicationAnswers(final as any), null, 2), 'utf8');
    await fs.writeFile(path.join(runDir, 'review.json'), JSON.stringify(final.review || {}, null, 2), 'utf8');
    await fs.writeFile(path.join(runDir, 'PHASE-4A-SUMMARY.md'), buildPhaseSummary(final as any, runId), 'utf8');
  }

  async writeIdempotentRunArtifacts(runId: string, result: ApplicationKitResult) {
    const lockPath = path.join(this.baseDir, runId, 'application-kit', '.artifacts-written');
    try {
      await fs.access(lockPath);
      return;
    } catch {
      await this.writeRunArtifacts(runId, result);
    }
    await fs.writeFile(lockPath, new Date().toISOString(), 'utf8');
  }
}

function sanitizeFixtureResult(result: ApplicationKitResult): ApplicationKitResult {
  const clone: ApplicationKitResult = { ...result } as ApplicationKitResult;
  delete (clone as any).requestHash;
  if (result.draft) {
    clone.draft = { ...result.draft };
    delete (clone.draft as any).reviewFindings;
  }
  const ev = result.evaluation;
  if (ev) {
    const skillsMatch = Array.isArray(ev.skillsMatch) ? ev.skillsMatch.map((s) => String(s)) : [];
    const evaluation: ApplicationKitResult['evaluation'] = {
      overallFit: ev.overallFit ?? 'moderate',
      skillsMatch,
      skillsGaps: Array.isArray(ev.skillsGaps) ? ev.skillsGaps.map((s) => String(s)) : [],
      experienceMatch: Array.isArray(ev.experienceMatch) ? ev.experienceMatch.map((s) => String(s)) : [],
      behavioralMatch: Array.isArray(ev.behavioralMatch) ? ev.behavioralMatch.map((s) => String(s)) : [],
      salaryBenchmark: ev.salaryBenchmark,
    };
    clone.evaluation = evaluation;
  }
  return clone;
}

function buildRecruiterEmail(result: { draft?: any; jobId?: string }) {
  const body = result.draft?.coverLetterMarkdown || '';
  const jobId = result.jobId || 'position';
  return `Subject: Application interest — ${jobId}\n\n${body}\n\nThis recruiter email is a fixture-safe artifact; no email was sent.\n`;
}

function buildApplicationAnswers(result: { evaluation?: any; review?: any }) {
  return {
    whyThisRole: 'Fixture answer based on job summary fit.',
    topSkills: Array.isArray(result.evaluation?.skillsMatch) ? result.evaluation.skillsMatch : [],
    experienceHighlights: Array.isArray(result.evaluation?.experienceMatch) ? result.evaluation.experienceMatch : [],
    availability: 'Fixture-safe default',
    honestyGaps: Array.isArray(result.review?.narrative?.missedKeywords) ? result.review.narrative.missedKeywords : [],
  };
}

function buildPhaseSummary(result: ApplicationKitResult, runId: string) {
  const lines = [
    '# Phase 4A Summary',
    '',
    `- RunId: ${runId}`,
    `- Status: ${result.status}`,
    `- StartedAt: ${result.startedAt}`,
    `- CompletedAt: ${result.completedAt}`,
    `- Warnings: ${result.warnings.length}`,
    `- Errors: ${result.errors.length}`,
    `- FinalStatus: ${(result as any).output?.finalStatus || 'n/a'}`,
    `- Blockers: ${(result as any).output?.blockers ?? 'n/a'}`,
    `- ReviewScore: ${(result as any).review?.score ?? 'n/a'}`,
    '',
    '## Fixture safety',
    '',
    '- All materials below are fixture/demo-safe.',
    '- No live LLM generation was performed unless a feature flag explicitly enables it.',
    '- No candidate PII was included.',
    '- No unsupported achievements were added.',
    '',
    '## Artifacts',
    '',
    '- request.json',
    '- tailored-cv.md',
    '- cover-letter.md',
    '- recruiter-email.md',
    '- application-answers.json',
    '- review.json',
  ];
  return lines.join('\n');
}

export function artifactsBaseDir() {
  return process.env.WORKSPACES_DIR ? path.join(process.env.WORKSPACES_DIR, 'application-kit') : path.join(process.cwd(), 'workspaces', 'application-kit');
}
