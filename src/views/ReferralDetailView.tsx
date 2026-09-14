'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageSquare,
  PhoneCall,
  ShieldCheck,
  User,
  ExternalLink,
} from 'lucide-react';

interface ReferralDetailProps {
  referralId: string;
}

const statusBadgeStyles: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  CONTACTED: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  QUALIFIED: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  ONBOARDED: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  CLOSED: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

function formatCurrency(amountMinor: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function maskContact(contact: string): string {
  if (!contact) return '';
  if (contact.includes('@')) {
    const [name, domain] = contact.split('@');
    if (!name || !domain) return contact;
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name}***`;
    return `${maskedName}@${domain}`;
  }
  const clean = contact.replace(/\D/g, '');
  if (clean.length >= 8) {
    return `${clean.slice(0, 3)}•••••${clean.slice(-3)}`;
  }
  return contact;
}

export default function ReferralDetailView({ referralId }: ReferralDetailProps) {
  const router = useRouter();
  const [referral, setReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/referrals/${referralId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Referral not found');
        return res.json();
      })
      .then((data) => {
        if (active) {
          setReferral(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [referralId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-2 text-xs text-vvisa-text-muted">Loading referral details...</p>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-bold text-foreground">Referral not found</h2>
        <p className="mt-1 text-xs text-vvisa-text-muted">The referral you requested does not exist or has been archived.</p>
        <Button onClick={() => router.push('/referrals')} className="mt-4" size="sm">
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Referrals
        </Button>
      </div>
    );
  }

  const stages = [
    { key: 'NEW', label: 'Received' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'ONBOARDED', label: 'Onboarded' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-xs text-vvisa-text-muted hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Referrals
        </Button>
        <Badge
          variant="outline"
          className={`text-xs font-semibold ${
            statusBadgeStyles[referral.status] || statusBadgeStyles.NEW
          }`}
        >
          {referral.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-vvisa-border-subtle pb-4">
        <div>
          <span className="font-mono text-xs font-bold text-primary">{referral.referralCode}</span>
          <h1 className="text-2xl font-bold text-foreground mt-1">{referral.clientName}</h1>
          <p className="text-xs text-vvisa-text-muted mt-0.5">
            Submitted on {new Date(referral.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-vvisa-text-muted">Expected Reward</p>
          <p className="text-2xl font-bold text-emerald-500">
            {formatCurrency(referral.rewardAmountMinor)}
          </p>
          <Badge variant="outline" className="text-[10px] mt-0.5">
            {referral.rewardStatus}
          </Badge>
        </div>
      </div>

      {/* Milestone Progress Bar */}
      <Card className="border-vvisa-border-subtle bg-vvisa-surface">
        <CardHeader className="p-4 border-b border-vvisa-border-subtle">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-vvisa-text-muted">
            Milestone Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="relative flex items-center justify-between">
            {stages.map((stg, idx) => {
              const statusIndex = stages.findIndex((s) => s.key === referral.status);
              const isPassed = statusIndex >= idx;
              const isCurrent = referral.status === stg.key;

              return (
                <div key={stg.key} className="flex flex-col items-center z-10">
                  <div
                    className={`size-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isPassed
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-vvisa-surface-2 border border-vvisa-border-subtle text-vvisa-text-muted'
                    } ${isCurrent ? 'ring-2 ring-primary/40 ring-offset-2' : ''}`}
                  >
                    {idx + 1}
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-foreground text-center">
                    {stg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-vvisa-border-subtle bg-vvisa-surface">
          <CardHeader className="p-4 border-b border-vvisa-border-subtle">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-vvisa-text-muted">
              Client & Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Product:</span>
              <span className="font-semibold text-foreground">{referral.product?.name || 'Visa Service'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Category:</span>
              <span className="text-foreground">{referral.product?.category || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Destination:</span>
              <span className="text-foreground">{referral.clientCountry || referral.product?.destination || 'Global'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Mobile:</span>
              <span className="font-mono text-foreground">{maskContact(referral.clientMobile)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Email:</span>
              <span className="font-mono text-foreground">{maskContact(referral.clientEmail)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Applicants:</span>
              <span className="text-foreground">{referral.numberOfApplicants || 1}</span>
            </div>
            {referral.travelDate && (
              <div className="flex justify-between">
                <span className="text-vvisa-text-muted">Target Travel Date:</span>
                <span className="text-foreground">{new Date(referral.travelDate).toLocaleDateString('en-IN')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-vvisa-border-subtle bg-vvisa-surface">
          <CardHeader className="p-4 border-b border-vvisa-border-subtle">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-vvisa-text-muted">
              Processing & Ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Assigned Advisor:</span>
              <span className="font-medium text-foreground">{referral.assignedAdvisor || 'Admissions Desk'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Current Next Action:</span>
              <span className="font-medium text-primary">{referral.nextAction || 'Under Review'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Reward Condition:</span>
              <span className="text-foreground">Full Service Payment</span>
            </div>
            <div className="flex justify-between">
              <span className="text-vvisa-text-muted">Duplicate Verification:</span>
              <span className="text-emerald-500 font-medium">Verified Partner Lead</span>
            </div>
            {referral.notes && (
              <div className="pt-2 border-t border-vvisa-border-subtle">
                <p className="text-vvisa-text-muted">Partner Notes:</p>
                <p className="mt-1 text-foreground bg-vvisa-surface-2 p-2 rounded">{referral.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="border-vvisa-border-subtle bg-vvisa-surface">
        <CardHeader className="p-4 border-b border-vvisa-border-subtle">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-vvisa-text-muted">
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {referral.events?.length ? (
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-vvisa-border-subtle">
              {referral.events.map((ev: any) => (
                <div key={ev.id} className="relative pl-8 text-xs">
                  <div className="absolute left-2 top-1.5 size-2.5 rounded-full bg-primary -translate-x-1/2" />
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-foreground text-sm">{ev.event}</p>
                    <span className="text-[11px] text-vvisa-text-muted">
                      {new Date(ev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-primary font-medium mt-0.5">{ev.actor}</p>
                  {ev.partnerVisibleNote && (
                    <p className="mt-1.5 text-vvisa-text-muted bg-vvisa-surface-2/60 p-2.5 rounded-lg border border-vvisa-border-subtle">
                      {ev.partnerVisibleNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-vvisa-text-muted text-center py-6">No activity recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
