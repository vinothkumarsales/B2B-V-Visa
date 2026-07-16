import { NextResponse } from 'next/server';
import { isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';

export async function GET() {
  try {
    const admin = await requireAdmin('partner.read');
    const session = await db.adminImpersonationSession.findFirst({ where: { actorAdminUid: admin.user.id, status: 'active', expiresAt: { gt: new Date() } }, orderBy: { startedAt: 'desc' }, include: { subjectAgency: { select: { id: true, name: true } } } });
    return NextResponse.json({ session });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
