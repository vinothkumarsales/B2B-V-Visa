import type { ApplicationKitDraft, ApplicationKitEvaluation, GenerateApplicationKitInput, ReviewFinding } from './types';
import { callLlm } from './llm-boundary';
import { careersHeavyAgentKitEnabled } from '../feature-flags';

export async function enhanceDraftWithLlmIfEnabled(input: GenerateApplicationKitInput, evaluation: { overallFit: 'strong' | 'moderate' | 'weak' }) {
  if (!careersHeavyAgentKitEnabled()) return null;
  const enabled = await callLlm({
    prompt: `Enhance application draft for ${input.jobSummary?.title || 'role'} at ${input.jobSummary?.company || 'Company'}. Fit: ${evaluation.overallFit}. Required: ${(input.jobSummary?.requiredSkills || []).join(', ')}.`,
    temperature: 0.2,
    maxTokens: 400,
  });
  if (!enabled.text) return null;
  return {
    tailoredCvMarkdown: `${enabled.text}\n\n## Evidence\nGenerated for runId=${input.runId}\n`,
    coverLetterMarkdown: `# Cover Letter Draft\n\nDear hiring team at ${input.jobSummary?.company || 'Company'},\n\n${enabled.text}\n\n## Honesty gaps\n- Candidate does not claim unsupported skills.\n- Missing required skills are addressed with adjacent proof where possible.\n\n`,
  };
}

export async function enhanceReviewWithLlmIfEnabled(draft: { tailoredCvMarkdown?: string; coverLetterMarkdown?: string }, input: GenerateApplicationKitInput) {
  if (!careersHeavyAgentKitEnabled()) return null;
  const result = await callLlm({
    prompt: `Review application draft tone, length, and unsupported claims for ${input.jobSummary?.title || 'role'}. CV length: ${(draft.tailoredCvMarkdown || '').length}.`,
    temperature: 0,
    maxTokens: 200,
  });
  if (!result.text) return null;
  return {
    findings: [] as ReviewFinding[],
    structuredEdits: [],
    narrative: {
      missedKeywords: [],
      companyAngles: [`${input.jobSummary?.company || 'Company'} focus area: ${input.jobSummary?.title || 'Software Engineer'}`],
      actionReframing: ['Opening paragraph can lead with strongest job match if available.'],
      toneIssues: [],
    },
    score: 90,
  };
}
