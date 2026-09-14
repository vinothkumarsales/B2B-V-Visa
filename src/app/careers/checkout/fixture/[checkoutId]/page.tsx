import Link from 'next/link';
import { AlertTriangle, ArrowRight, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function FixtureCheckoutPage({
  params,
}: {
  params: Promise<{ checkoutId: string }>;
}) {
  const { checkoutId } = await params;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_42%,#f4f8fb_100%)] px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Card className="overflow-hidden rounded-2xl border-vvisa-border-subtle bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <CardHeader className="border-b border-vvisa-border-subtle bg-slate-950 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge className="mb-4 bg-amber-300 text-amber-950">
                  <AlertTriangle className="size-3.5" />
                  Fixture checkout
                </Badge>
                <CardTitle className="text-3xl">Test checkout handoff</CardTitle>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  This page proves the Careers checkout routing experience only. It does not authorise, capture, or confirm a real payment.
                </p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                <CreditCard className="size-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6 text-sm text-vvisa-text-secondary md:p-8">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['No real payment', AlertTriangle],
                ['Signed webhook later', ShieldCheck],
                ['Private candidate flow', LockKeyhole],
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-4">
                  <Icon className="size-5 text-primary" />
                  <p className="mt-3 font-medium text-foreground">{label as string}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface p-4">
              <p className="text-xs text-vvisa-text-muted">Fixture checkout reference</p>
              <p className="mt-1 break-all font-mono text-xs">{checkoutId}</p>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-vvisa-border-subtle bg-white p-4 text-xs leading-5 text-vvisa-text-muted">
              <ShieldCheck className="size-4" />
              Subscription activation, Career-Ops activation, CRM sync, and submission remain disabled.
            </div>
            <Button asChild>
              <Link href="/careers/dashboard">
                Return to dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
