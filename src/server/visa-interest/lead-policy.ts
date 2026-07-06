export type VisaInterestIntent =
  | 'BROWSE'
  | 'VISA_SELECTED'
  | 'PRICE_VIEWED'
  | 'CHECKLIST_VIEWED'
  | 'APPLICATION_STARTED'
  | 'APPLICANT_DETAILS_ENTERED'
  | 'PAYMENT_INITIATED';

export type LeadTiming = 'NONE' | 'DELAYED' | 'IMMEDIATE';

export function getVisaInterestLeadTiming(intent: VisaInterestIntent): LeadTiming {
  if (
    intent === 'APPLICATION_STARTED' ||
    intent === 'APPLICANT_DETAILS_ENTERED' ||
    intent === 'PAYMENT_INITIATED'
  ) {
    return 'IMMEDIATE';
  }

  if (
    intent === 'VISA_SELECTED' ||
    intent === 'PRICE_VIEWED' ||
    intent === 'CHECKLIST_VIEWED'
  ) {
    return 'DELAYED';
  }

  return 'NONE';
}

export function isMeaningfulVisaIntent(intent: VisaInterestIntent) {
  return getVisaInterestLeadTiming(intent) !== 'NONE';
}
