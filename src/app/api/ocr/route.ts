import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { requireAgencyMembership } from '@/server/auth/session';
import { auditLog } from '@/server/audit/audit-log';
import { extractDocumentFields } from '@/server/integrations/digio/document-intelligence';
import { queueDocumentAttachmentSync } from '@/server/integrations/zoho/document-attachment-sync';
import { queueDocumentOcrDataSync } from '@/server/integrations/zoho/document-ocr-data-sync';

const ocrSchema = z.object({
  imageBase64: z.string().min(20).max(7_000_000),
  documentType: z.string().min(1).max(80),
  mimeType: z.string().min(3).max(120).optional(),
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

      const ocrExtraction = await db.ocrExtraction.create({
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

      const dataSync = await queueDocumentOcrDataSync({
        agencyId: session.agencyId,
        documentId: document.id,
        ocrExtractionId: ocrExtraction.id,
        passportFields: result.normalizedExtraction,
      });

      if (!dataSync.queued) {
        await auditLog({
          agencyId: session.agencyId,
          actorUserId: session.user.id,
          action: 'DOCUMENT_CRM_OCR_DATA_DEFERRED',
          resourceType: 'OcrExtraction',
          resourceId: ocrExtraction.id,
          metadata: { reason: dataSync.reason, documentType: parsed.data.documentType },
        });
      }

      const attachmentSync = await queueDocumentAttachmentSync({
        agencyId: session.agencyId,
        documentId: document.id,
      });

      if (!attachmentSync.queued) {
        await auditLog({
          agencyId: session.agencyId,
          actorUserId: session.user.id,
          action: 'DOCUMENT_CRM_ATTACHMENT_DEFERRED',
          resourceType: 'ApplicationDocument',
          resourceId: document.id,
          metadata: { reason: attachmentSync.reason, documentType: parsed.data.documentType },
        });
      }
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
