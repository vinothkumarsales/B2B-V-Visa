import type { VisaType } from '@/types';

export interface ApplicantValidationIssue {
  travelerId?: string;
  field?: string;
  message: string;
  blocksSubmit: boolean;
}

export function isTouristVisa(visa?: VisaType | null): boolean {
  if (!visa) return false;
  const cat = (visa.category || '').toLowerCase();
  const purpose = (visa.purpose || '').toLowerCase();
  const name = (visa.name || '').toLowerCase();
  return (
    cat === 'tourist' ||
    cat === 'standard' ||
    cat === 'lightning_fast' ||
    cat === 'multi_entry' ||
    purpose.includes('tourist') ||
    purpose.includes('visitor') ||
    purpose.includes('tourism') ||
    purpose.includes('holiday') ||
    purpose.includes('leisure') ||
    name.includes('tourist') ||
    name.includes('visitor') ||
    name.includes('holiday')
  );
}

export function validateTravelDates(
  visa: VisaType | null | undefined,
  travelDate: string,
  returnDate: string
): ApplicantValidationIssue[] {
  const issues: ApplicantValidationIssue[] = [];
  const tourist = isTouristVisa(visa);

  if (tourist) {
    if (!travelDate) {
      issues.push({
        travelerId: 'travel-date',
        message: 'Departure / Travel Date is mandatory for tourist visas.',
        blocksSubmit: true,
      });
    }
    if (!returnDate) {
      issues.push({
        travelerId: 'return-date',
        message: 'Return Date is mandatory for tourist visas.',
        blocksSubmit: true,
      });
    }
  }

  if (travelDate && returnDate && returnDate < travelDate) {
    issues.push({
      travelerId: 'date-order',
      message: 'Return Date cannot be earlier than Departure / Travel Date.',
      blocksSubmit: true,
    });
  }

  return issues;
}
