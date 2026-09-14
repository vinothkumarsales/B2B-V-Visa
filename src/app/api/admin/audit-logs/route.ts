import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';
import { serializeAgency } from '@/lib/uid';

export async function GET() {
  await requireAdmin('audit.read');
  const auditLogs = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { actorUser: true, agency: true },
  });
  return NextResponse.json({
    auditLogs: auditLogs.map((log) => ({
      ...log,
      agency: log.agency ? serializeAgency(log.agency) : null,
    })),
  });
}
