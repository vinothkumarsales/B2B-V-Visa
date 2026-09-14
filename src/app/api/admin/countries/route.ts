import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { db } from '@/lib/db';
import { countryDraftSchema } from '@/server/admin/catalogue-schemas';
import { requireAdmin } from '@/server/admin/auth';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';

export async function GET() {
  try {
    await requireAdmin('catalog.read');
    const countries = await db.country.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { visaProducts: true } } },
    });
    return NextResponse.json({ countries });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminMutation('catalog.write', 'ADMIN_CATALOG_WRITES_ENABLED');
    const parsed = countryDraftSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid country draft.', 400);

    const code = parsed.data.code.toUpperCase();
    const country = await db.country.upsert({
      where: { code },
      update: {
        name: parsed.data.name,
        isActive: parsed.data.isActive,
      },
      create: {
        code,
        name: parsed.data.name,
        isActive: parsed.data.isActive,
      },
    });

    await writeAdminAudit({
      permission: 'catalog.write',
      action: 'COUNTRY_UPSERTED',
      entityType: 'Country',
      entityId: country.id,
      reason: parsed.data.reason,
      success: true,
      adminUid: admin.user.id,
      adminEmail: admin.user.email,
      adminRole: admin.role,
      requestId: admin.requestId,
      afterData: { code: country.code, name: country.name, isActive: country.isActive },
    });

    return NextResponse.json({ country }, { status: 201 });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
