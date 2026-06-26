import type { VisaPrice, VisaPricingLineItem, VisaPricingResult, VisaStickerRouteKey, VisaType } from '@/types';

export const GST_RATE_BPS = 1800;

export type PriceLineType =
  | 'VISA_FEE'
  | 'VVISA_SERVICE_FEE'
  | 'COURIER_FEE'
  | 'INSURANCE_FEE'
  | 'CONVENIENCE_FEE'
  | 'OTHER_FEE'
  | 'DISCOUNT'
  | 'GST';

export interface PriceLine {
  type: PriceLineType;
  label: string;
  amountMinor: number;
  taxable: boolean;
  emphasis?: boolean;
}

export interface PriceBreakdown {
  visaFeeMinor: number;
  serviceFeeMinor: number;
  courierFeeMinor: number;
  insuranceFeeMinor: number;
  convenienceFeeMinor: number;
  otherFeeMinor: number;
  discountMinor: number;
  gstMinor: number;
  totalMinor: number;
  currency: string;
  gstRateBps: number;
  lines: PriceLine[];
}

export function rupeesToMinor(amount: number): number {
  return Math.round(amount * 100);
}

export function minorToRupees(amountMinor: number): number {
  return amountMinor / 100;
}

export function formatMoneyMinor(amountMinor: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(minorToRupees(amountMinor));
}

export function calculateGstMinor(lines: Pick<PriceLine, 'amountMinor' | 'taxable'>[], gstRateBps = GST_RATE_BPS): number {
  const taxableBaseMinor = lines
    .filter((line) => line.taxable && line.amountMinor > 0)
    .reduce((sum, line) => sum + line.amountMinor, 0);

  return Math.round((taxableBaseMinor * gstRateBps) / 10000);
}

export function buildVisaPriceBreakdown(
  totalMinor: number,
  currency = 'INR',
  gstRateBps = GST_RATE_BPS,
  quantity = 1
): PriceBreakdown {
  const safeTotalMinor = Math.max(0, Math.round(totalMinor));
  const safeQuantity = Math.max(1, quantity);
  const perApplicantTotalMinor = Math.round(safeTotalMinor / safeQuantity);
  const estimatedVisaFeePerApplicantMinor = Math.round(perApplicantTotalMinor * 0.7);
  const serviceAndGstPerApplicantMinor = perApplicantTotalMinor - estimatedVisaFeePerApplicantMinor;
  const serviceFeePerApplicantMinor = Math.round((serviceAndGstPerApplicantMinor * 10000) / (10000 + gstRateBps));
  const serviceFeeMinor = serviceFeePerApplicantMinor * safeQuantity;
  const gstMinor = calculateGstMinor([{ amountMinor: serviceFeeMinor, taxable: true }], gstRateBps);
  const visaFeeMinor = safeTotalMinor - serviceFeeMinor - gstMinor;
  const lines: PriceLine[] = [
    { type: 'VISA_FEE', label: 'Visa Fee', amountMinor: visaFeeMinor, taxable: false },
    { type: 'VVISA_SERVICE_FEE', label: 'V-Visa Service Fee', amountMinor: serviceFeeMinor, taxable: true },
    { type: 'GST', label: `GST (${gstRateBps / 100}%)`, amountMinor: gstMinor, taxable: false },
    { type: 'OTHER_FEE', label: 'Total', amountMinor: safeTotalMinor, taxable: false, emphasis: true },
  ];

  return {
    visaFeeMinor,
    serviceFeeMinor,
    courierFeeMinor: 0,
    insuranceFeeMinor: 0,
    convenienceFeeMinor: 0,
    otherFeeMinor: 0,
    discountMinor: 0,
    gstMinor,
    totalMinor: safeTotalMinor,
    currency,
    gstRateBps,
    lines,
  };
}

export function getNonZeroPriceRows(breakdown: PriceBreakdown) {
  return breakdown.lines.filter((row) => row.amountMinor !== 0);
}

function breakdownToVisaPrice(breakdown: PriceBreakdown): VisaPrice {
  return {
    visaFeeMinor: breakdown.visaFeeMinor,
    vvisaServiceFeeMinor: breakdown.serviceFeeMinor,
    courierFeeMinor: breakdown.courierFeeMinor,
    insuranceFeeMinor: breakdown.insuranceFeeMinor,
    convenienceFeeMinor: breakdown.convenienceFeeMinor,
    otherFeeMinor: breakdown.otherFeeMinor,
    discountMinor: breakdown.discountMinor,
    gstMinor: breakdown.gstMinor,
    totalAmountMinor: breakdown.totalMinor,
    currency: breakdown.currency,
    lines: breakdown.lines.map((line, index) => ({
      id: `${line.type.toLowerCase()}-${index}`,
      label: line.label,
      type: line.type,
      amount: minorToRupees(line.amountMinor),
      amountMinor: line.amountMinor,
      currency: breakdown.currency,
      taxable: line.taxable,
      quantity: 1,
    })),
  };
}

function lineAmountMinor(line: VisaPricingLineItem): number {
  return Math.round(line.amountMinor ?? line.amount * 100);
}

