import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/server/auth/session';

interface TransformedProduct {
  id: string;
  destination: string;
  destinationCode?: string;
  name: string;
  category: string;
  entry: string;
  entryType?: string;
  visaKind?: string;
  purpose?: string;
  nationalityEligibility?: unknown;
  validity: string;
  visaValidityDays?: number;
  duration: string;
  maximumStayDays?: number;
  processingTime: string;
  processingTimeMinDays?: number;
  processingTimeMaxDays?: number;
  processingTimeLabel?: string;
  price: number;
  amountMinor: number;
  currency: string;
  documents: unknown;
  documentRequirements: unknown;
  pricing?: unknown;
  badges?: unknown;
  shortDescription?: string | null;
  minimumPassportValidityMonths?: number;
  passportValidityRule?: unknown;
  stickerRoutes: unknown[];
  courierRules?: unknown;
  cutoffTime?: string | null;
  pricingVersion: string;
}

interface CachedBaseCatalogue {
  visaTypes: TransformedProduct[];
  destinations: string[];
  categories: { name: string; count: number }[];
  timestamp: number;
}

let cachedCatalogue: CachedBaseCatalogue | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function invalidateVisaCatalogueCache() {
  cachedCatalogue = null;
}

async function fetchAndTransformBaseCatalogue(): Promise<CachedBaseCatalogue> {
  const visaProducts = await db.visaProduct.findMany({
    where: {
      isActive: true,
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
    orderBy: [{ displayOrder: 'asc' }, { destination: 'asc' }, { name: 'asc' }],
    include: {
      prices: {
        where: {
          isActive: true,
          validFrom: { lte: new Date() },
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
        orderBy: { validFrom: 'desc' },
        take: 1,
        include: { lines: true },
      },
      documentRules: { where: { requirementStatus: 'PUBLISHED' }, orderBy: { displayOrder: 'asc' } },
      stickerRoutes: { where: { isActive: true } },
      courierRules: true,
      passportRules: true,
    },
  });

  const destinations = Array.from(new Set(visaProducts.map((p) => p.destination))).sort();

  const categoryCounts: Record<string, number> = {};
  for (const product of visaProducts) {
    if (product.category) {
      categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    }
  }

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
  }));

  const visaTypes: TransformedProduct[] = visaProducts.map((product) => {
    const activePrice = product.prices[0];
    const mandatory = product.documentRules.filter((item) => item.requirementType === 'required');
    const optional = product.documentRules.filter((item) => item.requirementType === 'optional');
    const conditional = product.documentRules.filter((item) => item.requirementType === 'conditional');
    const mapRequirement = (item: (typeof product.documentRules)[number]) => ({
      id: item.id,
      label: item.documentName,
      requirement:
        item.requirementType === 'optional'
          ? 'OPTIONAL'
          : item.requirementType === 'conditional'
          ? 'CONDITIONAL'
          : 'MANDATORY',
      documentCode: item.documentCode,
      documentName: item.documentName,
      description: item.description ?? undefined,
      isMandatory: item.isMandatory,
      isOptional: item.isOptional,
      acceptedFormats: Array.isArray(item.acceptedFormats) ? item.acceptedFormats : undefined,
      maxFileSizeMb: item.maximumFileSizeBytes ? item.maximumFileSizeBytes / 1024 / 1024 : undefined,
      sortOrder: item.displayOrder,
    });

    return {
      id: product.id,
      destination: product.destination,
      destinationCode: product.destinationCode ?? undefined,
      name: product.publicTitle ?? product.name,
      category: product.category,
      entry: product.entry,
      entryType: product.entryType ?? undefined,
      visaKind: product.visaKind ?? undefined,
      purpose: product.purpose ?? undefined,
      nationalityEligibility: Array.isArray(product.nationalityEligibility) ? product.nationalityEligibility : undefined,
      validity: product.validity,
      visaValidityDays: product.visaValidityDays ?? undefined,
      duration: product.duration,
      maximumStayDays: product.maximumStayDays ?? undefined,
      processingTime: product.processingTime,
      processingTimeMinDays: product.processingTimeMinDays ?? undefined,
      processingTimeMaxDays: product.processingTimeMaxDays ?? undefined,
      processingTimeLabel: product.processingTimeLabel ?? undefined,
      price: (activePrice?.totalAmountMinor ?? product.amountMinor) / 100,
      amountMinor: activePrice?.totalAmountMinor ?? product.amountMinor,
      currency: activePrice?.currency ?? product.currency,
      documents: product.documentRules.length ? product.documentRules.map((item) => item.documentName) : product.documents,
      documentRequirements: {
        mandatory: mandatory.map(mapRequirement),
        optional: optional.map(mapRequirement),
        conditional: conditional.map(mapRequirement),
      },
      pricing: activePrice
        ? {
            visaFeeMinor: activePrice.visaFeeMinor,
            vvisaServiceFeeMinor: activePrice.vvisaServiceFeeMinor,
            courierFeeMinor: activePrice.courierFeeMinor,
            insuranceFeeMinor: activePrice.insuranceFeeMinor,
            convenienceFeeMinor: activePrice.convenienceFeeMinor,
            otherFeeMinor: activePrice.otherFeeMinor,
            discountMinor: activePrice.discountMinor,
            gstMinor: activePrice.gstMinor,
            currency: activePrice.currency,
            totalAmountMinor: activePrice.totalAmountMinor,
            lines: activePrice.lines.map((line) => ({
              id: line.id,
              label: line.label,
              type: line.type,
              amount: line.amountMinor / 100,
              amountMinor: line.amountMinor,
              currency: activePrice.currency,
              taxable: line.taxable,
            })),
          }
        : undefined,
      badges: product.badges,
      shortDescription: product.shortDescription,
      minimumPassportValidityMonths: product.minimumPassportValidityMonths ?? undefined,
      passportValidityRule: product.passportRules[0]
        ? {
            minimumMonths: product.passportRules[0].minimumPassportValidityMonths,
            rule: product.passportRules[0].passportValidityRule,
          }
        : undefined,
      stickerRoutes: product.stickerRoutes.map((route) => ({
        id: route.id,
        type: 'ROUND_TRIP',
        origin: route.originCityLabel,
        destination: route.processingCentreCity,
        routeKey: route.originCityCode,
        visaProductId: route.visaProductId,
        originCityCode: route.originCityCode,
        originCityLabel: route.originCityLabel,
        processingCentreCity: route.processingCentreCity,
        processingCentreAddress: route.processingCentreAddress ?? undefined,
        courierFeeMinor: route.courierFeeMinor,
        serviceFeeAdjustmentMinor: route.serviceFeeAdjustmentMinor,
        estimatedOutboundDays: route.estimatedOutboundDays ?? undefined,
        estimatedReturnDays: route.estimatedReturnDays ?? undefined,
        deliveryInstructions: route.deliveryInstructions ?? undefined,
        isActive: route.isActive,
      })),
      courierRules: product.courierRules[0]
        ? {
            required: product.courierRules[0].courierRequired,
            available: true,
            physicalSubmissionRequired: product.courierRules[0].physicalSubmissionRequired,
            courierRequired: product.courierRules[0].courierRequired,
            courierDirection: product.courierRules[0].courierDirection,
            submissionCentreName: product.courierRules[0].submissionCentreName ?? undefined,
            submissionAddress: product.courierRules[0].submissionAddress ?? undefined,
            submissionCity: product.courierRules[0].submissionCity ?? undefined,
            returnCourierAvailable: product.courierRules[0].returnCourierAvailable,
            returnCourierFeeMinor: product.courierRules[0].returnCourierFeeMinor ?? undefined,
            outboundCourierFeeMinor: product.courierRules[0].outboundCourierFeeMinor ?? undefined,
            courierInstructions: product.courierRules[0].courierInstructions ?? undefined,
            passportCollectionAvailable: product.courierRules[0].passportCollectionAvailable,
            passportCollectionCities: Array.isArray(product.courierRules[0].passportCollectionCities)
              ? product.courierRules[0].passportCollectionCities
              : undefined,
            routes: product.stickerRoutes.map((route) => ({
              id: route.id,
              type: 'ROUND_TRIP',
              origin: route.originCityLabel,
              destination: route.processingCentreCity,
              routeKey: route.originCityCode,
            })),
          }
        : undefined,
      cutoffTime: product.cutoffTime,
      pricingVersion: product.pricingVersion,
    };
  });

  const entry: CachedBaseCatalogue = {
    visaTypes,
    destinations,
    categories,
    timestamp: Date.now(),
  };

  return entry;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination') || '';

  try {
    let baseData: CachedBaseCatalogue;

    if (!destination && cachedCatalogue && Date.now() - cachedCatalogue.timestamp < CACHE_TTL_MS) {
      baseData = cachedCatalogue;
    } else {
      const fresh = await fetchAndTransformBaseCatalogue();
      if (!destination) {
        cachedCatalogue = fresh;
      }
      baseData = fresh;
    }

    // Filter by destination param if specifically requested
    let visaTypesResult = baseData.visaTypes;
    if (destination) {
      const destLower = destination.toLowerCase();
      visaTypesResult = visaTypesResult.filter((p) => p.destination.toLowerCase().includes(destLower));
    }

    // Resolve partner-specific category disabling
    const session = await getSession();
    let disabled: string[] = [];
    if (session?.activeMembership?.agency?.disabledVisaCategories) {
      try {
        const raw = session.activeMembership.agency.disabledVisaCategories;
        disabled = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {}
    }

    if (disabled.length > 0) {
      visaTypesResult = visaTypesResult.filter((p) => !p.category || !disabled.includes(p.category));
    }

    const activeCategories = baseData.categories.filter((c) => !disabled.includes(c.name));

    return NextResponse.json(
      {
        visaTypes: visaTypesResult,
        destinations: baseData.destinations,
        categories: activeCategories,
        mode: 'published',
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('Failed to get visa types from database:', err);
    return NextResponse.json(
      {
        visaTypes: [],
        destinations: [],
        categories: [],
        mode: 'error',
      },
      { status: 500 }
    );
  }
}
