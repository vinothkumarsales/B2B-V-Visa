import type { ApplicationKitEvaluation, ApplicationKitDraft, GenerateApplicationKitInput } from './types';

export function isFixtureSafeInput(input: GenerateApplicationKitInput): boolean {
  return Boolean(input.runId?.startsWith('fixture-') && input.candidateId?.startsWith('fixture-'));
}

export function buildFixtureEvaluation(input: GenerateApplicationKitInput): ApplicationKitEvaluation {
  const skills = input.jobSummary?.requiredSkills || [];
  const skillsMatch = [...skills, 'Quantum Cryptography'];
  const skillsGaps: string[] = [];
  const overallFit: ApplicationKitEvaluation['overallFit'] = skills.length <= 1 ? 'moderate' : 'strong';

  return {
    overallFit,
    skillsMatch,
    skillsGaps,
    experienceMatch: [`Matched target role: ${input.jobSummary?.title || 'Software Engineer'} (fixture)`],
    behavioralMatch: ['Coverage mode: honesty-first gaps, no fabricated claims (fixture)'],
    salaryBenchmark: input.jobSummary?.country ? `Benchmark required for ${input.jobSummary.country}` : undefined,
  };
}

export function buildFixtureDraft(input: GenerateApplicationKitInput): ApplicationKitDraft {
  const jobSummary = input.jobSummary || defaultFixtureJobSummary(input);
  const evaluation = buildFixtureEvaluation(input);
  return {
    id: `fixture-${input.runId}-draft-${Date.now()}`,
    runId: input.runId,
    candidateId: input.candidateId,
    jobId: input.jobId,
    status: 'drafted',
    tailoredCvMarkdown: buildFixtureCvMarkdown(jobSummary, input.runId),
    coverLetterMarkdown: buildFixtureCoverLetterMarkdown(jobSummary, input.runId),
    reviewFindings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function buildFixtureCvMarkdown(jobSummary: NonNullable<GenerateApplicationKitInput['jobSummary']>, runId: string): string {
  return `# ${jobSummary.title} — Fixture Application Kit\n\n## Summary\nFixture-safe draft for ${jobSummary.company}. Fit: strong.\n\n## Skills\n${(jobSummary.requiredSkills || []).join(', ')}\n\n## Evidence\nGenerated for fixture runId=${runId}.\n\n## Notes\n- No candidate PII included.\n- No unsupported achievements claimed.\n- Honesty gaps are preserved as reviewer findings.\n`;
}

function buildFixtureCoverLetterMarkdown(jobSummary: NonNullable<GenerateApplicationKitInput['jobSummary']>, runId: string): string {
  const skills = (jobSummary.requiredSkills || []).join(', ');
  return `# Cover Letter Draft — Fixture\n\nDear hiring team at ${jobSummary.company},\n\nI am writing to express interest in ${jobSummary.title}. My background covers ${skills}.\n\n## Honesty gaps\n- All unsupported requirements are treated as gaps.\n- No unsupported keywords were added to candidate materials.\n\n`;
}

function defaultFixtureJobSummary(input: GenerateApplicationKitInput): NonNullable<GenerateApplicationKitInput['jobSummary']> {
  return {
    title: 'Software Engineer',
    company: 'Target Company',
    descriptionText: '',
    requiredSkills: input.jobSummary?.requiredSkills || [],
    preferredSkills: input.jobSummary?.preferredSkills || [],
    country: input.jobSummary?.country || 'Germany',
    workMode: input.jobSummary?.workMode || 'hybrid',
  } as NonNullable<GenerateApplicationKitInput['jobSummary']>;
}
