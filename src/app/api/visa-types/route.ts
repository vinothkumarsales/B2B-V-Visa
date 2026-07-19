import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mockVisaTypes } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination') || '';

  try {
    const visaProducts = await db.visaProduct.findMany({
      where: {
        isActive: true,
        ...(destination
          ? { destination: { contains: destination, mode: 'insensitive' as const } }
          : {}),
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      orderBy: [{ displayOrder: 'asc' }, { destination: 'asc' }, { name: 'asc' }],
      include: {
        prices: { where: { isActive: true, validFrom: { lte: new Date() }, OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] }, orderBy: { validFrom: 'desc' }, take: 1, include: { lines: true } },
        documentRules: { where: { requirementStatus: 'PUBLISHED' }, orderBy: { displayOrder: 'asc' } },
        stickerRoutes: { where: { isActive: true } },
        courierRules: true,
        passportRules: true,
      },
    });

    const destinations = await db.visaProduct.findMany({
      where: { isActive: true },
      distinct: ['destination'],
      select: { destination: true },
      orderBy: { destination: 'asc' },
    });

    if (visaProducts.length) {
      return NextResponse.json({
        visaTypes: visaProducts.map((product) => {
      const activePrice = product.prices[0];
      const mandatory = product.documentRules.filter((item) => item.requirementType === 'required');
      const optional = product.documentRules.filter((item) => item.requirementType === 'optional');
      const conditional = product.documentRules.filter((item) => item.requirementType === 'conditional');
      const mapRequirement = (item: (typeof product.documentRules)[number]) => ({ id: item.id, label: item.documentName, requirement: item.requirementType === 'optional' ? 'OPTIONAL' : item.requirementType === 'conditional' ? 'CONDITIONAL' : 'MANDATORY', documentCode: item.documentCode, documentName: item.documentName, description: item.description ?? undefined, isMandatory: item.isMandatory, isOptional: item.isOptional, acceptedFormats: Array.isArray(item.acceptedFormats) ? item.acceptedFormats : undefined, maxFileSizeMb: item.maximumFileSizeBytes ? item.maximumFileSizeBytes / 1024 / 1024 : undefined, sortOrder: item.displayOrder });
      return ({
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
      documents: product.documentRules.length ? product.documentRules.map(item => item.documentName) : product.documents,
      documentRequirements: { mandatory: mandatory.map(mapRequirement), optional: optional.map(mapRequirement), conditional: conditional.map(mapRequirement) },
      pricing: activePrice ? { visaFeeMinor: activePrice.visaFeeMinor, vvisaServiceFeeMinor: activePrice.vvisaServiceFeeMinor, courierFeeMinor: activePrice.courierFeeMinor, insuranceFeeMinor: activePrice.insuranceFeeMinor, convenienceFeeMinor: activePrice.convenienceFeeMinor, otherFeeMinor: activePrice.otherFeeMinor, discountMinor: activePrice.discountMinor, gstMinor: activePrice.gstMinor, currency: activePrice.currency, totalAmountMinor: activePrice.totalAmountMinor, lines: activePrice.lines.map(line => ({ id: line.id, label: line.label, type: line.type, amount: line.amountMinor / 100, amountMinor: line.amountMinor, currency: activePrice.currency, taxable: line.taxable })) } : undefined,
      badges: product.badges,
      shortDescription: product.shortDescription,
      minimumPassportValidityMonths: product.minimumPassportValidityMonths ?? undefined,
      passportValidityRule: product.passportRules[0] ? { minimumMonths: product.passportRules[0].minimumPassportValidityMonths, rule: product.passportRules[0].passportValidityRule } : undefined,
      stickerRoutes: product.stickerRoutes.map((route) => ({ id: route.id, type: 'ROUND_TRIP', origin: route.originCityLabel, destination: route.processingCentreCity, routeKey: route.originCityCode, visaProductId: route.visaProductId, originCityCode: route.originCityCode, originCityLabel: route.originCityLabel, processingCentreCity: route.processingCentreCity, processingCentreAddress: route.processingCentreAddress ?? undefined, courierFeeMinor: route.courierFeeMinor, serviceFeeAdjustmentMinor: route.serviceFeeAdjustmentMinor, estimatedOutboundDays: route.estimatedOutboundDays ?? undefined, estimatedReturnDays: route.estimatedReturnDays ?? undefined, deliveryInstructions: route.deliveryInstructions ?? undefined, isActive: route.isActive })),
      courierRules: product.courierRules[0] ? { required: product.courierRules[0].courierRequired, available: true, physicalSubmissionRequired: product.courierRules[0].physicalSubmissionRequired, courierRequired: product.courierRules[0].courierRequired, courierDirection: product.courierRules[0].courierDirection, submissionCentreName: product.courierRules[0].submissionCentreName ?? undefined, submissionAddress: product.courierRules[0].submissionAddress ?? undefined, submissionCity: product.courierRules[0].submissionCity ?? undefined, returnCourierAvailable: product.courierRules[0].returnCourierAvailable, returnCourierFeeMinor: product.courierRules[0].returnCourierFeeMinor ?? undefined, outboundCourierFeeMinor: product.courierRules[0].outboundCourierFeeMinor ?? undefined, courierInstructions: product.courierRules[0].courierInstructions ?? undefined, passportCollectionAvailable: product.courierRules[0].passportCollectionAvailable, passportCollectionCities: Array.isArray(product.courierRules[0].passportCollectionCities) ? product.courierRules[0].passportCollectionCities : undefined, routes: product.stickerRoutes.map((route) => ({ id: route.id, type: 'ROUND_TRIP', origin: route.originCityLabel, destination: route.processingCentreCity, routeKey: route.originCityCode })) } : undefined,
      cutoffTime: product.cutoffTime,
      pricingVersion: product.pricingVersion,
    })}),
        destinations: destinations.map((item) => item.destination),
        mode: 'published',
      });
    }
  } catch {
    // Fall through to bundled products so Explore remains usable if the DB is unavailable.
  }

  const filtered = destination
    ? mockVisaTypes.filter((visa) => visa.destination.toLowerCase().includes(destination.toLowerCase()))
    : mockVisaTypes;

  return NextResponse.json({
    visaTypes: filtered,
    destinations: [...new Set(mockVisaTypes.map((v) => v.destination))],
    mode: 'fallback',
  });
}
