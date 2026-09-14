import { db } from '@/lib/db';
import type { MarketplaceProduct, MarketplaceSourceType } from '@prisma/client';

export interface CreateProductInput {
  category: string;
  title: string;
  tagline?: string;
  description: string;
  inclusions?: string[];
  exclusions?: string[];
  destinationCountry?: string;
  cityOrRegion?: string;
  validityDays?: number;
  processingTimeDays?: number;
  cancellationPolicy?: string;
  termsAndConditions?: string;
  basePriceMinor: number; // in paise (e.g. 500000 = ₹5,000)
  priceUnit?: string;     // PER_PERSON, PER_BOOKING, PER_VEHICLE, PER_ROOM
  minQuantity?: number;
  maxQuantity?: number;
}

export interface UnifiedMarketplaceProductItem {
  id: string;
  sourceType: 'PLATFORM' | 'VENDOR';
  status: string;
  category: string;
  title: string;
  tagline?: string | null;
  description: string;
  inclusions?: string[];
  exclusions?: string[];
  destinationCountry?: string | null;
  cityOrRegion?: string | null;
  validityDays: number;
  processingTimeDays: number;
  cancellationPolicy?: string | null;
  termsAndConditions?: string | null;
  basePriceMinor: number;
  platformFeeMinor: number;
  gstMinor: number;
  sellingPriceMinor: number;
  priceUnit: string;
  minQuantity: number;
  maxQuantity: number;
  featured: boolean;
  bookingCount: number;
  applyUrl?: string;
  vendorProfile?: {
    id: string;
    businessName: string;
    reputationScore: number;
    averageRating: number;
    totalOrdersFulfilled: number;
    kycStatus: string;
    agency?: {
      vvisaUid?: string | null;
      city?: string | null;
      state?: string | null;
    } | null;
  } | null;
}

/**
 * Calculates transparent pricing breakdown: Base Price + 5% Platform Fee + 18% GST = Selling Price.
 */
export function calculatePricingBreakdown(basePriceMinor: number) {
  const base = Math.max(0, Math.round(basePriceMinor));
  const platformFeeMinor = Math.round(base * 0.05); // 5% platform fee
  const taxableAmount = base + platformFeeMinor;
  const gstMinor = Math.round(taxableAmount * 0.18); // 18% GST
  const sellingPriceMinor = taxableAmount + gstMinor;

  return {
    basePriceMinor: base,
    platformFeeMinor,
    gstMinor,
    sellingPriceMinor,
  };
}

/**
 * Create a new vendor product. Strictly requires completed KYC and vendorProfile ownership.
 */
export async function createVendorProduct(
  agencyId: string,
  input: CreateProductInput,
): Promise<MarketplaceProduct> {
  const vendorProfile = await db.vendorProfile.findUnique({
    where: { agencyId },
  });

  if (!vendorProfile || vendorProfile.kycStatus !== 'COMPLETED') {
    throw new Error('KYC_REQUIRED: You must complete Vendor Onboarding & KYC before listing products.');
  }

  const pricing = calculatePricingBreakdown(input.basePriceMinor);

  return db.marketplaceProduct.create({
    data: {
      vendorProfileId: vendorProfile.id,
      sourceType: 'VENDOR',
      status: 'PUBLISHED',
      category: input.category.toUpperCase(),
      title: input.title.trim(),
      tagline: input.tagline?.trim() || null,
      description: input.description.trim(),
      inclusions: input.inclusions || [],
      exclusions: input.exclusions || [],
      destinationCountry: input.destinationCountry?.trim() || null,
      cityOrRegion: input.cityOrRegion?.trim() || null,
      validityDays: input.validityDays ?? 30,
      processingTimeDays: input.processingTimeDays ?? 3,
      cancellationPolicy: input.cancellationPolicy?.trim() || 'Standard B2B cancellation terms apply.',
      termsAndConditions: input.termsAndConditions?.trim() || 'Subject to V-Visa Marketplace partner agreement.',
      basePriceMinor: pricing.basePriceMinor,
      platformFeeMinor: pricing.platformFeeMinor,
      gstMinor: pricing.gstMinor,
      sellingPriceMinor: pricing.sellingPriceMinor,
      priceUnit: input.priceUnit || 'PER_PERSON',
      minQuantity: input.minQuantity || 1,
      maxQuantity: input.maxQuantity || 100,
      isAvailable: true,
    },
  });
}

/**
 * Lists marketplace products:
 * - PLATFORM products come dynamically from the existing official V-Visa catalogue (VisaProduct).
 * - VENDOR products come from MarketplaceProduct owned by verified VendorProfiles.
 * - Zero duplicated rows in MarketplaceProduct.
 */
