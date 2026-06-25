'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buildVisaPriceBreakdown, formatMoneyMinor, getNonZeroPriceRows, rupeesToMinor } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface PriceBreakdownPopoverProps {
  amount: number;
  currency?: string;
  quantity?: number;
  className?: string;
}

export function PriceBreakdownPopover({
  amount,
  currency = 'INR',
  quantity = 1,
  className,
}: PriceBreakdownPopoverProps) {
  const [open, setOpen] = useState(false);
  const totalMinor = rupeesToMinor(amount);
  const breakdown = buildVisaPriceBreakdown(totalMinor, currency, undefined, quantity);
  const rows = getNonZeroPriceRows(breakdown);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View GST price breakdown"
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-vvisa-text-muted transition-colors hover:bg-vvisa-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            className
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={() => setOpen((current) => !current)}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 rounded-xl border-vvisa-border bg-vvisa-surface p-4 text-foreground shadow-xl"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Price Details</p>
            {quantity > 1 && (
              <p className="mt-0.5 text-xs text-vvisa-text-muted">{quantity} travellers included</p>
            )}
          </div>
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className={cn(
                  'flex items-center justify-between gap-4 text-xs',
                  row.emphasis ? 'border-t border-vvisa-border pt-2 font-semibold text-foreground' : 'text-vvisa-text-secondary'
                )}
              >
                <span>{row.label}</span>
                <span className="font-mono">{formatMoneyMinor(row.amountMinor, currency)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-4 text-vvisa-text-muted">
            * Add-on prices are not included, such as optional courier, insurance, premium handling, or other selected services.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
