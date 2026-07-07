import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { auditLog } from '@/server/audit/audit-log';
import { getPrivateDocumentStorage } from '@/server/storage/private-document-storage';
import { careersFeatureEnabled, careersSafeMutationEnabled } from './feature-flags';
import { careerPaymentIntentInitialStatus, careerSubscriptionInitialStatus } from './payment-domain';
import { CAREER_SUPPORTED_CURRENCIES, resolveCareerPackageSelection } from './packages';
import { careerCandidateFacingStatus, careerProfileCompletion } from './policy';

export const careerOnboardingSchema = z.object({
  fullName: z.string().min(2).max(160),
  phone: z.string().min(8).max(40).optional(),
  currentCountry: z.string().min(2).max(80),
  nationality: z.string().min(2).max(80),
  currentTitle: z.string().min(2).max(160),
  experienceYears: z.number().int().min(0).max(60),
  targetRegion: z.string().min(2).max(80).default('Europe'),
  targetCountries: z.array(z.string().min(2).max(80)).max(40).default([]),
  targetRoles: z.array(z.string().min(2).max(120)).min(1).max(20),
  excludedRoles: z.array(z.string().min(2).max(120)).max(40).default([]),
  workModes: z.array(z.enum(['remote', 'hybrid', 'onsite', 'flexible'])).max(4).default([]),
  salaryExpectation: z.string().max(120).optional(),
  sponsorshipRequired: z.boolean(),
  relocationRequired: z.boolean(),
  minimumFitScore: z.number().min(0).max(5).default(4.0),
  portalPreferences: z
    .array(z.enum(['greenhouse', 'ashby', 'lever', 'company-careers']))
    .min(1)
    .max(4)
    .default(['greenhouse', 'ashby', 'lever']),
  packageCode: z
    .enum(['EUROPE_JOB_SEARCH_ASSIST', 'EUROPE_JOB_SEARCH_PRO', 'EUROPE_JOB_SEARCH_PREMIUM'])
    .default('EUROPE_JOB_SEARCH_ASSIST'),
  currency: z.enum(CAREER_SUPPORTED_CURRENCIES).default('INR'),
});

export const careerResumeUploadSchema = z.object({
  candidateId: z.string().min(1),
  fileName: z.string().min(1).max(160),
  mimeType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
  contentBase64: z.string().min(20).max(14_000_000),
});

export type CareerOnboardingInput = z.infer<typeof careerOnboardingSchema>;
export { careerCandidateFacingStatus, careerProfileCompletion };

export async function createOrUpdateCareerOnboarding(input: {
  userId: string;
  userEmail: string;
  payload: CareerOnboardingInput;
}) {
  if (!careersSafeMutationEnabled()) {
    throw apiError('FORBIDDEN', 'Careers onboarding is currently disabled.', 403);
  }

  const completion = careerProfileCompletion(input.payload);
  const status = completion >= 100 ? 'profile_ready' : 'profile_needs_information';
  const packageSelection = await resolveCareerPackageSelection({
    packageCode: input.payload.packageCode,
    currency: input.payload.currency,
  });

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.careerCandidate.findFirst({
      where: { userId: input.userId },
      orderBy: { createdAt: 'desc' },
    });

    const candidate = existing
      ? await tx.careerCandidate.update({
          where: { id: existing.id },
          data: candidateData(input, status, completion),
        })
      : await tx.careerCandidate.create({
          data: {
            userId: input.userId,
            ...candidateData(input, status, completion),
          },
        });

    await tx.careerSearchPreference.upsert({
      where: { candidateId: candidate.id },
      update: preferenceData(input.payload),
      create: {
        candidateId: candidate.id,
        ...preferenceData(input.payload),
      },
    });

    const serviceRequest = await tx.careerServiceRequest.create({
      data: {
        candidateId: candidate.id,
        packageCode: input.payload.packageCode,
        packageId: packageSelection.package.id,
        status: 'draft',
        paymentStatus: 'not_started',
        activationStatus: 'not_started',
        dashboardStatus: 'Payment pending',
      },
    });

    const pricingSnapshot = await tx.careerPricingSnapshot.create({
      data: {
        serviceRequestId: serviceRequest.id,
        ...packageSelection.pricingSnapshot,
      },
    });

    await tx.careerPaymentIntent.create({
      data: {
        candidateId: candidate.id,
        serviceRequestId: serviceRequest.id,
        status: careerPaymentIntentInitialStatus(),
        provider: 'configuration_only',
        amountMinor: packageSelection.price.amountMinor,
        currency: packageSelection.price.currency,
        idempotencyKey: `career-payment:${serviceRequest.id}:${packageSelection.price.currency}`,
        pricingSnapshot: {
          id: pricingSnapshot.id,
          packageCode: pricingSnapshot.packageCode,
          packageName: pricingSnapshot.packageName,
          amountMinor: pricingSnapshot.amountMinor,
          currency: pricingSnapshot.currency,
          billingMode: pricingSnapshot.billingMode,
        },
      },
    });

    await tx.careerSubscription.create({
      data: {
        candidateId: candidate.id,
        serviceRequestId: serviceRequest.id,
        status: careerSubscriptionInitialStatus(),
        packageCode: input.payload.packageCode,
        amountMinor: packageSelection.price.amountMinor,
        currency: packageSelection.price.currency,
      },
    });

    await tx.careerStatusEvent.create({
      data: {
        candidateId: candidate.id,
        status,
        label: careerCandidateFacingStatus(status),
        detail: 'Careers package and pricing snapshot saved. Checkout, payment capture, and automation are not active in this phase.',
      },
    });

    return { candidate, serviceRequest, pricingSnapshot };
  });

  await auditLog({
    actorUserId: input.userId,
    action: 'CAREER_ONBOARDING_SAVED',
    resourceType: 'CareerCandidate',
    resourceId: result.candidate.id,
    metadata: {
      status: result.candidate.status,
      packageCode: input.payload.packageCode,
      currency: input.payload.currency,
      pricingSnapshotId: result.pricingSnapshot.id,
    },
  });

  return result;
}

