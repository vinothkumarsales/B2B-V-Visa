import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { zohoProductFetch } from './oauth';

type BooksSyncResult = {
  providerRecordId?: string;
  invoiceId?: string;
  paymentId?: string;
};

export function isZohoBooksConfigured() {
  return Boolean(env.ZOHO_BOOKS_ORGANIZATION_ID || env.ZOHO_PAYMENTS_ORG_ID);
}

export async function syncPaidApplicationToZohoBooks(input: {
  agencyId: string;
  applicationId?: string | null;
  paymentOrderId: string;
}): Promise<BooksSyncResult> {
  const organizationId = env.ZOHO_BOOKS_ORGANIZATION_ID || env.ZOHO_PAYMENTS_ORG_ID;
  if (!organizationId) throw new Error('ZOHO_BOOKS_ORGANIZATION_ID_MISSING');

  const paymentOrder = await db.paymentOrder.findFirst({
    where: { id: input.paymentOrderId, agencyId: input.agencyId },
    include: {
      agency: true,
      application: { include: { applicants: true } },
    },
  });
  if (!paymentOrder) throw new Error('PAYMENT_ORDER_NOT_FOUND');

  const agency = paymentOrder.agency;
  const application = paymentOrder.application;
  const contactId = await createBooksContact({
    organizationId,
    contactName: agency.name,
    email: agency.email,
    phone: agency.phone,
  });

  const invoiceId = await createBooksInvoice({
    organizationId,
    contactId,
    applicationId: application?.id ?? input.applicationId ?? paymentOrder.id,
    description: application
      ? `${application.destination} ${application.visaType}`
      : `V-Visa payment ${paymentOrder.id}`,
    amountMinor: paymentOrder.amountMinor,
    currency: paymentOrder.currency,
  });

  const paymentId = await createBooksCustomerPayment({
    organizationId,
    contactId,
    invoiceId,
    amountMinor: paymentOrder.amountMinor,
    currency: paymentOrder.currency,
    referenceNumber: paymentOrder.providerOrderId ?? paymentOrder.id,
  });

  return { providerRecordId: paymentId, invoiceId, paymentId };
}

async function createBooksContact(input: {
  organizationId: string;
  contactName: string;
  email?: string | null;
  phone?: string | null;
}) {
  if (input.email) {
    const existing = await booksFetch(
      `contacts?organization_id=${encodeURIComponent(input.organizationId)}&email_contains=${encodeURIComponent(input.email)}`,
      { method: 'GET' },
    );
    const existingData = await existing.json().catch(() => ({}));
    const existingId = maybeFirstString(existingData, ['contacts.0.contact_id', 'contacts.0.id']);
    if (existing.ok && existingId) return existingId;
  }

  const response = await booksFetch(
    `contacts?organization_id=${encodeURIComponent(input.organizationId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        contact_name: input.contactName,
        contact_type: 'customer',
        email: input.email || undefined,
        phone: input.phone || undefined,
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`ZOHO_BOOKS_CONTACT_${response.status}`);
  return firstString(data, ['contact.contact_id', 'contact_id', 'data.contact_id', 'contact.id', 'id']);
}

async function createBooksInvoice(input: {
  organizationId: string;
  contactId: string;
  applicationId: string;
  description: string;
  amountMinor: number;
  currency: string;
}) {
  const response = await booksFetch(
    `invoices?organization_id=${encodeURIComponent(input.organizationId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        customer_id: input.contactId,
        reference_number: input.applicationId,
        currency_code: input.currency,
        line_items: [
          {
            name: 'V-Visa application service',
            description: input.description,
            rate: input.amountMinor / 100,
            quantity: 1,
          },
        ],
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`ZOHO_BOOKS_INVOICE_${response.status}`);
  return firstString(data, ['invoice.invoice_id', 'invoice_id', 'data.invoice_id', 'invoice.id', 'id']);
}

async function createBooksCustomerPayment(input: {
  organizationId: string;
  contactId: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  referenceNumber: string;
}) {
  const response = await booksFetch(
    `customerpayments?organization_id=${encodeURIComponent(input.organizationId)}`,
    {
      method: 'POST',
      body: JSON.stringify({
        customer_id: input.contactId,
        payment_mode: 'online',
        amount: input.amountMinor / 100,
        currency_code: input.currency,
        reference_number: input.referenceNumber,
        invoices: [
          {
            invoice_id: input.invoiceId,
            amount_applied: input.amountMinor / 100,
          },
        ],
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`ZOHO_BOOKS_PAYMENT_${response.status}`);
  return firstString(data, ['payment.payment_id', 'payment_id', 'data.payment_id', 'payment.id', 'id']);
}

function booksFetch(path: string, init: RequestInit) {
  return zohoProductFetch(env.ZOHO_BOOKS_API_BASE, path, init);
}

function firstString(data: unknown, keys: string[]) {
  const value = maybeFirstString(data, keys);
  if (value) return value;
  throw new Error('ZOHO_BOOKS_ID_MISSING');
}

function maybeFirstString(data: unknown, keys: string[]) {
  for (const key of keys) {
    const value = key.split('.').reduce<unknown>((current, part) => {
      if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
      if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
      return (current as Record<string, unknown>)[part];
    }, data);
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}
