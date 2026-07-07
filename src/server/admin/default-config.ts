import type { ApplicationStatus, DashboardSectionType, Prisma } from '@prisma/client';

export const defaultDashboardSections: Array<{
  key: string;
  name: string;
  type: DashboardSectionType;
  displayOrder: number;
  config: Prisma.InputJsonObject;
}> = [
  { key: 'welcome-banner', name: 'Welcome Banner', type: 'welcome', displayOrder: 10, config: { title: 'Welcome back, {{user_name}}', subtitle: 'You have {{pending_applications}} applications requiring attention.' } },
  { key: 'quick-actions', name: 'Quick Actions', type: 'quick_actions', displayOrder: 20, config: { layout: 'grid', maxItems: 8, showViewAll: false } },
  { key: 'application-summary', name: 'Application Summary', type: 'summary_cards', displayOrder: 30, config: { metricSource: 'applications', maxItems: 6 } },
  { key: 'pending-actions', name: 'Pending Actions', type: 'important_updates', displayOrder: 40, config: { hideWhenEmpty: true } },
  { key: 'recent-applications', name: 'Recent Applications', type: 'recent_applications', displayOrder: 50, config: { maxItems: 3, showViewAll: true } },
  { key: 'wallet-summary', name: 'Wallet Summary', type: 'wallet_summary', displayOrder: 60, config: { lowBalanceThresholdMinor: 500000 } },
  { key: 'featured-visas', name: 'Featured Visas', type: 'featured_visas', displayOrder: 70, config: { maxItems: 6, layout: 'horizontal' } },
  { key: 'featured-services', name: 'Featured Services', type: 'featured_services', displayOrder: 80, config: { maxItems: 4 } },
  { key: 'partner-offers', name: 'Partner Offers', type: 'partner_offers', displayOrder: 90, config: { dismissible: true } },
  { key: 'referral-program', name: 'Referral Program', type: 'referral_program', displayOrder: 100, config: { ctaRoute: '/alliance' } },
  { key: 'list-your-products', name: 'List Your Products', type: 'partner_offers', displayOrder: 110, config: { ctaRoute: '/alliance' } },
  { key: 'need-help', name: 'Need Help', type: 'support', displayOrder: 120, config: { showAccountManager: true } },
  { key: 'account-manager', name: 'Account Manager', type: 'support', displayOrder: 130, config: { showOnlyWhenAssigned: false } },
  { key: 'announcements', name: 'Announcements', type: 'announcements', displayOrder: 140, config: { location: 'dashboard' } },
];

export const defaultMilestones = [
  { key: 'application-created', label: 'Application Created', displayOrder: 10, progressPercent: 10 },
  { key: 'documents-submitted', label: 'Documents Submitted', displayOrder: 20, progressPercent: 30 },
  { key: 'documents-verified', label: 'Documents Verified', displayOrder: 30, progressPercent: 45 },
  { key: 'application-submitted', label: 'Application Submitted', displayOrder: 40, progressPercent: 65 },
  { key: 'under-processing', label: 'Under Processing', displayOrder: 50, progressPercent: 80 },
  { key: 'decision-received', label: 'Decision Received', displayOrder: 60, progressPercent: 95 },
  { key: 'completed', label: 'Completed', displayOrder: 70, progressPercent: 100 },
];

