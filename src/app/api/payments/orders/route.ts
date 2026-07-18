import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError, isApiResponse } from '@/lib/api-response';
import { isDemoMode } from '@/lib/env';
import { requireAgencyMembership } from '@/server/auth/session';
import { auditLog } from '@/server/audit/audit-log';
import { createZohoPaymentSession } from '@/server/integrations/zoho/payments';

const paymentOrderSchema = z.object({
  applicationId: z.string().optional(),
  amountMinor: z.number().int().positive().optional(),
  idempotencyKey: z.string().min(8).max(160),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = paymentOrderSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid payment order request', 400);

    if (isDemoMode) {
      return NextResponse.json({
        paymentOrder: {
          id: `demo-payment-${Date.now()}`,
          status: 'PROVIDER_SESSION_CREATED',
          providerSessionUrl: '/wallet?demoPayment=1',
        },
        mode: 'demo',
      });
    }

    const session = await requireAgencyMembership([
      'AGENCY_OWNER',
      'AGENCY_ADMIN',
      'AGENCY_FINANCE',
      'AGENCY_OPERATOR',
    ]);

    const application = parsed.data.applicationId
      ? await db.visaApplication.findFirst({
          where: { id: parsed.data.applicationId, agencyId: session.agencyId },
        })
      : null;

    if (parsed.data.applicationId && !application) {
      return apiError('RESOURCE_NOT_FOUND', 'Application not found', 404);
    }

    const amountMinor = application?.totalAmountMinor ?? parsed.data.amountMinor;
    if (!amountMinor) return apiError('INVALID_INPUT', 'Payment amount is required', 400);

    const paymentOrder = await db.paymentOrder.upsert({
      where: { idempotencyKey: parsed.data.idempotencyKey },
      update: {},
      create: {
        agencyId: session.agencyId,
        applicationId: application?.id,
        amountMinor,
        currency: application?.currency ?? 'INR',
        idempotencyKey: parsed.data.idempotencyKey,
      },
    });

    const providerSession = await createZohoPaymentSession({
      paymentOrderId: paymentOrder.id,
      amountMinor: paymentOrder.amountMinor,
      currency: paymentOrder.currency,
      agencyName: session.agency.name,
      agencyEmail: session.agency.email,
      successUrl: `${request.nextUrl.origin}/wallet?payment=success`,
      failureUrl: `${request.nextUrl.origin}/wallet?payment=failed`,
    });

    const updated = await db.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: 'PROVIDER_SESSION_CREATED',
        providerOrderId: providerSession.providerOrderId,
        providerSessionUrl: providerSession.providerSessionUrl,
      },
    });

    if (application) {
      const interest = await db.visaInterest.findFirst({
        where: {
          agencyId: session.agencyId,
          OR: [
            { applicationId: application.id },
            {
              applicationId: null,
              visaTypeId: application.visaProductId,
              status: { notIn: ['PAID', 'CONVERTED', 'EXPIRED', 'CANCELLED'] },
            },
          ],
        },
        orderBy: { lastActivityAt: 'desc' },
      });
      if (interest) {
        await db.visaInterest.update({
          where: { id: interest.id },
          data: {
            applicationId: application.id,
            paymentOrderId: updated.id,
            status: 'PAYMENT_STARTED',
            lastActivityAt: new Date(),
          },
        });
      }
    }

    await auditLog({
      agencyId: session.agencyId,
      actorUserId: session.user.id,
      action: 'PAYMENT_ORDER_CREATED',
      resourceType: 'PaymentOrder',
      resourceId: updated.id,
      metadata: { applicationId: application?.id, amountMinor },
    });

    return NextResponse.json({ paymentOrder: updated });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to create payment order', 503);
  }
}
