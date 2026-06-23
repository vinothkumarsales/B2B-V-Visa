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

export type WalletTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'REFUND';

export type PaymentMethod = 'BANK_TRANSFER' | 'UPI' | 'CREDIT_CARD';

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
  name: string;
  category: VisaCategory;
  entry: string;
  validity: string;
  duration: string;
  processingTime: string;
  price: number;
  currency: string;
  documents: string[];
  cutoffTime?: string;
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