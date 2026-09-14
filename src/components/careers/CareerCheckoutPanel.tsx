'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-vvisa-border-subtle bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_100%)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-vvisa-text-muted">Checkout amount</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">{formatMoney(amountMinor, currency)}</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--vvisa-shadow-md)]">
            <CreditCard className="size-5" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">Fixture-ready</Badge>
          <Badge variant="outline">Verification required</Badge>
        </div>
      </div>
      {!enabled && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Careers checkout is disabled by feature flag.
        </p>
      )}
      <label className="flex items-start gap-3 rounded-xl border border-vvisa-border-subtle bg-white p-4 text-sm leading-6 text-vvisa-text-secondary">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          disabled={!enabled || loading}
          className="mt-1 size-4"
        />
        <span>I accept the Careers service terms and understand this checkout does not activate service until payment is verified.</span>
      </label>
      <Button type="submit" disabled={!enabled || loading || !accepted} className="w-full">
        {loading ? <><Loader2 className="size-4 animate-spin" /> Creating checkout...</> : <><CheckCircle2 className="size-4" /> Continue to checkout <ArrowRight className="size-4" /></>}
      </Button>
      <div className="flex items-start gap-2 text-xs leading-5 text-vvisa-text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Payment must be verified before subscription and service activation can move forward.
      </div>
      {message && <p className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-3 text-sm text-vvisa-text-secondary">{message}</p>}
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