function buildLineItemPrice(lines: VisaPricingLineItem[], currency: string, quantity: number): VisaPrice {
  const expandedLines = lines.map((line) => {
    const amountMinor = lineAmountMinor(line) * (line.quantity ?? quantity);
    return {
      ...line,
      amountMinor,
      amount: minorToRupees(amountMinor),
      currency: line.currency || currency,
    };
  });

  const sum = (types: VisaPricingLineItem['type'][]) =>
    expandedLines.filter((line) => types.includes(line.type)).reduce((total, line) => total + (line.amountMinor ?? 0), 0);

  const positiveTotal = expandedLines
    .filter((line) => line.type !== 'DISCOUNT')
    .reduce((total, line) => total + (line.amountMinor ?? 0), 0);
  const discountMinor = sum(['DISCOUNT']);

  return {
    visaFeeMinor: sum(['VISA_FEE', 'CONSULAR_FEE']),
    vvisaServiceFeeMinor: sum(['VVISA_SERVICE_FEE', 'SERVICE_FEE']),
    courierFeeMinor: sum(['COURIER_FEE']),
    insuranceFeeMinor: sum(['INSURANCE_FEE']),
    convenienceFeeMinor: sum(['CONVENIENCE_FEE']),
    otherFeeMinor: sum(['OTHER_FEE', 'OTHER']),
    discountMinor,
    gstMinor: sum(['GST', 'TAX']),
    totalAmountMinor: positiveTotal - discountMinor,
    currency,
    lines: expandedLines,
  };
}

function resolveStickerRoute(visa: VisaType, routeKey?: VisaStickerRouteKey) {
  if (visa.visaKind !== 'STICKER_VISA') {
    return { route: undefined, manual: false };
  }

  const routes = visa.stickerRoutes ?? visa.courierRules?.routes ?? [];
  const exact = routeKey
    ? routes.find((route) => route.id === routeKey || route.routeKey === routeKey || route.originCityCode === routeKey)
    : undefined;
  if (exact) return { route: exact, manual: false };

  const otherIndia = routes.find((route) => route.routeKey === 'OTHER_INDIA' || route.originCityCode === 'OTHER_INDIA');
  if (otherIndia) return { route: otherIndia, manual: false };

  return { route: undefined, manual: true };
}

export function resolveVisaPricing(visa: VisaType, options: { quantity?: number; routeKey?: VisaStickerRouteKey } = {}): VisaPricingResult {
  const quantity = Math.max(1, options.quantity ?? 1);
  const currency = visa.currency || visa.pricing?.currency || 'INR';
  const routeResolution = resolveStickerRoute(visa, options.routeKey);
  const basePrice =
    visa.pricing ??
    (visa.pricingLineItems?.length
      ? buildLineItemPrice(visa.pricingLineItems, currency, quantity)
      : breakdownToVisaPrice(buildVisaPriceBreakdown(rupeesToMinor(visa.price) * quantity, currency, GST_RATE_BPS, quantity)));

  const routeCourierFeeMinor = routeResolution.route?.courierFeeMinor ?? 0;
  const routeServiceFeeMinor = routeResolution.route?.serviceFeeAdjustmentMinor ?? 0;
  const routeGstMinor = routeServiceFeeMinor
    ? calculateGstMinor([{ amountMinor: routeServiceFeeMinor, taxable: true }])
    : 0;
  const routeLines: VisaPricingLineItem[] = [
    routeCourierFeeMinor
      ? {
          id: `route-courier-${routeResolution.route?.id}`,
          label: routeResolution.route?.deliveryInstructions || 'Sticker visa courier',
          type: 'COURIER_FEE',
          amount: minorToRupees(routeCourierFeeMinor),
          amountMinor: routeCourierFeeMinor,
          currency,
          taxable: false,
          quantity: 1,
        }
      : null,
    routeServiceFeeMinor
      ? {
          id: `route-service-${routeResolution.route?.id}`,
          label: 'Sticker route service adjustment',
          type: 'SERVICE_FEE',
          amount: minorToRupees(routeServiceFeeMinor),
          amountMinor: routeServiceFeeMinor,
          currency,
          taxable: true,
          quantity: 1,
        }
      : null,
    routeGstMinor
      ? {
          id: `route-gst-${routeResolution.route?.id}`,
          label: 'GST on route service adjustment',
          type: 'GST',
          amount: minorToRupees(routeGstMinor),
          amountMinor: routeGstMinor,
          currency,
          taxable: false,
          quantity: 1,
        }
      : null,
  ].filter(Boolean) as VisaPricingLineItem[];

  const visibleTotalMinor = basePrice.totalAmountMinor + routeCourierFeeMinor + routeServiceFeeMinor + routeGstMinor;
  const price = {
    ...basePrice,
    courierFeeMinor: (basePrice.courierFeeMinor ?? 0) + routeCourierFeeMinor,
    vvisaServiceFeeMinor: basePrice.vvisaServiceFeeMinor + routeServiceFeeMinor,
    gstMinor: basePrice.gstMinor + routeGstMinor,
    totalAmountMinor: visibleTotalMinor,
    lines: [...basePrice.lines, ...routeLines],
  };

  return {
    status: routeResolution.manual ? 'MANUAL_QUOTATION' : 'PRICED',
    visaProductId: visa.id,
    currency,
    quantity,
    routeKey: options.routeKey,
    matchedRouteId: routeResolution.route?.id,
    manualQuotationRequired: routeResolution.manual,
    manualQuotationReason: routeResolution.manual ? 'Sticker visa route needs manual quotation' : undefined,
    price,
    visibleTotalMinor,
    popoverLines: price.lines.filter((line) => lineAmountMinor(line) !== 0),
  };
}
