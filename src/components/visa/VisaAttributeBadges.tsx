'use client';

import { CalendarDays, Clock, Files, Plane, ShieldCheck } from 'lucide-react';
import type { VisaKind, VisaType } from '@/types';
import { cn } from '@/lib/utils';

type BadgeTone = 'entry' | 'validity' | 'stay' | 'format' | 'processing' | 'express';

type VisaAttributeBadge = {
  key: string;
  label: string;
  tone: BadgeTone;
  icon: React.ElementType;
};

const toneClasses: Record<BadgeTone, string> = {
  entry: 'border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-200',
  validity: 'border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  stay: 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  format: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  processing: 'border-slate-400/25 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  express: 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_/-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeEntry(visa: VisaType): string | null {
  if (visa.entryType && visa.entryType !== 'NOT_SPECIFIED') return `${titleCase(visa.entryType)} Entry`;
  if (!visa.entry) return null;
  const entry = visa.entry.trim();
  if (!entry) return null;
  return /entry/i.test(entry) ? titleCase(entry) : `${titleCase(entry)} Entry`;
}

function normalizeVisaFormat(visaKind?: VisaKind): string | null {
  switch (visaKind) {
    case 'E_VISA':
      return 'E-Visa';
    case 'ETA':
      return 'ETA';
    case 'VISA_ON_ARRIVAL':
      return 'Visa on Arrival';
    case 'STICKER_VISA':
      return 'Sticker Visa';
    case 'OTHER':
    default:
      return null;
  }
}

function compactDuration(label: string, prefix: string): string | null {
  const trimmed = label.trim();
  if (!trimmed || /manual review/i.test(trimmed)) return null;
  const match = trimmed.match(/(\d+)\s*(day|days|month|months|year|years)/i);
  if (match) {
    const unit = match[2].toLowerCase();
    const normalizedUnit = match[1] === '1' ? unit.replace(/s$/, '') : unit.endsWith('s') ? unit : `${unit}s`;
    return `${prefix} ${match[1]} ${titleCase(normalizedUnit)}`;
  }
  return `${prefix} ${trimmed}`;
}

function normalizeProcessing(processingTime: string): VisaAttributeBadge | null {
  const value = processingTime.trim();
  if (!value || /manual review/i.test(value)) return null;
  if (/hour|express|urgent|same/i.test(value)) {
    return {
      key: 'express',
      label: /express|urgent/i.test(value) ? 'Express Available' : 'Fast Processing',
      tone: 'express',
      icon: Clock,
    };
  }
  const rangeMatch = value.match(/(\d+)\s*[-–]\s*(\d+)\s*(working\s*)?days?/i);
  if (rangeMatch) {
    return { key: 'processing', label: `Processing ${rangeMatch[1]}-${rangeMatch[2]} Days`, tone: 'processing', icon: Clock };
  }
  const singleMatch = value.match(/(\d+)\s*(working\s*)?days?/i);
  if (!singleMatch) return null;
  return { key: 'processing', label: `Processing ${singleMatch[1]} Days`, tone: 'processing', icon: Clock };
}

export function getVisaAttributeBadges(visa: VisaType): VisaAttributeBadge[] {
  const entryLabel = normalizeEntry(visa);
  const validityLabel = compactDuration(visa.validity, 'Valid');
  const stayLabel = compactDuration(visa.duration, 'Stay');
  const formatLabel = normalizeVisaFormat(visa.visaKind);

  const badges: (VisaAttributeBadge | null)[] = [
    entryLabel ? { key: 'entry', label: entryLabel, tone: 'entry', icon: Plane } : null,
    validityLabel ? { key: 'validity', label: validityLabel, tone: 'validity', icon: CalendarDays } : null,
    stayLabel ? { key: 'stay', label: stayLabel, tone: 'stay', icon: Clock } : null,
    formatLabel ? { key: 'format', label: formatLabel, tone: 'format', icon: ShieldCheck } : null,
    normalizeProcessing(visa.processingTime),
  ];

  return badges.filter(Boolean) as VisaAttributeBadge[];
}

export function VisaAttributeBadges({
  visa,
  className,
  includeProcessing = true,
}: {
  visa: VisaType;
  className?: string;
  includeProcessing?: boolean;
}) {
  const badges = getVisaAttributeBadges(visa).filter((badge) => includeProcessing || badge.key !== 'processing');

  if (!badges.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {badges.map((badge) => {
        const Icon = badge.icon || Files;
        return (
          <span
            key={badge.key}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold leading-none',
              toneClasses[badge.tone]
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
