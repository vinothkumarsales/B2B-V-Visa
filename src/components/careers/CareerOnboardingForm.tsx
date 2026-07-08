'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { BriefcaseBusiness, CheckCircle2, FileText, Globe2, Loader2, LockKeyhole, MapPinned, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type CareerPackageOption = {
  code: string;
  name: string;
  description: string;
  currency: string;
  amountMinor: number;
  billingMode: string;
};

export function CareerOnboardingForm({
  enabled,
  packages,
}: {
  enabled: boolean;
  packages: CareerPackageOption[];
}) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const packageOptions = packages.length
    ? packages
    : [
        {
          code: 'EUROPE_JOB_SEARCH_ASSIST',
          name: 'Europe Job Search Assist',
          description: 'Package configuration is currently disabled.',
          currency: 'INR',
          amountMinor: 0,
          billingMode: 'one_time',
        },
      ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setMessage('');
    try {
      const roles = String(formData.get('targetRoles') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const countries = String(formData.get('targetCountries') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const response = await fetch('/api/careers/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.get('fullName'),
          phone: formData.get('phone') || undefined,
          currentCountry: formData.get('currentCountry'),
          nationality: formData.get('nationality'),
          currentTitle: formData.get('currentTitle'),
          experienceYears: Number(formData.get('experienceYears') || 0),
          targetRegion: formData.get('targetRegion') || 'Europe',
          targetCountries: countries,
          targetRoles: roles,
          excludedRoles: [],
          workModes: ['remote', 'hybrid'],
          sponsorshipRequired: formData.get('sponsorshipRequired') === 'on',
          relocationRequired: formData.get('relocationRequired') === 'on',
          minimumFitScore: 4,
          portalPreferences: ['greenhouse', 'ashby', 'lever'],
          packageCode: formData.get('packageCode'),
          currency: formData.get('currency') || 'INR',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      setMessage(response.ok ? 'Career profile saved. Payment activation is handled in Phase 2.' : payload.error?.message ?? 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-vvisa-border-subtle bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <CardHeader className="border-b border-vvisa-border-subtle bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_100%)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary">Candidate intake</Badge>
            <CardTitle className="text-2xl">Career onboarding</CardTitle>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-vvisa-text-secondary">
              Complete the core information the V-VISAS team needs before payment activation and service setup.
            </p>
          </div>
          <div className="rounded-xl border border-vvisa-border-subtle bg-white px-4 py-3 text-sm text-vvisa-text-secondary shadow-[var(--vvisa-shadow-sm)]">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <LockKeyhole className="size-4 text-primary" />
              Private service record
            </div>
            <p className="mt-1 text-xs text-vvisa-text-muted">No public resume link is created here.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 md:p-6">
        {!enabled && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Careers onboarding or package configuration is feature-flagged off. Set CAREERS_SAAS_ENABLED, CAREERS_ONBOARDING_ENABLED, and CAREERS_PACKAGES_ENABLED to enable writes.
          </div>
        )}
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-5 rounded-2xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-4 md:grid-cols-2 md:p-5">
            <SectionLabel icon={UserRound} title="Candidate details" />
            <Field label="Full name" htmlFor="fullName">
              <Input id="fullName" name="fullName" required disabled={!enabled} placeholder="Your full legal name" />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" disabled={!enabled} placeholder="+91 ..." />
            </Field>
            <Field label="Current country" htmlFor="currentCountry">
              <Input id="currentCountry" name="currentCountry" defaultValue="India" required disabled={!enabled} />
            </Field>
            <Field label="Nationality" htmlFor="nationality">
              <Input id="nationality" name="nationality" defaultValue="India" required disabled={!enabled} />
            </Field>
          </div>

          <div className="grid gap-5 rounded-2xl border border-vvisa-border-subtle bg-white p-4 md:grid-cols-2 md:p-5">
            <SectionLabel icon={BriefcaseBusiness} title="Professional target" />
            <Field label="Current title" htmlFor="currentTitle">
              <Input id="currentTitle" name="currentTitle" placeholder="Software Engineer" required disabled={!enabled} />
            </Field>
            <Field label="Experience years" htmlFor="experienceYears">
              <Input id="experienceYears" name="experienceYears" type="number" min={0} max={60} required disabled={!enabled} />
            </Field>
            <Field label="Target region" htmlFor="targetRegion">
              <Input id="targetRegion" name="targetRegion" defaultValue="Europe" required disabled={!enabled} />
            </Field>
            <Field label="Target countries" htmlFor="targetCountries">
              <Input id="targetCountries" name="targetCountries" placeholder="Germany, Netherlands" disabled={!enabled} />
            </Field>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="targetRoles" className="flex items-center gap-2">
                <MapPinned className="size-4 text-primary" />
                Target roles
              </Label>
              <Textarea id="targetRoles" name="targetRoles" placeholder="Software Engineer, Backend Engineer" required disabled={!enabled} className="min-h-28" />
            </div>
          </div>

          <div className="grid gap-5 rounded-2xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-4 md:grid-cols-[1fr_1fr] md:p-5">
            <SectionLabel icon={Globe2} title="Service preferences" />
            <Field label="Package" htmlFor="packageCode">
              <select id="packageCode" name="packageCode" className="h-11 w-full rounded-lg border border-vvisa-border-subtle bg-background px-3 text-sm shadow-[var(--vvisa-shadow-sm)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60" disabled={!enabled}>
                {packageOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} - {formatMoney(item.amountMinor, item.currency)}
                  </option>
                ))}
              </select>
              <input type="hidden" name="currency" value={packageOptions[0]?.currency ?? 'INR'} />
            </Field>
            <div className="grid gap-3 pt-1 md:pt-7">
              <label className="flex items-center gap-3 rounded-xl border border-vvisa-border-subtle bg-white p-3 text-sm font-medium">
                <input name="sponsorshipRequired" type="checkbox" disabled={!enabled} className="size-4" />
                Sponsorship required
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-vvisa-border-subtle bg-white p-3 text-sm font-medium">
                <input name="relocationRequired" type="checkbox" disabled={!enabled} className="size-4" />
                Relocation support
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-vvisa-border-subtle bg-slate-950 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 text-cyan-300" />
              <div>
                <p className="font-semibold">Ready for internal review</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">Save your profile first. Resume upload and checkout remain controlled by feature flags and your candidate session.</p>
              </div>
            </div>
            <Button type="submit" disabled={!enabled || saving} className="bg-white text-slate-950 hover:bg-slate-100">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="size-4" /> Save career profile</>}
            </Button>
          </div>
          {message && <p className="rounded-xl border border-vvisa-border-subtle bg-white p-4 text-sm text-vvisa-text-secondary">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function SectionLabel({ icon: Icon, title }: { icon: typeof BriefcaseBusiness; title: string }) {
  return (
    <div className="md:col-span-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
    </div>
  );
}

function formatMoney(amountMinor: number, currency: string) {
  if (amountMinor <= 0) return currency;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
