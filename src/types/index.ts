export type ApplicationStatus =
  | 'DRAFT'
  | 'RECEIVED'
  | 'VALIDATED'
  | 'QUEUED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'SUBMITTED'
  | 'OTP_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export type VisaCategory = 'LIGHTNING_FAST' | 'STANDARD' | 'MULTI_ENTRY';

export type VisaKind = 'E_VISA' | 'STICKER_VISA' | 'VISA_ON_ARRIVAL' | 'ETA' | 'OTHER';

export type VisaEntryType = 'SINGLE' | 'DOUBLE' | 'MULTIPLE' | 'NOT_SPECIFIED';
export type CourierDirection =
  | 'AGENT_TO_PROCESSING_CENTRE'
  | 'PROCESSING_CENTRE_TO_AGENT'
  | 'BOTH'
  | 'NOT_REQUIRED'
  | 'NOT_SPECIFIED';
export type RequirementStatus = 'CONFIRMED' | 'REVIEW_REQUIRED';
export type PassportValidityRuleCode =
  | 'SIX_MONTHS_FROM_TRAVEL'
  | 'SIX_MONTHS_FROM_ARRIVAL'
  | 'SIX_MONTHS_FROM_RETURN'
  | 'THREE_MONTHS_FROM_DEPARTURE'
  | 'VALID_FOR_STAY_DURATION'
  | 'MANUAL_RULE'
  | 'UNKNOWN';

export type VisaDocumentRequirementType =
  | 'MANDATORY'
  | 'CONDITIONAL'
  | 'OPTIONAL'
  | 'INFORMATIONAL'
  | 'INSTRUCTIONS';

export type VisaPricingLineType =
  | 'VISA_FEE'
  | 'VVISA_SERVICE_FEE'
  | 'VFS_FEE'
  | 'COURIER_FEE'
  | 'INSURANCE_FEE'
  | 'CONVENIENCE_FEE'
  | 'OTHER_FEE'
  | 'GST'
  | 'DISCOUNT'
  | 'CONSULAR_FEE'
  | 'SERVICE_FEE'
  | 'TAX'
  | 'OTHER';

export type VisaStickerRouteType = 'SUBMISSION' | 'COLLECTION' | 'ROUND_TRIP';
export type VisaStickerRouteKey = string | 'OTHER_INDIA';
export type VisaPricingResolutionStatus = 'PRICED' | 'MANUAL_QUOTATION';

export interface VisaDocumentRequirement {
  id: string;
  label: string;
  requirement: VisaDocumentRequirementType;
  documentCode?: string;
  documentName?: string;
  description?: string;
  isMandatory?: boolean;
  isOptional?: boolean;
  appliesToAdult?: boolean;
  appliesToMinor?: boolean;
  appliesToStickerVisa?: boolean;
  appliesToEVisa?: boolean;
  uploadRequired?: boolean;
  physicalOriginalRequired?: boolean;
  carryToAppointment?: boolean;
  courierRequired?: boolean;
  biometricRelated?: boolean;
  sampleAvailable?: boolean;
  requirementStatus?: RequirementStatus;
  notes?: string;
  acceptedFormats?: string[];
  maxFileSizeMb?: number;
  appliesTo?: 'TRAVELER' | 'AGENCY' | 'SPONSOR' | 'GROUP';
  conditionLabel?: string;
  sortOrder?: number;
}

export interface VisaPricingLineItem {
  id: string;
  label: string;
  type: VisaPricingLineType;
  amount: number;
  currency: string;
  taxable: boolean;
  quantity?: number;
  includedInBasePrice?: boolean;
  amountMinor?: number;
}

export interface VisaStickerRoute {
  id: string;
  type: VisaStickerRouteType;
  origin: string;
  destination: string;
  routeKey?: VisaStickerRouteKey;
  visaProductId?: string;
  originCityCode?: string;
  originCityLabel?: string;
  processingCentreCity?: string;
  processingCentreAddress?: string;
  courierFeeMinor?: number;
  serviceFeeAdjustmentMinor?: number;
  estimatedOutboundDays?: number;
  estimatedReturnDays?: number;
  deliveryInstructions?: string;
  isActive?: boolean;
  carrier?: string;
  estimatedDays?: number;
  notes?: string;
}

