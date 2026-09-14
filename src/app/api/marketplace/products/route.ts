import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { isApiResponse } from '@/lib/api-response';
import {
  listMarketplaceProducts,
  createVendorProduct,
  getVendorOwnProducts,
} from '@/server/marketplace/product.service';
import { getVendorKycStatus } from '@/server/marketplace/vendor.service';
import { z } from 'zod';

const createProductSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  tagline: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  destinationCountry: z.string().optional(),
  cityOrRegion: z.string().optional(),
  validityDays: z.number().int().min(1).default(30),
  processingTimeDays: z.number().int().min(0).default(3),
  cancellationPolicy: z.string().optional(),
  termsAndConditions: z.string().optional(),
  basePriceMinor: z.number().int().min(100, 'Base price must be at least ₹1 (100 paise)'),
  priceUnit: z.string().default('PER_PERSON'),
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).default(100),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const searchParams = request.nextUrl.searchParams;
    const isMyProducts = searchParams.get('myProducts') === 'true';

    if (isMyProducts) {
      const myProducts = await getVendorOwnProducts(session.agencyId);
      return NextResponse.json({ success: true, products: myProducts });
    }

    const category = searchParams.get('category') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const country = searchParams.get('country') ?? undefined;
    const sourceType = (searchParams.get('sourceType') as any) ?? undefined;

    const products = await listMarketplaceProducts({
      category,
      search,
      country,
      sourceType,
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/products GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();

    // Verify KYC status before allowing product creation
    const kycStatusSummary = await getVendorKycStatus(session.agencyId);
    if (!kycStatusSummary.isKycCompleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC_NOT_COMPLETED',
          message: 'You must complete Vendor Onboarding / KYC before listing products on the V-Visa Marketplace.',
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const newProduct = await createVendorProduct(session.agencyId, parsed.data);
    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error: any) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/products POST error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create product' },
      { status: error?.message?.includes('KYC_REQUIRED') ? 403 : 500 },
    );
  }
}
