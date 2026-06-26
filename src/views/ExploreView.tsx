'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockVisaTypes } from '@/lib/mock-data';
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
import { Search, ArrowRight, MapPin, Plane, Calendar, Zap, Clock, FileText } from 'lucide-react';
import type { VisaStickerRoute } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const PAGE_SIZE = 12;

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  LIGHTNING_FAST: {
    icon: <Zap className="h-4 w-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-800/50',
  },
  STANDARD: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-vvisa-text-secondary',
    bgColor: 'bg-vvisa-surface-2',
    borderColor: 'border-vvisa-border',
  },
  MULTI_ENTRY: {
    icon: <Plane className="h-4 w-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/30',
    borderColor: 'border-emerald-800/50',
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

export default function ExploreView() {
  const router = useRouter();
  const { navigate, setSelectedVisaType } = useAppStore();
  const [goingTo, setGoingTo] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [processingFilter, setProcessingFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showDropdown, setShowDropdown] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [selectedDocVisa, setSelectedDocVisa] = useState<VisaType | null>(null);

  const countries = useMemo(
    () => [...new Set(mockVisaTypes.map((visa) => visa.destination))].sort(),
    []
  );

  const filteredDestinations = countries.filter((d) =>
    d.toLowerCase().includes(goingTo.toLowerCase())
  );

  const filteredVisas = useMemo(() => {
    const query = goingTo.trim().toLowerCase();

    return mockVisaTypes.filter((visa) => {
      const matchesQuery =
        !query ||
        visa.destination.toLowerCase().includes(query) ||
        visa.name.toLowerCase().includes(query);
      const matchesCountry = countryFilter === 'all' || visa.destination === countryFilter;
      const matchesCategory = categoryFilter === 'all' || visa.category === categoryFilter;
      const processingDays = parseInt(visa.processingTime) || 0;
      const matchesProcessing =
        processingFilter === 'all' ||
        (processingFilter === 'same-day' && visa.processingTime.toLowerCase().includes('hour')) ||
        (processingFilter === 'fast' && !visa.processingTime.toLowerCase().includes('hour') && processingDays <= 5) ||
        (processingFilter === 'standard' && processingDays > 5);

      return matchesQuery && matchesCountry && matchesCategory && matchesProcessing;
    });
  }, [categoryFilter, countryFilter, goingTo, processingFilter]);

  const visibleVisas = filteredVisas.slice(0, visibleCount);
  const hasActiveFilters =
    goingTo.trim() || countryFilter !== 'all' || categoryFilter !== 'all' || processingFilter !== 'all';

  const handleSearch = () => {
    setVisibleCount(PAGE_SIZE);
    if (!goingTo.trim()) return;
  };

  const handleSelectDestination = (dest: string) => {
    setGoingTo(dest);
    setCountryFilter(dest);
    setVisibleCount(PAGE_SIZE);
    setShowDropdown(false);
  };

  const clearFilters = () => {
    setGoingTo('');
    setCountryFilter('all');
    setCategoryFilter('all');
    setProcessingFilter('all');
    setVisibleCount(PAGE_SIZE);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSelectVisa = (visa: VisaType) => {
    setSelectedVisaType(visa);
    sessionStorage.setItem('vvisa:selectedVisaType', JSON.stringify(visa));
    navigate('apply');
    router.push('/apply');
  };

  const handleViewDocs = (visa: VisaType) => {
    setSelectedDocVisa(visa);
    setDocDialogOpen(true);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-30 bg-vvisa-bg pt-2 pb-4">
        <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-end">
              <div className="flex-1 w-full lg:w-auto">
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">From</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🇮🇳</span>
                  <Input
                    value="India"
                    disabled
                    className="bg-vvisa-bg border border-vvisa-border rounded-lg text-foreground pl-9 pr-3 h-10 opacity-60 cursor-not-allowed"
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
                    placeholder="Search destination..."
                    className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-10"
                  />
                  <AnimatePresence>
                    {showDropdown && goingTo.length > 0 && filteredDestinations.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-vvisa-surface-2 border border-vvisa-border rounded-lg z-50 max-h-48 overflow-y-auto"
                      >
                        {filteredDestinations.map((dest) => (
                          <button
                            key={dest}
                            onClick={() => handleSelectDestination(dest)}
                            className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-vvisa-surface-2 flex items-center gap-2 transition-colors"
                          >
                            <Plane className="h-3.5 w-3.5 text-vvisa-text-muted" />
                            {dest}
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
                    className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-10"
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
                    className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-10"
                  />
                </div>
              </div>
              <Button
                onClick={handleSearch}
                className="bg-primary hover:bg-primary/90 text-white h-10 px-5 rounded-lg flex items-center gap-2 shrink-0 w-full lg:w-auto"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Country</label>
                <select
                  value={countryFilter}
                  onChange={(event) => {
                    setCountryFilter(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="w-full h-10 rounded-lg bg-vvisa-bg border border-vvisa-border px-3 text-sm text-foreground"
                >
                  <option value="all">All countries</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Visa category</label>
                <select
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="w-full h-10 rounded-lg bg-vvisa-bg border border-vvisa-border px-3 text-sm text-foreground"
                >
                  <option value="all">All categories</option>
                  <option value="LIGHTNING_FAST">Lightning fast</option>
                  <option value="STANDARD">Standard</option>
                  <option value="MULTI_ENTRY">Multiple entry</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Processing type</label>
                <select
                  value={processingFilter}
                  onChange={(event) => {
                    setProcessingFilter(event.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="w-full h-10 rounded-lg bg-vvisa-bg border border-vvisa-border px-3 text-sm text-foreground"
                >
                  <option value="all">All processing</option>
                  <option value="same-day">Same-day / hours</option>
                  <option value="fast">Fast, 5 days or less</option>
                  <option value="standard">Standard, over 5 days</option>
                </select>
              </div>
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
              <Card className={`bg-vvisa-surface border rounded-xl overflow-hidden ${cat.borderColor}`}>
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
                  <h3 className="text-base font-semibold text-foreground mb-4">{visa.name}</h3>

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
                    <div className="mb-4 rounded-lg border border-amber-800/30 bg-amber-950/20 p-3">
                      <p className="text-xs font-medium text-amber-200">Passport origin city required</p>
                      <p className="mt-1 text-xs text-amber-200/80">
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
                  <div className="flex items-center justify-between pt-3 border-t border-vvisa-border">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-bold font-mono text-foreground">
                        {formatMoneyMinor(pricingResult.visibleTotalMinor, pricingResult.currency)}
                      </span>
                      <PriceBreakdownPopover amount={visa.price} currency={visa.currency} pricingResult={pricingResult} />
                    </div>
                    <Button
                      onClick={() => handleSelectVisa(visa)}
                      variant="outline"
                      className="border-indigo-600 text-primary hover:bg-primary/10 hover:text-primary/80 rounded-lg flex items-center gap-1.5"
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
          <div className="text-center py-16 rounded-xl border border-dashed border-vvisa-border bg-vvisa-surface">
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
        <DialogContent className="bg-vvisa-surface border border-vvisa-border rounded-xl max-w-md">
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
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-vvisa-bg border border-vvisa-border"
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