export async function saveCareerResumeUpload(input: {
  userId: string;
  payload: z.infer<typeof careerResumeUploadSchema>;
}) {
  if (!careersFeatureEnabled('CAREERS_SAAS_ENABLED') || !careersFeatureEnabled('CAREERS_RESUME_UPLOAD_ENABLED')) {
    throw apiError('FORBIDDEN', 'Careers resume upload is currently disabled.', 403);
  }

  const candidate = await db.careerCandidate.findFirst({
    where: { id: input.payload.candidateId, userId: input.userId },
    include: { resumes: { orderBy: { version: 'desc' }, take: 1 } },
  });
  if (!candidate) throw apiError('RESOURCE_NOT_FOUND', 'Career candidate profile not found.', 404);

  const bytes = Buffer.from(input.payload.contentBase64, 'base64');
  const storage = await getPrivateDocumentStorage().upload({
    agencyId: `careers-${input.userId}`,
    documentType: 'career-resume',
    originalFilename: input.payload.fileName,
    mimeType: input.payload.mimeType,
    bytes,
  });
  const version = (candidate.resumes[0]?.version ?? 0) + 1;

  const resume = await db.careerResume.create({
    data: {
      candidateId: candidate.id,
      version,
      fileName: storage.safeFilename,
      mimeType: storage.mimeType,
      sizeBytes: storage.fileSize,
      storageKey: storage.storageKey,
      checksum: storage.checksum,
      status: 'uploaded',
    },
  });

  await db.careerStatusEvent.create({
    data: {
      candidateId: candidate.id,
      status: 'profile_processing',
      label: 'Resume received',
      detail: 'Resume uploaded for internal review. No Career-Ops scan or application automation has started.',
    },
  });

  await auditLog({
    actorUserId: input.userId,
    action: 'CAREER_RESUME_UPLOADED',
    resourceType: 'CareerResume',
    resourceId: resume.id,
    metadata: { candidateId: candidate.id, version },
  });

  return resume;
}

function candidateData(
  input: { userEmail: string; payload: CareerOnboardingInput },
  status: 'profile_ready' | 'profile_needs_information',
  profileCompletionPercent: number,
) {
  return {
    status,
    fullName: input.payload.fullName.trim(),
    email: input.userEmail,
    phone: input.payload.phone?.trim(),
    currentCountry: input.payload.currentCountry.trim(),
    nationality: input.payload.nationality.trim(),
    currentTitle: input.payload.currentTitle.trim(),
    experienceYears: input.payload.experienceYears,
    profileCompletionPercent,
  };
}

function preferenceData(payload: CareerOnboardingInput) {
  return {
    targetRegion: payload.targetRegion,
    targetCountries: payload.targetCountries,
    targetRoles: payload.targetRoles,
    excludedRoles: payload.excludedRoles,
    workModes: payload.workModes,
    salaryExpectation: payload.salaryExpectation,
    sponsorshipRequired: payload.sponsorshipRequired,
    relocationRequired: payload.relocationRequired,
    minimumFitScore: payload.minimumFitScore,
    portalPreferences: payload.portalPreferences,
  };
}