export type VisaJurisdictionCentreType =
  | 'EMBASSY'
  | 'CONSULATE'
  | 'VFS'
  | 'BLS'
  | 'VISA_APPLICATION_CENTRE'
  | 'PROCESSING_HUB'
  | 'ONLINE'
  | 'OTHER';

export type VerificationStatus = 'OFFICIAL_VERIFIED' | 'SUPPLIER_ONLY' | 'CONFLICT' | 'REVIEW_REQUIRED';

export interface VisaJurisdictionRule {
  id: string;
  visaProductId: string;
  jurisdictionCode: string;
  jurisdictionLabel: string;
  destinationCountry: string;
  applicantResidenceCountries?: string[];
  applicantResidenceStates?: string[];
  applicantResidenceUnionTerritories?: string[];
  applicantResidenceCities?: string[];
  applicantPostalCodePrefixes?: string[];
  passportIssueStates?: string[];
  passportIssueCities?: string[];
  submissionCentreName?: string;
  submissionCentreType?: VisaJurisdictionCentreType;
  submissionCentreCity?: string;
  submissionCentreAddress?: string;
  biometricCentreCity?: string;
  processingCentreCity?: string;
  courierAvailable: boolean;
  physicalAppearanceRequired: boolean;
  priority: number;
  isFallback: boolean;
  isActive: boolean;
  sourceText: string;
  verificationStatus: VerificationStatus;
}

export interface JurisdictionOverride {
  jurisdictionRuleId: string;
  documentRequirementIds?: string[];
  pricingAdjustmentMinor?: number;
  processingTimeOverride?: string;
  submissionInstructions?: string[];
}

export interface VisaChecklistSection {
  type: VisaDocumentRequirementType;
  label: string;
  items: VisaDocumentRequirement[];
}

export interface VisaChecklistResolution {
  visaProductId: string;
  uploadItems: VisaDocumentRequirement[];
  sections: VisaChecklistSection[];
}

export interface VisaPricingResult {
  status: VisaPricingResolutionStatus;
  visaProductId: string;
  currency: string;
  quantity: number;
  routeKey?: VisaStickerRouteKey;
  matchedRouteId?: string;
  manualQuotationRequired: boolean;
  manualQuotationReason?: string;
  price: VisaPrice;
  visibleTotalMinor: number;
  popoverLines: VisaPricingLineItem[];
}

export interface VisaCourierRules {
  required: boolean;
  available: boolean;
  physicalSubmissionRequired?: boolean;
  courierRequired?: boolean;
  courierDirection?: CourierDirection;
  submissionCentreName?: string;
  submissionAddress?: string;
  submissionCity?: string;
  returnCourierAvailable?: boolean;
  returnCourierFeeMinor?: number;
  outboundCourierFeeMinor?: number;
  courierInstructions?: string;
  passportCollectionAvailable?: boolean;
  passportCollectionCities?: string[];
  routes?: VisaStickerRoute[];
  allowSelfDropOff?: boolean;
  allowSelfCollection?: boolean;
  notes?: string;
}

export interface VisaPassportValidityRule {
  minimumMonthsFrom?: 'ARRIVAL_DATE' | 'DEPARTURE_DATE' | 'APPLICATION_DATE';
  minimumMonths: number;
  rule?: PassportValidityRuleCode;
  blankPagesRequired?: number;
  passportTypeNotes?: string;
}

export interface VisaPrice {
  visaFeeMinor: number;
  vvisaServiceFeeMinor: number;
  courierFeeMinor?: number;
  insuranceFeeMinor?: number;
  convenienceFeeMinor?: number;
  otherFeeMinor?: number;
  discountMinor?: number;
  gstMinor: number;
  totalAmountMinor: number;
  currency: string;
  lines: VisaPricingLineItem[];
}

