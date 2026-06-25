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
  const gstMinor = calculateGstMinor(
    [{ amountMinor: serviceFeeMinor, taxable: true }],
    gstRateBps
  );
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
