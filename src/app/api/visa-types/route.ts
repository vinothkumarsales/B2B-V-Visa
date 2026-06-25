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
    orderBy: [{ destination: 'asc' }, { name: 'asc' }],
  });

  const destinations = await db.visaProduct.findMany({
    where: { isActive: true },
    distinct: ['destination'],
    select: { destination: true },
    orderBy: { destination: 'asc' },
  });

  return NextResponse.json({
    visaTypes: visaProducts.map((product) => ({
      id: product.id,
      destination: product.destination,
      name: product.name,
      category: product.category,
      entry: product.entry,
      validity: product.validity,
      duration: product.duration,
      processingTime: product.processingTime,
      price: product.amountMinor / 100,
      amountMinor: product.amountMinor,
      currency: product.currency,
      documents: product.documents,
      cutoffTime: product.cutoffTime,
      pricingVersion: product.pricingVersion,
    })),
    destinations: destinations.map((item) => item.destination),
  });
}
