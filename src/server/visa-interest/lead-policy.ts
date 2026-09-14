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
  return intent === 'BROWSE' || intent === 'VISA_SELECTED' || intent === 'PRICE_VIEWED' || intent === 'CHECKLIST_VIEWED' || intent === 'APPLICATION_STARTED' || intent === 'APPLICANT_DETAILS_ENTERED' || intent === 'PAYMENT_INITIATED' ? 'IMMEDIATE' : 'NONE';
}

export function isMeaningfulVisaIntent(intent: VisaInterestIntent) {
  return getVisaInterestLeadTiming(intent) !== 'NONE';
}