export interface ApprovedVisaProduct {
  id: string;
  status: 'APPROVED' | 'DRAFT' | 'ARCHIVED';
  destination: string;
  destinationCode?: string;
  name: string;
  category?: VisaCategory;
  entry?: string;
  entryType?: VisaEntryType;
  visaKind?: VisaKind;
  purpose?: string;
  validity?: string;
  duration?: string;
  processingTime?: string;
  price?: number;
  priceMinor?: number;
  currency?: string;
  documents?: string[];
  documentRequirements?: VisaType['documentRequirements'];
  pricingLineItems?: VisaPricingLineItem[];
  pricing?: VisaPrice;
  stickerRoutes?: VisaStickerRoute[];
  courierRules?: VisaCourierRules;
  jurisdictions?: VisaJurisdictionRule[];
  jurisdictionOverrides?: JurisdictionOverride[];
  passportValidityRule?: VisaPassportValidityRule;
  cutoffTime?: string;
  publicationVersion?: string;
  publicationHash?: string;
  publishedAt?: string;
}

export interface MinorGuardianLink {
  minorApplicantId: string;
  guardianApplicantId: string;
  relationship: 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN' | 'OTHER_GUARDIAN';
}

export type WalletTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND';

export type PaymentMethod = 'BANK_TRANSFER' | 'UPI' | 'CREDIT_CARD' | 'WALLET';

export type ViewRoute =
  | 'landing'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'explore'
  | 'apply'
  | 'applications'
  | 'application-detail'
  | 'wallet'
  | 'alliance'
  | 'overstay'
  | 'profile'
  | 'change-password';

export interface Agency {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  logo?: string;
  country: string;
  accountType: string;
  gstNumber?: string;
  panCard?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  walletBalance: number;
}

export interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality: string;
  sex?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  placeOfIssue?: string;
  maritalStatus?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  isChild: boolean;
  guardianApplicantId?: string;
  guardianRelationship?: MinorGuardianLink['relationship'];
  status: ApplicationStatus;
  referenceNo?: string;
  estimatedArrival?: string;
  deliveredAt?: string;
}

export interface VisaApplication {
  id: string;
  agencyId: string;
  groupId?: string;
  internalId?: string;
  groupName?: string;
  destination: string;
  visaType: string;
  visaCategory?: VisaCategory;
  travelDate?: string;
  returnDate?: string;
  status: ApplicationStatus;
  totalPrice: number;
  travelers: Traveler[];
  createdAt: string;
  updatedAt: string;
}

export interface VisaType {
  id: string;
  destination: string;
  destinationCode?: string;
  name: string;
  category: VisaCategory;
  entry: string;
  entryType?: VisaEntryType;
  visaKind?: VisaKind;
  purpose?: string;
  nationalityEligibility?: string[];
  validity: string;
  visaValidityDays?: number;
  duration: string;
  maximumStayDays?: number;
  processingTime: string;
  processingTimeMinDays?: number;
  processingTimeMaxDays?: number;
  processingTimeLabel?: string;
  price: number;
  currency: string;
  documents: string[];
  documentRequirements?: {
    mandatory: VisaDocumentRequirement[];
    conditional?: VisaDocumentRequirement[];
    optional: VisaDocumentRequirement[];
    informational?: VisaDocumentRequirement[];
    instructions?: VisaDocumentRequirement[];
  };
  pricingLineItems?: VisaPricingLineItem[];
  pricing?: VisaPrice;
  stickerRoutes?: VisaStickerRoute[];
  courierRules?: VisaCourierRules;
  jurisdictions?: VisaJurisdictionRule[];
  jurisdictionOverrides?: JurisdictionOverride[];
  passportValidityRule?: VisaPassportValidityRule;
  minimumPassportValidityMonths?: number;
  cutoffTime?: string;
  publicationVersion?: string;
  publicationHash?: string;
  publishedAt?: string;
}

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  method?: PaymentMethod;
  status: string;
  description: string;
  createdAt: string;
}

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  dot: string;
}

export interface DashboardStats {
  totalApplications: number;
  approvedThisMonth: number;
  walletBalance: number;
  pendingPayment: number;
}

export interface AllianceLink {
  id: string;
  customerName: string;
  destination: string;
  travelOn: string;
  link: string;
  createdAt: string;
}

export interface OverstayCase {
  id: string;
  name: string;
  passportNumber: string;
  daysLeftToOverstay: number;
  entryDate: string;
  status: string;
  amountToPay: number;
}
