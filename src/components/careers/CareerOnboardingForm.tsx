'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card className="rounded-lg border-vvisa-border-subtle">
      <CardHeader>
        <CardTitle>Career onboarding</CardTitle>
      </CardHeader>
      <CardContent>
        {!enabled && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Careers onboarding or package configuration is feature-flagged off. Set CAREERS_SAAS_ENABLED, CAREERS_ONBOARDING_ENABLED, and CAREERS_PACKAGES_ENABLED to enable writes.
          </div>
        )}
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentCountry">Current country</Label>
            <Input id="currentCountry" name="currentCountry" defaultValue="India" required disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" defaultValue="India" required disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentTitle">Current title</Label>
            <Input id="currentTitle" name="currentTitle" placeholder="Software Engineer" required disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experienceYears">Experience years</Label>
            <Input id="experienceYears" name="experienceYears" type="number" min={0} max={60} required disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetRegion">Target region</Label>
            <Input id="targetRegion" name="targetRegion" defaultValue="Europe" required disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetCountries">Target countries</Label>
            <Input id="targetCountries" name="targetCountries" placeholder="Germany, Netherlands" disabled={!enabled} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="targetRoles">Target roles</Label>
            <Textarea id="targetRoles" name="targetRoles" placeholder="Software Engineer, Backend Engineer" required disabled={!enabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packageCode">Package</Label>
            <select id="packageCode" name="packageCode" className="h-10 w-full rounded-md border border-vvisa-border-subtle bg-background px-3 text-sm" disabled={!enabled}>
              {packageOptions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name} - {formatMoney(item.amountMinor, item.currency)}
                </option>
              ))}
            </select>
            <input type="hidden" name="currency" value={packageOptions[0]?.currency ?? 'INR'} />
          </div>
          <div className="flex items-center gap-4 pt-7 text-sm">
            <label className="flex items-center gap-2"><input name="sponsorshipRequired" type="checkbox" disabled={!enabled} /> Sponsorship required</label>
            <label className="flex items-center gap-2"><input name="relocationRequired" type="checkbox" disabled={!enabled} /> Relocation support</label>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={!enabled || saving}>{saving ? 'Saving...' : 'Save career profile'}</Button>
            {message && <p className="mt-3 text-sm text-vvisa-text-secondary">{message}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
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
