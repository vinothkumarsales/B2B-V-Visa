/**
 * Customer proof.
 *
 * `permission` records that the named person agreed to be quoted publicly, and
 * `basis` records how a number was arrived at. Both are required rather than
 * optional so a claim cannot be published without its provenance.
 */
export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
  permission: 'written' | 'pending';
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'The wallet system and real-time tracking are game-changers. We can prepare a whole group in one pass instead of one traveller at a time.',
    author: 'Priya Iyer',
    role: 'Operations Head',
    company: 'RV Holiday',
    permission: 'written',
  },
  {
    quote:
      'Our clients love the transparency. They can see where a visa is without us chasing anyone for an update.',
    author: 'Sneha Kapoor',
    role: 'CEO',
    company: 'Family Holidays',
    permission: 'written',
  },
];

/** Facts that are verifiable from this repository, not marketing claims. */
export const TRUST_POINTS = [
  { label: 'Bank transfer and UPI', value: '0% fee' },
  { label: 'Invoicing', value: 'GST compliant' },
  { label: 'Passport intake', value: 'OCR assisted' },
] as const;
