import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';

export async function GET() {
  await requireAdmin('audit.read');
  const auditLogs = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { actorUser: true, agency: true },
  });
  return NextResponse.json({ auditLogs });
}
