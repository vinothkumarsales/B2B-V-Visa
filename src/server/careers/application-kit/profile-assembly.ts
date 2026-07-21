import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import type { GenerateApplicationKitInput } from './types';
import { careersApplicationKitEnabled, careersFeatureSnapshot } from '../feature-flags';

export const PIPELINE_PHASE = '4B' as const;
export const PIPELINE_LABEL = 'Phase 4B: profile-backed kit generation';

export class Phase4BAssemblyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Phase4BAssemblyError';
  }
}

export function normalizeStringArray(raw: unknown, maxItems = 80): string[] {
  if (!Array.isArray(raw)) return [];
  const out = raw.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(out)).slice(0, maxItems);
}

export function buildApplicationKitInputFromProfile({
  candidateId,
  runId,
  jobId,
  jobSummary,
  candidateProfile,
}: {
  candidateId: string;
  runId: string;
  jobId?: string;
  jobSummary?: {
    title?: string;
    company?: string;
    descriptionText?: string;
    requiredSkills?: unknown;
    preferredSkills?: unknown;
    country?: string;
    workMode?: string;
  };
  candidateProfile?: {
    currentTitle?: string;
    targetRegion?: string;
    targetRoles?: string[];
    skills?: unknown;
  };
}): GenerateApplicationKitInput {
  const requiredSkills = normalizeStringArray(jobSummary?.requiredSkills);
  const preferredSkills = normalizeStringArray(jobSummary?.preferredSkills);

  return {
    runId,
    candidateId,
    jobId,
    jobSummary: {
      title: jobSummary?.title || candidateProfile?.currentTitle || 'Software Engineer',
      company: jobSummary?.company || 'Target Company',
      descriptionText: jobSummary?.descriptionText || `Target role context for ${candidateProfile?.currentTitle || 'the candidate'}`,
      requiredSkills,
      preferredSkills,
      country: jobSummary?.country || candidateProfile?.targetRegion || 'Germany',
      workMode: jobSummary?.workMode || 'hybrid',
    },
  };
}

export function assertSideEffectsBlocked() {
  const blocked = ['CAREERS_EMAIL_SEND_ENABLED', 'CAREERS_CRM_SYNC_ENABLED', 'CAREERS_WORKDRIVE_UPLOAD_ENABLED', 'CAREERS_BROWSER_EXECUTION_ENABLED', 'CAREERS_LIVE_DISCOVERY_ENABLED', 'CAREERS_FIRECRAWL_DISCOVERY_ENABLED'];
  const snapshot = careersFeatureSnapshot();
  for (const flag of blocked) {
    if (snapshot[flag]) {
      throw new Phase4BAssemblyError(`side effect blocked: ${flag}`);
    }
  }
}

export async function writePhase4BRequestArtifact({ runId, workspaceRoot, input }: { runId: string; workspaceRoot?: string; input: GenerateApplicationKitInput }) {
  const workspace = workspaceRoot?.trim() || path.join(os.tmpdir(), 'vvisas-careers');
  const dir = path.join(workspace, runId, 'application-kit');
  await fs.mkdir(dir, { recursive: true });

  const request = {
    runId: input.runId,
    candidateId: input.candidateId,
    jobId: input.jobId,
    jobSummary: input.jobSummary,
    phase: PIPELINE_PHASE,
    assembledFromProfile: true,
    allowedReadPaths: [
      'src/server/careers/application-kit/types.ts',
      'src/server/careers/feature-flags.ts',
      'src/server/careers/application-kit/fixtures.ts',
      'src/server/careers/demo-data.ts',
      'src/server/careers/onboarding.ts',
      'src/server/careers/policy.ts',
    ],
    sideEffectsBlocked: true,
    noCrmUpdates: true,
    noWorkDriveUpdates: true,
    noEmailSend: true,
    noBrowserAutomation: true,
    noLiveNetwork: true,
  };

  await fs.writeFile(path.join(dir, 'request.json'), JSON.stringify(request, null, 2), 'utf8');
  await fs.writeFile(path.join(dir, 'application-kit.json'), JSON.stringify({ phase: PIPELINE_PHASE, requestHash: `${input.runId}:application-kit` }, null, 2), 'utf8');
}
