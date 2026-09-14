import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { getPrivateDocumentStorage } from '@/server/storage/private-document-storage';
import { requireAdmin } from '@/server/admin/auth';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
import { requireActiveSupportSession } from '@/server/admin/support-session';

const uploadSchema = z.object({ applicationId: z.string().optional(), applicantId: z.string().optional(), supportSessionId: z.string().optional(), documentType: z.string().min(1).max(80), fileName: z.string().min(1).max(160), mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']), contentBase64: z.string().min(20).max(14_000_000), reason: z.string().min(8).max(500) });

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try { await requireAdmin('document.read'); const { uid } = await params; return NextResponse.json({ documents: await db.applicationDocument.findMany({ where: { agencyId: uid }, orderBy: { createdAt: 'desc' }, take: 100 }) }); }
  catch (error) { if (isApiResponse(error)) return error; throw error; }
}

export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdminMutation('document.write', 'ADMIN_DOCUMENT_WRITES_ENABLED');
    const { uid } = await params;
    const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid document upload.', 400);
    if (admin.role === 'support_admin' || parsed.data.supportSessionId) await requireActiveSupportSession({ sessionId: parsed.data.supportSessionId, adminUid: admin.user.id, partnerUid: uid, minimumMode: 'support' });
    if (parsed.data.applicationId) {
      const application = await db.visaApplication.findFirst({ where: { id: parsed.data.applicationId, agencyId: uid }, select: { id: true } });
      if (!application) return apiError('RESOURCE_NOT_FOUND', 'Application not found for this partner.', 404);
    }
    const stored = await getPrivateDocumentStorage().upload({ agencyId: uid, applicationId: parsed.data.applicationId, applicantId: parsed.data.applicantId, documentType: parsed.data.documentType, originalFilename: parsed.data.fileName, mimeType: parsed.data.mimeType, bytes: Buffer.from(parsed.data.contentBase64, 'base64') });
    const document = await db.applicationDocument.create({ data: { agencyId: uid, applicationId: parsed.data.applicationId, applicantId: parsed.data.applicantId, documentType: parsed.data.documentType, fileName: stored.safeFilename, mimeType: stored.mimeType, sizeBytes: stored.fileSize, storageKey: stored.storageKey, status: 'UPLOADED' } });
    await writeAdminAudit({ permission: 'document.write', action: 'DOCUMENT_UPLOADED_ON_BEHALF', entityType: 'ApplicationDocument', entityId: document.id, partnerUid: uid, reason: parsed.data.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, afterData: { applicationId: document.applicationId, documentType: document.documentType, sizeBytes: document.sizeBytes } });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) { if (isApiResponse(error)) return error; return apiError('PROVIDER_UNAVAILABLE', 'Private document storage is unavailable.', 503); }
}
