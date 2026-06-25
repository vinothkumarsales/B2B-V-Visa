'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockVisaTypes, popularDestinations, statusConfig } from '@/lib/mock-data';
import type { VisaType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ArrowRight, MapPin, Plane, Calendar, Zap, Clock, FileText, X } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

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

export default function ExploreView() {
  const router = useRouter();
  const { navigate, setSelectedVisaType } = useAppStore();
  const [goingTo, setGoingTo] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [selectedDocVisa, setSelectedDocVisa] = useState<VisaType | null>(null);

  const filteredDestinations = popularDestinations.filter((d) =>
    d.toLowerCase().includes(goingTo.toLowerCase())
  );

  const filteredVisas = goingTo.trim()
    ? mockVisaTypes.filter((v) => v.destination.toLowerCase() === goingTo.trim().toLowerCase())
    : mockVisaTypes;

  const handleSearch = () => {
    if (!goingTo.trim()) return;
  };

  const handleSelectDestination = (dest: string) => {
    setGoingTo(dest);
    setShowDropdown(false);
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
          </CardContent>
        </Card>
      </div>

      {/* Results Heading */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {goingTo.trim() ? `${goingTo.trim()} Visa Types` : 'All Visa Types'}
          </h1>
          <span className="text-xs text-vvisa-text-muted font-mono">enKOdaUD6df8RHXgzoP723VOvHA2</span>
        </div>
        <p className="text-sm text-vvisa-text-muted mt-1">
          {filteredVisas.length} visa option{filteredVisas.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Visa Result Cards */}
      <div className="space-y-4">
        {filteredVisas.map((visa) => {
          const cat = categoryConfig[visa.category] || categoryConfig.STANDARD;
          const estArrival = getEstimatedArrival(visa.processingTime);

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

                  {/* Footer: Price + Select */}
                  <div className="flex items-center justify-between pt-3 border-t border-vvisa-border">
                    <span className="text-xl font-bold font-mono text-foreground">
                      {formatINR(visa.price)}
                    </span>
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
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-vvisa-border mx-auto mb-3" />
            <p className="text-vvisa-text-muted text-sm">No visa types found for &quot;{goingTo}&quot;</p>
            <p className="text-vvisa-text-muted text-xs mt-1">Try a different destination</p>
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
              <ul className="space-y-2">
                {selectedDocVisa.documents.map((doc, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-vvisa-bg border border-vvisa-border"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
