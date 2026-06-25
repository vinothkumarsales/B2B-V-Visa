import type { Agency } from '@/types';

export const demoAgency: Agency = {
  id: 'demo-agency',
  name: 'VVisa Demo Agency',
  email: 'demo@vvisa.in',
  phone: '+910000000000',
  country: 'India',
  accountType: 'demo',
  gstNumber: 'DEMO-GST',
  panCard: 'DEMO-PAN',
  addressLine1: 'Demo portal data',
  city: 'Bengaluru',
  state: 'Karnataka',
  zipCode: '560001',
  walletBalance: 28040,
};

export const demoModeCopy = {
  badge: 'Demo mode',
  accountLabel: 'Demo Account',
  walletLabel: 'Demo wallet',
  priceLabel: 'Indicative demo price',
  paymentNotice: 'Demo only - no payment was processed.',
  applicationNotice: 'Demo only - this application was not submitted to VVisa operations.',
  documentNotice: 'Demo only - uploaded documents are scanned for preview and are not retained.',
};
