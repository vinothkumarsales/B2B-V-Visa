'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { useVisaCatalogue } from '@/lib/use-visa-catalogue';
import { demoModeCopy } from '@/lib/demo-data';
import { isDemoMode } from '@/lib/app-mode';
import { resolveVisaChecklist } from '@/lib/checklist';
import { formatMoneyMinor, resolveVisaPricing } from '@/lib/pricing';
import type { VisaType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PriceBreakdownPopover } from '@/components/pricing/PriceBreakdownPopover';
import { VisaAttributeBadges } from '@/components/visa/VisaAttributeBadges';
import { Search, ArrowRight, MapPin, Plane, Calendar, Zap, Clock, FileText, ChevronDown } from 'lucide-react';
import type { VisaStickerRoute } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const PAGE_SIZE = 12;
const purposeOptions = ['Tourist', 'Business', 'Transit'] as const;

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  LIGHTNING_FAST: {
    icon: <Zap className="h-4 w-4" />,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  STANDARD: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-vvisa-text-secondary',
    bgColor: 'bg-vvisa-surface-2',
    borderColor: 'border-vvisa-border',
  },
  MULTI_ENTRY: {
    icon: <Plane className="h-4 w-4" />,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
};

function getEstimatedArrival(processingTime: string): string {
  const days = processingTime.includes('Hours')
    ? 1
    : parseInt(processingTime) || 5;
  const date = new Date();
  date.setDate(date.getDate() + days + 2);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStickerRoutes(visa: VisaType): VisaStickerRoute[] {
  return visa.stickerRoutes?.length ? visa.stickerRoutes : visa.courierRules?.routes ?? [];
}

function getSearchSessionId() {
  const key = 'vvisa:crmSearchSessionId';
  const searchSessionId = sessionStorage.getItem(key) ?? crypto.randomUUID();
  sessionStorage.setItem(key, searchSessionId);
  return searchSessionId;
}

function trackVisaInterest(visa: VisaType, intent: 'VISA_SELECTED' | 'CHECKLIST_VIEWED') {
  if (isDemoMode()) return;
  void fetch('/api/visa-interests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      countryCode: visa.destinationCode,
      countryName: visa.destination,
      visaTypeId: visa.id,
      visaTypeName: visa.name,
      category: visa.category,
      sourceRoute: '/explore',
      searchSessionId: getSearchSessionId(),
      intent,
    }),
  }).catch(() => undefined);
}

function trackProductIntent(input: {
  eventType: 'COUNTRY_CARD_CLICKED' | 'VISA_PRODUCT_CLICKED' | 'PRODUCT_ENGAGED_3_MIN';
  country: string;
  visa?: VisaType;
}) {
  if (isDemoMode()) return;
  const eventDay = new Date().toISOString().slice(0, 10);
  const searchSessionId =
    input.eventType === 'PRODUCT_ENGAGED_3_MIN' && input.visa
      ? `engaged:${input.visa.id}:${eventDay}`
      : getSearchSessionId();
  void fetch('/api/events/product-intent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      eventType: input.eventType,
      country: input.country,
      countryCode: input.visa?.destinationCode,
      productId: input.visa?.id,
      productName: input.visa?.name,
      category: input.visa?.category,
      sourcePage: '/explore',
      searchSessionId,
    }),
  }).catch(() => undefined);
}

