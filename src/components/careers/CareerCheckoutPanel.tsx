'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';

export function CareerCheckoutPanel({
  enabled,
  serviceRequestId,
  packageCode,
  currency,
  amountMinor,
}: {
  enabled: boolean;
  serviceRequestId: string;
  packageCode: string;
  currency: string;
  amountMinor: number;
}) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted) {
      setMessage('Accept the service terms to continue.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/careers/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceRequestId, packageCode, currency }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error?.message ?? 'Unable to create checkout.');
        return;
      }
      const checkoutUrl = payload.paymentIntent?.checkoutUrl;
      if (typeof checkoutUrl === 'string' && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      setMessage('Checkout created, but no checkout URL was returned.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-md border border-vvisa-border-subtle bg-vvisa-surface p-3 text-sm">
        <p className="font-medium">Checkout amount</p>
        <p className="mt-1 text-vvisa-text-secondary">{formatMoney(amountMinor, currency)}</p>
      </div>
      {!enabled && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Careers checkout is disabled by feature flag.
        </p>
      )}
      <label className="flex items-start gap-2 text-sm text-vvisa-text-secondary">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          disabled={!enabled || loading}
          className="mt-1"
        />
        <span>I accept the Careers service terms and understand this checkout does not activate service until payment is verified.</span>
      </label>
      <Button type="submit" disabled={!enabled || loading || !accepted}>
        {loading ? 'Creating checkout...' : 'Continue to checkout'}
      </Button>
      {message && <p className="text-sm text-vvisa-text-secondary">{message}</p>}
    </form>
  );
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
