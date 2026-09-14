import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
import { partnerAdminNoteSchema } from '@/server/admin/workflow-schemas';
import { requireActiveSupportSession } from '@/server/admin/support-session';

export async function GET(_: Request, { params }: { params: Promise<{ uid: string }> }) {
  try { await requireAdmin('partner.read'); const { uid } = await params; return NextResponse.json({ notes: await db.partnerAdminNote.findMany({ where: { agencyId: uid }, orderBy: { createdAt: 'desc' }, take: 100 }) }); }
  catch (error) { if (isApiResponse(error)) return error; throw error; }
}
export async function POST(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const admin = await requireAdminMutation('partner.write', 'ADMIN_PARTNER_WRITES_ENABLED');
    const { uid } = await params;
    const parsed = partnerAdminNoteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid note.', 400);
    if (admin.role === 'support_admin' || parsed.data.supportSessionId) await requireActiveSupportSession({ sessionId: parsed.data.supportSessionId, adminUid: admin.user.id, partnerUid: uid, minimumMode: 'support' });
    const note = await db.partnerAdminNote.create({ data: { agencyId: uid, authorUid: admin.user.id, authorEmail: admin.user.email, note: parsed.data.note } });
    await writeAdminAudit({ permission: 'partner.write', action: 'PARTNER_ADMIN_NOTE_ADDED', entityType: 'PartnerAdminNote', entityId: note.id, partnerUid: uid, reason: parsed.data.reason, success: true, adminUid: admin.user.id, adminEmail: admin.user.email, adminRole: admin.role, requestId: admin.requestId, impersonationSessionId: parsed.data.supportSessionId, afterData: { noteLength: note.note.length } });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) { if (isApiResponse(error)) return error; throw error; }
}
