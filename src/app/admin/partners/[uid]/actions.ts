'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auditLog } from '@/server/audit/audit-log';
import { requireAdminMutation } from '@/server/admin/write-guard';

const priceOverrideSchema = z.object({
  partnerUid: z.string().min(1),
  productId: z.string().optional(),
  overrideType: z.string().min(1),
  value: z.coerce.number().min(0),
  reason: z.string().min(8),
  status: z.enum(['draft', 'active']).default('draft'),
});

export async function createPartnerPriceOverride(formData: FormData) {
  const admin = await requireAdminMutation('pricing.write');
  const parsed = priceOverrideSchema.parse({
    partnerUid: formData.get('partnerUid'),
    productId: formData.get('productId') || undefined,
    overrideType: formData.get('overrideType'),
    value: formData.get('value'),
    reason: formData.get('reason'),
    status: formData.get('status') || 'draft',
  });

  const override = await db.partnerPriceOverride.create({
    data: {
      partnerUid: parsed.partnerUid,
      productId: parsed.productId,
      overrideType: parsed.overrideType,
      valueMinor: Math.round(parsed.value * 100),
      reason: parsed.reason,
      status: parsed.status,
      createdByAdminUserId: admin.user.id,
    },
  });

  await auditLog({
    agencyId: parsed.partnerUid,
    actorUserId: admin.user.id,
    action: 'PARTNER_PRICE_OVERRIDE_CREATED',
    resourceType: 'PartnerPriceOverride',
    resourceId: override.id,
    metadata: {
      partnerUid: parsed.partnerUid,
      productId: parsed.productId,
      overrideType: parsed.overrideType,
      valueMinor: override.valueMinor,
      status: parsed.status,
      reason: parsed.reason,
    },
  });

  revalidatePath(`/admin/partners/${parsed.partnerUid}`);
}
