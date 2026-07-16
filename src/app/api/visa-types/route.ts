import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/env';
import { mockVisaTypes } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get('destination') || '';

  if (isDemoMode) {
    const filtered = destination
      ? mockVisaTypes.filter((visa) =>
          visa.destination.toLowerCase().includes(destination.toLowerCase())
        )
      : mockVisaTypes;

    return NextResponse.json({
      visaTypes: filtered,
      destinations: [...new Set(mockVisaTypes.map((v) => v.destination))],
      mode: 'demo',
    });
  }

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
    },
  });

  const destinations = await db.visaProduct.findMany({
    where: { isActive: true },
    distinct: ['destination'],
    select: { destination: true },
    orderBy: { destination: 'asc' },
  });

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
      name: product.publicTitle ?? product.name,
      category: product.category,
      entry: product.entry,
      validity: product.validity,
      duration: product.duration,
      processingTime: product.processingTime,
      price: (activePrice?.totalAmountMinor ?? product.amountMinor) / 100,
      amountMinor: activePrice?.totalAmountMinor ?? product.amountMinor,
      currency: activePrice?.currency ?? product.currency,
      documents: product.documentRules.length ? product.documentRules.map(item => item.documentName) : product.documents,
      documentRequirements: { mandatory: mandatory.map(mapRequirement), optional: optional.map(mapRequirement), conditional: conditional.map(mapRequirement) },
      pricing: activePrice ? { visaFeeMinor: activePrice.visaFeeMinor, vvisaServiceFeeMinor: activePrice.vvisaServiceFeeMinor, courierFeeMinor: activePrice.courierFeeMinor, insuranceFeeMinor: activePrice.insuranceFeeMinor, convenienceFeeMinor: activePrice.convenienceFeeMinor, otherFeeMinor: activePrice.otherFeeMinor, discountMinor: activePrice.discountMinor, gstMinor: activePrice.gstMinor, currency: activePrice.currency, totalAmountMinor: activePrice.totalAmountMinor, lines: activePrice.lines.map(line => ({ id: line.id, label: line.label, type: line.type, amount: line.amountMinor / 100, amountMinor: line.amountMinor, currency: activePrice.currency, taxable: line.taxable })) } : undefined,
      badges: product.badges,
      shortDescription: product.shortDescription,
      cutoffTime: product.cutoffTime,
      pricingVersion: product.pricingVersion,
    })}),
    destinations: destinations.map((item) => item.destination),
  });
}
