export type StatusStyle = { label: string; bg: string; text: string; dot: string };

/**
 * Badge skins for application statuses.
 *
 * These are used on light and dark surfaces alike, so each tone pairs a
 * translucent tint with a colour that keeps its contrast in both themes —
 * a `dark:` override lifts the text where the light-theme shade is too deep.
 */
export const statusTones = {
  neutral: {
    bg: 'bg-zinc-500/12 dark:bg-zinc-400/15',
    text: 'text-zinc-700 dark:text-zinc-300',
    dot: 'bg-zinc-500 dark:bg-zinc-400',
  },
  warning: {
    bg: 'bg-amber-500/14 dark:bg-amber-400/15',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  info: {
    bg: 'bg-sky-500/14 dark:bg-sky-400/15',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  indigo: {
    bg: 'bg-indigo-500/14 dark:bg-indigo-400/15',
    text: 'text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
  },
  blue: {
    bg: 'bg-blue-500/14 dark:bg-blue-400/15',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500 dark:bg-blue-400',
  },
  violet: {
    bg: 'bg-violet-500/14 dark:bg-violet-400/15',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-500 dark:bg-violet-400',
  },
  orange: {
    bg: 'bg-orange-500/14 dark:bg-orange-400/15',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500 dark:bg-orange-400',
  },
  success: {
    bg: 'bg-emerald-500/14 dark:bg-emerald-400/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  danger: {
    bg: 'bg-red-500/14 dark:bg-red-400/15',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500 dark:bg-red-400',
  },
} as const satisfies Record<string, Omit<StatusStyle, 'label'>>;

export type StatusTone = keyof typeof statusTones;

export const fallbackStatusConfig: Record<string, StatusStyle> = {
  DRAFT: { label: 'Draft', ...statusTones.neutral },
  DOCUMENTS_PENDING: { label: 'Documents Pending', ...statusTones.warning },
  READY_FOR_REVIEW: { label: 'Ready for Review', ...statusTones.info },
  UNDER_INTERNAL_REVIEW: { label: 'Under Review', ...statusTones.indigo },
  PAYMENT_PENDING: { label: 'Pending Payment', ...statusTones.warning },
  PAID: { label: 'Paid', ...statusTones.success },
  SUBMISSION_PENDING: { label: 'Submission Pending', ...statusTones.blue },
  SUBMITTED: { label: 'Submitted', ...statusTones.blue },
  PROCESSING: { label: 'Under Processing', ...statusTones.violet },
  ADDITIONAL_DOCUMENTS_REQUIRED: { label: 'Additional Documents Required', ...statusTones.orange },
  APPROVED: { label: 'Approved', ...statusTones.success },
  REJECTED: { label: 'Rejected', ...statusTones.danger },
  CANCELLED: { label: 'Cancelled', ...statusTones.neutral },
};

export const statusConfig = fallbackStatusConfig;

export function statusLabel(code: string) {
  return fallbackStatusConfig[code]?.label ?? code.replaceAll('_', ' ');
}