export async function listMarketplaceProducts(params: {
  category?: string;
  search?: string;
  sourceType?: MarketplaceSourceType;
  country?: string;
}): Promise<UnifiedMarketplaceProductItem[]> {
  const { category, search, sourceType, country } = params;

  const shouldFetchVendor = !sourceType || sourceType === 'VENDOR';
  const shouldFetchPlatform = (!sourceType || sourceType === 'PLATFORM') && (!category || category === 'ALL' || category === 'VISA');

  // 1. Fetch Vendor Products from MarketplaceProduct
  let vendorItems: UnifiedMarketplaceProductItem[] = [];
  if (shouldFetchVendor) {
    const vendorProducts = await db.marketplaceProduct.findMany({
      where: {
        status: 'PUBLISHED',
        isAvailable: true,
        sourceType: 'VENDOR',
        vendorProfileId: { not: null },
        ...(category && category !== 'ALL' ? { category: category.toUpperCase() } : {}),
        ...(country ? { destinationCountry: { contains: country, mode: 'insensitive' } } : {}),
        ...(search && search.trim()
          ? {
              OR: [
                { title: { contains: search.trim(), mode: 'insensitive' } },
                { description: { contains: search.trim(), mode: 'insensitive' } },
                { destinationCountry: { contains: search.trim(), mode: 'insensitive' } },
                { cityOrRegion: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            reputationScore: true,
            averageRating: true,
            totalOrdersFulfilled: true,
            kycStatus: true,
            agency: {
              select: {
                vvisaUid: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });

    vendorItems = vendorProducts.map((p) => ({
      id: p.id,
      sourceType: 'VENDOR',
      status: p.status,
      category: p.category,
      title: p.title,
      tagline: p.tagline,
      description: p.description,
      inclusions: (p.inclusions as string[]) || [],
      exclusions: (p.exclusions as string[]) || [],
      destinationCountry: p.destinationCountry,
      cityOrRegion: p.cityOrRegion,
      validityDays: p.validityDays ?? 30,
      processingTimeDays: p.processingTimeDays ?? 3,
      cancellationPolicy: p.cancellationPolicy,
      termsAndConditions: p.termsAndConditions,
      basePriceMinor: p.basePriceMinor,
      platformFeeMinor: p.platformFeeMinor,
      gstMinor: p.gstMinor,
      sellingPriceMinor: p.sellingPriceMinor,
      priceUnit: p.priceUnit,
      minQuantity: p.minQuantity,
      maxQuantity: p.maxQuantity,
      featured: p.featured,
      bookingCount: p.bookingCount,
      vendorProfile: p.vendorProfile,
    }));
  }

  // 2. Fetch Platform Products directly from the authoritative existing V-Visa catalogue (VisaProduct)
  let platformItems: UnifiedMarketplaceProductItem[] = [];
  if (shouldFetchPlatform) {
    const visaProducts = await db.visaProduct.findMany({
      where: {
        isActive: true,
        ...(country ? { destination: { contains: country, mode: 'insensitive' } } : {}),
        ...(search && search.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { destination: { contains: search.trim(), mode: 'insensitive' } },
                { shortDescription: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 40,
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    platformItems = visaProducts.map((vp) => ({
      id: vp.id,
      sourceType: 'PLATFORM',
      status: 'PUBLISHED',
      category: 'VISA',
      title: vp.name,
      tagline: vp.shortDescription || `${vp.destination} ${vp.category} Visa Concierge`,
      description: vp.detailedDescription || vp.shortDescription || `Official ${vp.destination} visa processing by V-Visa platform.`,
      inclusions: [
        'Document Pre-Screening & Verification',
        'Embassy Appointment Priority Booking',
        'Consulate Application Form Preparation',
        'Real-time Status Tracking & Email Alerts',
      ],
      exclusions: [
        'Embassy Government Visa Fee (where applicable)',
        'Biometric Center Charges',
      ],
      destinationCountry: vp.destination,
      cityOrRegion: vp.destinationCode || 'All Consulates',
      validityDays: vp.visaValidityDays || 30,
      processingTimeDays: vp.processingTimeMinDays || 3,
      cancellationPolicy: vp.cancellationPolicy || 'Standard V-Visa service guarantee.',
      termsAndConditions: 'Authentic traveller documentation required.',
      basePriceMinor: vp.amountMinor,
      platformFeeMinor: 0,
      gstMinor: 0,
      sellingPriceMinor: vp.amountMinor,
      priceUnit: 'PER_PERSON',
      minQuantity: 1,
      maxQuantity: 100,
      featured: vp.isFeatured,
      bookingCount: 0,
      applyUrl: `/apply?product=${vp.id}`,
      vendorProfile: null,
    }));
  }

  // Combine results with featured items prioritized
  return [...vendorItems, ...platformItems];
}

/**
 * Retrieves products owned by a specific vendor agency.
 */
export async function getVendorOwnProducts(agencyId: string) {
  const vendorProfile = await db.vendorProfile.findUnique({
    where: { agencyId },
  });

  if (!vendorProfile) return [];

  return db.marketplaceProduct.findMany({
    where: {
      vendorProfileId: vendorProfile.id,
      sourceType: 'VENDOR',
    },
    orderBy: { createdAt: 'desc' },
  });
}
