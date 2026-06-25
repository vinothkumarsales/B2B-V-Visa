import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { requireAgencyMembership } from '@/server/auth/session';
import { auditLog } from '@/server/audit/audit-log';
import { extractDocumentFields } from '@/server/integrations/digio/document-intelligence';

const ocrSchema = z.object({
  imageBase64: z.string().min(20).max(7_000_000),
  documentType: z.string().min(1).max(80),
  documentId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = ocrSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('INVALID_INPUT', 'Invalid OCR request', 400);
    }

    const session = isDemoMode ? null : await requireAgencyMembership();
    const result = await extractDocumentFields(parsed.data);

    if (!isDemoMode && session && parsed.data.documentId) {
      const document = await db.applicationDocument.findFirst({
        where: { id: parsed.data.documentId, agencyId: session.agencyId },
      });
      if (!document) return apiError('RESOURCE_NOT_FOUND', 'Document not found', 404);

      await db.ocrExtraction.create({
        data: {
          documentId: document.id,
          provider: 'DIGIO',
          providerRequestId: result.providerRequestId,
          rawExtraction: result.rawExtraction as Prisma.InputJsonValue,
          normalizedExtraction: result.normalizedExtraction as Prisma.InputJsonValue,
          confidence: result.confidence,
        },
      });

      await db.applicationDocument.update({
        where: { id: document.id },
        data: { status: 'OCR_COMPLETE' },
      });

      await auditLog({
        agencyId: session.agencyId,
        actorUserId: session.user.id,
        action: 'DOCUMENT_OCR_EXTRACTED',
        resourceType: 'ApplicationDocument',
        resourceId: document.id,
        metadata: { provider: 'DIGIO', documentType: parsed.data.documentType },
      });
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      providerRequestId: result.providerRequestId,
      confidence: result.confidence,
      fields: Object.entries(result.normalizedExtraction).map(([field, value]) => ({
        field,
        value,
        confidence: result.confidence,
      })),
      requiresUserConfirmation: true,
      mode: isDemoMode ? 'demo' : 'production',
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('PROVIDER_UNAVAILABLE', 'Document OCR is temporarily unavailable', 503);
  }
}
