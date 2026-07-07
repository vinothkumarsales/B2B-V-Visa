import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { apiError } from '@/lib/api-response';
import { careersFeatureEnabled } from './feature-flags';

export const CAREER_SUPPORTED_CURRENCIES = ['INR', 'EUR', 'USD'] as const;
export type CareerSupportedCurrency = (typeof CAREER_SUPPORTED_CURRENCIES)[number];

export type CareerPackageOption = {
  code: string;
  name: string;
  description: string;
  currency: CareerSupportedCurrency;
  amountMinor: number;
  billingMode: string;
  features: string[];
  quotas: Record<string, unknown>;
};

export function normalizeCareerCurrency(currency?: string): CareerSupportedCurrency {
  const normalized = (currency ?? 'INR').trim().toUpperCase();
  if (CAREER_SUPPORTED_CURRENCIES.includes(normalized as CareerSupportedCurrency)) {
    return normalized as CareerSupportedCurrency;
  }
  throw apiError('INVALID_INPUT', 'Unsupported Careers package currency.', 400);
}

export async function listPublicCareerPackages(currency?: string): Promise<CareerPackageOption[]> {
  if (!careersFeatureEnabled('CAREERS_PACKAGES_ENABLED')) return [];
  const selectedCurrency = normalizeCareerCurrency(currency);
  const packages = await db.careerServicePackage.findMany({
    where: { status: 'active', isPublic: true },
    include: { prices: { where: { currency: selectedCurrency, isActive: true }, take: 1 } },
    orderBy: { displayOrder: 'asc' },
  });

  return packages
    .filter((item) => item.prices[0])
    .map((item) => ({
      code: item.code,
      name: item.name,
      description: item.description,
      currency: selectedCurrency,
      amountMinor: item.prices[0].amountMinor,
      billingMode: item.prices[0].billingMode,
      features: toStringArray(item.features),
      quotas: toRecord(item.quotas),
    }));
}

export async function resolveCareerPackageSelection(input: {
  packageCode: 'EUROPE_JOB_SEARCH_ASSIST' | 'EUROPE_JOB_SEARCH_PRO' | 'EUROPE_JOB_SEARCH_PREMIUM';
  currency?: string;
}) {
  if (!careersFeatureEnabled('CAREERS_PACKAGES_ENABLED')) {
    throw apiError('FORBIDDEN', 'Careers package configuration is currently disabled.', 403);
  }

  const currency = normalizeCareerCurrency(input.currency);
  const selectedPackage = await db.careerServicePackage.findUnique({
    where: { code: input.packageCode },
    include: { prices: { where: { currency, isActive: true }, take: 1 } },
  });

  if (!selectedPackage || selectedPackage.status !== 'active' || !selectedPackage.isPublic) {
    throw apiError('INVALID_INPUT', 'Selected Careers package is not available.', 400);
  }

  const price = selectedPackage.prices[0];
  if (!price) throw apiError('INVALID_INPUT', 'Selected Careers package has no active price.', 400);

  return {
    package: selectedPackage,
    price,
    pricingSnapshot: {
      packageCode: selectedPackage.code,
      packageName: selectedPackage.name,
      currency,
      amountMinor: price.amountMinor,
      billingMode: price.billingMode,
      features: toStringArray(selectedPackage.features),
      quotas: toRecord(selectedPackage.quotas),
      sourcePriceId: price.id,
    },
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toRecord(value: unknown): Prisma.InputJsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Prisma.InputJsonObject : {};
}