export const defaultApplicationStatuses: Array<{
  code: ApplicationStatus;
  adminLabel: string;
  partnerLabel: string;
  partnerDescription: string;
  colorToken: string;
  displayOrder: number;
  progressPercent: number;
  milestoneKey: string;
  isTerminal?: boolean;
  isSuccess?: boolean;
  isFailure?: boolean;
}> = [
  { code: 'DRAFT', adminLabel: 'Draft', partnerLabel: 'Draft', partnerDescription: 'The application has been started.', colorToken: 'neutral', displayOrder: 10, progressPercent: 5, milestoneKey: 'application-created' },
  { code: 'DOCUMENTS_PENDING', adminLabel: 'Documents Pending', partnerLabel: 'Documents Pending', partnerDescription: 'Please upload the required documents.', colorToken: 'warning', displayOrder: 20, progressPercent: 25, milestoneKey: 'application-created' },
  { code: 'READY_FOR_REVIEW', adminLabel: 'Ready for Review', partnerLabel: 'Documents Uploaded', partnerDescription: 'Documents are ready for VVisa review.', colorToken: 'info', displayOrder: 30, progressPercent: 35, milestoneKey: 'documents-submitted' },
  { code: 'UNDER_INTERNAL_REVIEW', adminLabel: 'Internal Review', partnerLabel: 'Documents Under Review', partnerDescription: 'Our team is reviewing the uploaded documents.', colorToken: 'info', displayOrder: 40, progressPercent: 40, milestoneKey: 'documents-submitted' },
  { code: 'PAYMENT_PENDING', adminLabel: 'Payment Pending', partnerLabel: 'Payment Pending', partnerDescription: 'Payment is required to continue processing.', colorToken: 'warning', displayOrder: 50, progressPercent: 45, milestoneKey: 'documents-verified' },
  { code: 'PAID', adminLabel: 'Paid', partnerLabel: 'Payment Confirmed', partnerDescription: 'Payment has been confirmed.', colorToken: 'success', displayOrder: 60, progressPercent: 55, milestoneKey: 'documents-verified' },
  { code: 'SUBMISSION_PENDING', adminLabel: 'Submission Pending', partnerLabel: 'Ready for Submission', partnerDescription: 'The application is ready for submission.', colorToken: 'info', displayOrder: 70, progressPercent: 60, milestoneKey: 'application-submitted' },
  { code: 'SUBMITTED', adminLabel: 'Submitted', partnerLabel: 'Application Submitted', partnerDescription: 'The application has been submitted for processing.', colorToken: 'info', displayOrder: 80, progressPercent: 70, milestoneKey: 'application-submitted' },
  { code: 'PROCESSING', adminLabel: 'Processing', partnerLabel: 'Under Processing', partnerDescription: 'The application is under processing.', colorToken: 'info', displayOrder: 90, progressPercent: 82, milestoneKey: 'under-processing' },
  { code: 'ADDITIONAL_DOCUMENTS_REQUIRED', adminLabel: 'Additional Documents Required', partnerLabel: 'Additional Documents Required', partnerDescription: 'Please upload the requested documents.', colorToken: 'warning', displayOrder: 100, progressPercent: 50, milestoneKey: 'documents-submitted' },
  { code: 'APPROVED', adminLabel: 'Approved', partnerLabel: 'Approved', partnerDescription: 'The visa application has been approved.', colorToken: 'success', displayOrder: 110, progressPercent: 100, milestoneKey: 'completed', isTerminal: true, isSuccess: true },
  { code: 'REJECTED', adminLabel: 'Rejected', partnerLabel: 'Rejected', partnerDescription: 'The application was rejected.', colorToken: 'danger', displayOrder: 120, progressPercent: 100, milestoneKey: 'decision-received', isTerminal: true, isFailure: true },
  { code: 'CANCELLED', adminLabel: 'Cancelled', partnerLabel: 'Cancelled', partnerDescription: 'The application was cancelled.', colorToken: 'neutral', displayOrder: 130, progressPercent: 100, milestoneKey: 'completed', isTerminal: true },
];

export const defaultTransitions: Array<{ from: ApplicationStatus; to: ApplicationStatus }> = [
  { from: 'DRAFT', to: 'DOCUMENTS_PENDING' },
  { from: 'DOCUMENTS_PENDING', to: 'READY_FOR_REVIEW' },
  { from: 'READY_FOR_REVIEW', to: 'UNDER_INTERNAL_REVIEW' },
  { from: 'UNDER_INTERNAL_REVIEW', to: 'PAYMENT_PENDING' },
  { from: 'UNDER_INTERNAL_REVIEW', to: 'ADDITIONAL_DOCUMENTS_REQUIRED' },
  { from: 'ADDITIONAL_DOCUMENTS_REQUIRED', to: 'READY_FOR_REVIEW' },
  { from: 'PAYMENT_PENDING', to: 'PAID' },
  { from: 'PAID', to: 'SUBMISSION_PENDING' },
  { from: 'SUBMISSION_PENDING', to: 'SUBMITTED' },
  { from: 'SUBMITTED', to: 'PROCESSING' },
  { from: 'PROCESSING', to: 'APPROVED' },
  { from: 'PROCESSING', to: 'REJECTED' },
];
