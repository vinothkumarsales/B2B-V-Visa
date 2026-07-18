import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdminMutation, writeAdminAudit } from '@/server/admin/write-guard';
import { importVVisasProducts } from '../../../../../scripts/supplier-catalogue/import-vvisas-source';

const importRequestSchema = z.object({
  publish: z.boolean().default(true),
  updateExisting: z.boolean().default(true),
  limit: z.number().int().positive().max(500).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  reason: z.string().trim().min(8, 'Reason must be at least 8 characters.'),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminMutation('catalog.write', 'ADMIN_CATALOG_WRITES_ENABLED');
    const parsed = importRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid import request.', 400);
    }

    const result = await importVVisasProducts({
      publish: parsed.data.publish,
      updateExisting: parsed.data.updateExisting,
      limit: parsed.data.limit,
      country: parsed.data.country,
    });

    await writeAdminAudit({
      permission: 'catalog.write',
      action: 'VVISAS_PRODUCTS_IMPORTED',
      entityType: 'VisaProduct',
      entityId: null,
      reason: parsed.data.reason,
      success: true,
      adminUid: admin.user.id,
      adminEmail: admin.user.email,
      adminRole: admin.role,
      requestId: admin.requestId,
      afterData: result,
    });

    return NextResponse.json({ result });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
