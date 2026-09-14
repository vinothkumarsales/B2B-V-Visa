import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { isApiResponse } from '@/lib/api-response';
import {
  createMarketplaceOrder,
  listMarketplaceOrders,
  updateOrderStatus,
} from '@/server/marketplace/order.service';
import { z } from 'zod';

const createOrderSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().min(1).default(1),
  travellerDetails: z.object({
    primaryContactName: z.string().min(2, 'Name is required'),
    primaryContactEmail: z.string().email('Valid email is required'),
    primaryContactPhone: z.string().min(8, 'Phone is required'),
    travelDate: z.string().optional(),
    travellerCount: z.number().int().min(1).optional(),
    specialRequests: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
});

const updateOrderSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(['REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED']),
  cancellationReason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const searchParams = request.nextUrl.searchParams;
    const role = (searchParams.get('role')?.toUpperCase() === 'VENDOR' ? 'VENDOR' : 'BUYER') as 'BUYER' | 'VENDOR';

    const orders = await listMarketplaceOrders(session.agencyId, role);
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/orders GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const order = await createMarketplaceOrder({
      buyerAgencyId: session.agencyId,
      buyerUserId: session.user.id,
      input: parsed.data,
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/orders POST error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create order' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const updated = await updateOrderStatus({
      orderId: parsed.data.orderId,
      agencyId: session.agencyId,
      status: parsed.data.status,
      cancellationReason: parsed.data.cancellationReason,
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/orders PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update order' },
      { status: 500 },
    );
  }
}
