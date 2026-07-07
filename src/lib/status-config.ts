export type StatusStyle = { label: string; bg: string; text: string; dot: string };

export const fallbackStatusConfig: Record<string, StatusStyle> = {
  DRAFT: { label: 'Draft', bg: 'bg-zinc-900/50', text: 'text-zinc-300', dot: 'bg-zinc-400' },
  DOCUMENTS_PENDING: { label: 'Documents Pending', bg: 'bg-amber-950/50', text: 'text-amber-400', dot: 'bg-amber-400' },
  READY_FOR_REVIEW: { label: 'Ready for Review', bg: 'bg-sky-950/50', text: 'text-sky-400', dot: 'bg-sky-400' },
  UNDER_INTERNAL_REVIEW: { label: 'Under Review', bg: 'bg-indigo-950/50', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  PAYMENT_PENDING: { label: 'Pending Payment', bg: 'bg-amber-950/50', text: 'text-amber-400', dot: 'bg-amber-400' },
  PAID: { label: 'Paid', bg: 'bg-emerald-950/50', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  SUBMISSION_PENDING: { label: 'Submission Pending', bg: 'bg-blue-950/50', text: 'text-blue-400', dot: 'bg-blue-400' },
  SUBMITTED: { label: 'Submitted', bg: 'bg-blue-950/50', text: 'text-blue-400', dot: 'bg-blue-400' },
  PROCESSING: { label: 'Under Processing', bg: 'bg-violet-950/50', text: 'text-violet-400', dot: 'bg-violet-400' },
  ADDITIONAL_DOCUMENTS_REQUIRED: { label: 'Additional Documents Required', bg: 'bg-orange-950/50', text: 'text-orange-400', dot: 'bg-orange-400' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-950/50', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-950/50', text: 'text-red-400', dot: 'bg-red-400' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-zinc-900/50', text: 'text-zinc-300', dot: 'bg-zinc-400' },
};

export const statusConfig = fallbackStatusConfig;

export function statusLabel(code: string) {
  return fallbackStatusConfig[code]?.label ?? code.replaceAll('_', ' ');
}
