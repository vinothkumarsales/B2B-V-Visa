import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';
import { getApplicationStatusReadModel } from '@/server/admin/read-preview';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
const transitionSchema = z.object({ fromStatusCode: z.string().min(1), toStatusCode: z.string().min(1), requiresPayment: z.boolean().default(false), requiresDocuments: z.boolean().default(false), requiresNotes: z.boolean().default(false), partnerNotification: z.boolean().default(false), internalNotification: z.boolean().default(false), crmSync: z.boolean().default(false), isActive: z.boolean().default(true), reason: z.string().min(8).max(500) });

export async function GET() {
  try {
    await requireAdmin('application_status.read');
    const readModel = await getApplicationStatusReadModel();
    return NextResponse.json({ transitions: readModel.transitions });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminMutation('application_status.write', 'ADMIN_STATUS_WRITES_ENABLED');
    const parsed = transitionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid status transition.', 400);
    const transition = await db.applicationStatusTransition.upsert({ where: { fromStatusCode_toStatusCode: { fromStatusCode: parsed.data.fromStatusCode as never, toStatusCode: parsed.data.toStatusCode as never } }, update: { requiresPayment: parsed.data.requiresPayment, requiresDocuments: parsed.data.requiresDocuments, requiresNotes: parsed.data.requiresNotes, partnerNotification: parsed.data.partnerNotification, internalNotification: parsed.data.internalNotification, crmSync: parsed.data.crmSync, isActive: parsed.data.isActive }, create: { fromStatusCode: parsed.data.fromStatusCode as never, toStatusCode: parsed.data.toStatusCode as never, requiresPayment: parsed.data.requiresPayment, requiresDocuments: parsed.data.requiresDocuments, requiresNotes: parsed.data.requiresNotes, partnerNotification: parsed.data.partnerNotification, internalNotification: parsed.data.internalNotification, crmSync: parsed.data.crmSync, isActive: parsed.data.isActive } });
    await writeAdminAudit({ permission: 'application_status.write', action: 'APPLICATION_STATUS_TRANSITION_UPDATED', entityType: 'ApplicationStatusTransition', entityId: transition.id, reason: parsed.data.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, afterData: { fromStatusCode: transition.fromStatusCode, toStatusCode: transition.toStatusCode } });
    return NextResponse.json({ transition });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