export default function ExploreView() {
  const router = useRouter();
  const { navigate, setSelectedVisaType } = useAppStore();
  const { visaTypes } = useVisaCatalogue();
  const [goingTo, setGoingTo] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<(typeof purposeOptions)[number]>('Tourist');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showDropdown, setShowDropdown] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [selectedDocVisa, setSelectedDocVisa] = useState<VisaType | null>(null);

  const countries = useMemo(
    () => [...new Set(visaTypes.map((visa) => visa.destination))].sort(),
    [visaTypes]
  );

  const filteredDestinations = countries.filter((d) =>
    d.toLowerCase().includes(goingTo.toLowerCase())
  );

  const filteredVisas = useMemo(() => {
    const query = goingTo.trim().toLowerCase();

    return visaTypes.filter((visa) => {
      const matchesQuery =
        !query ||
        visa.destination.toLowerCase().includes(query) ||
        visa.name.toLowerCase().includes(query);
      const purposeText = `${visa.purpose ?? ''} ${visa.name}`.toLowerCase();
      const matchesPurpose =
        purposeText.includes(purposeFilter.toLowerCase()) ||
        (purposeFilter === 'Tourist' && !purposeText.includes('business') && !purposeText.includes('transit'));

      return matchesQuery && matchesPurpose;
    });
  }, [goingTo, purposeFilter]);

  const visibleVisas = filteredVisas.slice(0, visibleCount);
  const hasActiveFilters = Boolean(goingTo.trim()) || purposeFilter !== 'Tourist';

  useEffect(() => {
    const hasDestinationContext = Boolean(goingTo.trim());
    sessionStorage.setItem('vvisa:workflowDetailActive', hasDestinationContext ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('vvisa:workflow-detail-change', { detail: hasDestinationContext }));
  }, [goingTo]);

  const handleSearch = () => {
    setVisibleCount(PAGE_SIZE);
    if (!goingTo.trim()) return;
  };

  const handleSelectDestination = (dest: string) => {
    setGoingTo(dest);
    setVisibleCount(PAGE_SIZE);
    setShowDropdown(false);
    trackProductIntent({ eventType: 'COUNTRY_CARD_CLICKED', country: dest });
  };

  const clearFilters = () => {
    setGoingTo('');
    setPurposeFilter('Tourist');
    setVisibleCount(PAGE_SIZE);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSelectVisa = (visa: VisaType) => {
    trackProductIntent({ eventType: 'VISA_PRODUCT_CLICKED', country: visa.destination, visa });
    trackVisaInterest(visa, 'VISA_SELECTED');
    setSelectedVisaType(visa);
    sessionStorage.setItem('vvisa:selectedVisaType', JSON.stringify(visa));
    navigate('apply');
    router.push('/apply');
  };

  const handleViewDocs = (visa: VisaType) => {
    trackVisaInterest(visa, 'CHECKLIST_VIEWED');
    setSelectedDocVisa(visa);
    setDocDialogOpen(true);
  };

  useEffect(() => {
    if (!selectedDocVisa || isDemoMode()) return;
    const timer = window.setTimeout(() => {
      trackProductIntent({
        eventType: 'PRODUCT_ENGAGED_3_MIN',
        country: selectedDocVisa.destination,
        visa: selectedDocVisa,
      });
    }, 180000);
    return () => window.clearTimeout(timer);
  }, [selectedDocVisa]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-7"
    >
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-30 -mx-4 bg-[var(--vvisa-backdrop)] px-4 pt-2 pb-4 backdrop-blur-xl sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
        <Card className="vv-surface-elevated rounded-xl border">
          <CardContent className="p-4">
            <div className="mb-4">
              <label className="block text-xs text-vvisa-text-secondary mb-2 font-semibold">Select Travel Purpose</label>
              <div className="grid max-w-[520px] grid-cols-3 rounded-full border border-vvisa-border-subtle bg-white p-1 shadow-[var(--vvisa-shadow-sm)] dark:bg-vvisa-surface-2">
                {purposeOptions.map((purpose) => {
                  const selected = purposeFilter === purpose;
                  return (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => {
                        setPurposeFilter(purpose);
                        setVisibleCount(PAGE_SIZE);
                      }}
                      className={`h-10 rounded-full text-sm font-semibold transition-all duration-200 ${
                        selected
                          ? 'bg-neutral-950 text-white shadow-[var(--vvisa-shadow-sm)] dark:bg-white dark:text-neutral-950'
                          : 'text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground'
                      }`}
                    >
                      {purpose}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-3 items-end">
              <div className="flex-1 w-full lg:w-auto">
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">From</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🇮🇳</span>
                  <Input
                    value="India"
                    disabled
                    className="pl-9 pr-3 opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex-1 w-full lg:w-auto relative">
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Going to</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
                  <Input
                    value={goingTo}
                    onChange={(e) => {
                      setGoingTo(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or select destination"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDropdown((value) => !value)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-vvisa-text-muted transition-colors hover:bg-vvisa-surface-2 hover:text-foreground"
                    aria-label="Open country list"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <AnimatePresence>
                    {showDropdown && filteredDestinations.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-vvisa-border-subtle bg-white p-1.5 shadow-[var(--vvisa-shadow-lg)] dark:bg-vvisa-surface"
                      >
                        {filteredDestinations.map((dest) => (
                          <button
                            key={dest}
                            onClick={() => handleSelectDestination(dest)}
                            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-vvisa-surface-2"
                          >
                            <span className="flex items-center gap-2">
                              <Plane className="h-3.5 w-3.5 text-primary" />
                              {dest}
                            </span>
                            <span className="text-xs text-vvisa-text-muted">
                              {visaTypes.filter((visa) => visa.destination === dest).length} options
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex-1 w-full lg:w-auto">
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Travel Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
                  <Input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="pl-9 pr-3"
                  />
                </div>
              </div>
              <div className="flex-1 w-full lg:w-auto">
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Return Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="pl-9 pr-3"
                  />
                </div>
              </div>
              <Button
                onClick={handleSearch}
                className="flex h-10 w-full shrink-0 items-center gap-2 px-5 lg:w-auto"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Heading */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Explore Visas</h1>
            <p className="text-sm text-vvisa-text-muted mt-1">
              Showing {visibleVisas.length} of {filteredVisas.length} demo visa option{filteredVisas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode() && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
                {demoModeCopy.badge}
              </Badge>
            )}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-vvisa-text-muted mt-2">
          {demoModeCopy.priceLabel}. Verified B2B pricing will require approved-agent access in production.
        </p>
      </div>

      {/* Visa Result Cards */}
      <div className="space-y-4">
        {visibleVisas.map((visa) => {
          const cat = categoryConfig[visa.category] || categoryConfig.STANDARD;
          const estArrival = getEstimatedArrival(visa.processingTime);
          const stickerRoutes = getStickerRoutes(visa);
          const isStickerVisa = visa.visaKind === 'STICKER_VISA';
          const pricingResult = resolveVisaPricing(visa);

          return (
            <motion.div
              key={visa.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`vv-interactive overflow-hidden rounded-xl border ${cat.borderColor}`}>
                {/* Category Header */}
                <div className={`${cat.bgColor} px-5 py-3.5 border-b ${cat.borderColor}`}>
                  <div className="flex items-center gap-2">
                    <span className={cat.color}>{cat.icon}</span>
                    <span className={`text-sm font-semibold ${cat.color}`}>
                      {visa.category === 'LIGHTNING_FAST'
                        ? `Lightning Fast (${visa.processingTime} - Apply Before ${visa.cutoffTime})`
                        : visa.category === 'MULTI_ENTRY'
                        ? 'Multiple Entry'
                        : 'Standard Processing'}
                    </span>
                  </div>
                  {visa.category === 'LIGHTNING_FAST' && (
                    <p className="text-xs text-vvisa-text-secondary mt-1 ml-6">
                      Estimated visa arrival by{' '}
                      <span className="text-primary font-medium">{estArrival}</span>
                    </p>
                  )}
                </div>

                {/* Card Body */}
                <CardContent className="p-5">
                  {/* Visa Name */}
                  <div className="mb-4 space-y-3">
                    <h3 className="text-base font-semibold text-foreground">{visa.name}</h3>
                    <VisaAttributeBadges visa={visa} />
                  </div>

                  {/* Detail Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-3 gap-x-4 mb-4">
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Entry</p>
                      <p className="text-sm text-foreground font-medium">{visa.entry}</p>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Validity</p>
                      <p className="text-sm text-foreground font-medium">{visa.validity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Duration</p>
                      <p className="text-sm text-foreground font-medium">{visa.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Documents</p>
                      <button
                        onClick={() => handleViewDocs(visa)}
                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                      >
                        View Here <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Processing Time</p>
                      <p className="text-sm text-foreground font-medium">{visa.processingTime}</p>
                    </div>
                  </div>

                  {isStickerVisa && (
                    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">Passport origin city required</p>
                      <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-200/80">
                        {stickerRoutes.length > 0
                          ? `Available route${stickerRoutes.length !== 1 ? 's' : ''}: ${stickerRoutes
                              .map((route) => route.originCityLabel ?? route.origin)
                              .filter(Boolean)
                              .join(', ')}`
                          : 'No courier route is mapped yet. This visa will need manual quotation before confirmation.'}
                      </p>
                    </div>
                  )}

                  {/* Footer: Price + Select */}
                  <div className="flex items-center justify-between border-t border-vvisa-border-subtle pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="vv-tabular text-xl font-bold text-foreground">
                        {formatMoneyMinor(pricingResult.visibleTotalMinor, pricingResult.currency)}
                      </span>
                      <PriceBreakdownPopover amount={visa.price} currency={visa.currency} pricingResult={pricingResult} />
                    </div>
                    <Button
                      onClick={() => handleSelectVisa(visa)}
                      variant="outline"
                      className="flex items-center gap-1.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      Select <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {filteredVisas.length === 0 && (
          <div className="rounded-xl border border-dashed border-vvisa-border bg-vvisa-surface py-16 text-center shadow-[var(--vvisa-shadow-sm)]">
            <Search className="h-12 w-12 text-vvisa-border mx-auto mb-3" />
            <p className="text-foreground text-sm font-medium">No visa types found</p>
            <p className="text-vvisa-text-muted text-xs mt-1">Try another destination, category, or processing filter.</p>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="mt-4 border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg"
            >
              Clear filters
            </Button>
          </div>
        )}

        {visibleCount < filteredVisas.length && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg"
            >
              Show more visas
            </Button>
          </div>
        )}
      </div>

      {/* Document Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="max-w-md rounded-xl border border-vvisa-border-subtle bg-vvisa-surface shadow-[var(--vvisa-shadow-lg)]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Required Documents
            </DialogTitle>
          </DialogHeader>
          {selectedDocVisa && (
            <div className="space-y-2 mt-2">
              <p className="text-sm text-vvisa-text-secondary mb-3">
                Documents required for {selectedDocVisa.name}:
              </p>
              {(() => {
                const checklist = resolveVisaChecklist(selectedDocVisa);
                return (
                  <div className="space-y-4">
                    {checklist.sections.map((section) => (
                    <div key={section.type}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-vvisa-text-muted">{section.label}</p>
                      <ul className="space-y-2">
                        {section.items.map((doc) => (
                          <li
                            key={doc.id}
                            className="flex items-center gap-3 rounded-lg border border-vvisa-border-subtle bg-vvisa-surface-2 p-2.5"
                          >
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm text-foreground">{doc.documentName || doc.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
