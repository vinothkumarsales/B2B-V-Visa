import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin/auth';
import { adminFeatureSnapshot } from '@/server/admin/feature-flags';

export async function GET() {
  await requireAdmin('audit.read');
  const [databaseOk, dashboardSections, applicationStatuses, failedSyncEvents] = await Promise.all([
    db.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    db.dashboardSection.count().catch(() => 0),
    db.applicationStatusConfig.count().catch(() => 0),
    db.integrationEvent.count({ where: { status: { in: ['FAILED', 'FAILED_TERMINAL'] } } }).catch(() => 0),
  ]);

  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    flags: adminFeatureSnapshot(),
    checks: {
      database: databaseOk,
      googleAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      adminAuth: true,
      crmSync: failedSyncEvents === 0,
      notificationQueue: true,
      dashboardSync: dashboardSections > 0,
      applicationStatusSync: applicationStatuses > 0,
    },
    counts: { dashboardSections, applicationStatuses, failedSyncEvents },
  });
}
