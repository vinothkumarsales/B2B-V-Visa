import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { isApiResponse } from '@/lib/api-response';
import { submitVendorRating } from '@/server/marketplace/order.service';
import { z } from 'zod';

const ratingSchema = z.object({
  serviceQualityRating: z.number().int().min(1).max(5),
  responseTimeRating: z.number().int().min(1).max(5),
  accuracyRating: z.number().int().min(1).max(5),
  reviewText: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAgencyMembership();
    const { id } = await params;
    const body = await request.json();
    const parsed = ratingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const rating = await submitVendorRating({
      orderId: id,
      authorAgencyId: session.agencyId,
      serviceQualityRating: parsed.data.serviceQualityRating,
      responseTimeRating: parsed.data.responseTimeRating,
      accuracyRating: parsed.data.accuracyRating,
      reviewText: parsed.data.reviewText,
    });

    return NextResponse.json({ success: true, rating });
  } catch (error: any) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/orders/[id]/rating POST error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit rating' },
      { status: 400 },
    );
  }
}
