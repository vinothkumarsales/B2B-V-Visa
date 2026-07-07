import Link from 'next/link';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function FixtureCheckoutPage({
  params,
}: {
  params: Promise<{ checkoutId: string }>;
}) {
  const { checkoutId } = await params;

  return (
    <main className="min-h-screen bg-vvisa-surface-2 px-5 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-lg border-vvisa-border-subtle">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-amber-600" />
              <CardTitle>Test checkout</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-vvisa-text-secondary">
            <p className="text-base font-medium text-foreground">No real payment will be processed.</p>
            <p>This fixture page verifies the Careers checkout handoff only. It cannot authorise, capture, or confirm payment.</p>
            <div className="rounded-md border border-vvisa-border-subtle bg-vvisa-surface p-3">
              <p className="text-xs text-vvisa-text-muted">Fixture checkout reference</p>
              <p className="mt-1 break-all font-mono text-xs">{checkoutId}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-vvisa-text-muted">
              <ShieldCheck className="size-4" />
              Subscription activation, Career-Ops activation, CRM sync, and submission remain disabled.
            </div>
            <Button asChild>
              <Link href="/careers/dashboard">Return to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
