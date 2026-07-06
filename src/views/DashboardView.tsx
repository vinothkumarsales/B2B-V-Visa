'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockVisaTypes, popularDestinations, statusConfig } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Wallet, CheckCircle, Briefcase, ArrowRight, X, Sparkles, MapPin, Plane, Calendar } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardView() {
  const router = useRouter();
  const { navigate, stats, applications, agency } = useAppStore();
  const [goingTo, setGoingTo] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAlliance, setShowAlliance] = useState(true);

  const filteredDestinations = popularDestinations.filter((d) =>
    d.toLowerCase().includes(goingTo.toLowerCase())
  );

  const recentApps = applications.slice(0, 3);

  const handleSearch = () => {
    if (!goingTo.trim()) return;
    const dest = goingTo.trim();
    const matchingVisas = mockVisaTypes.filter(
      (v) => v.destination.toLowerCase() === dest.toLowerCase()
    );
    if (matchingVisas.length > 0) {
      navigate('explore');
      router.push('/explore');
    }
  };

  const handleSelectDestination = (dest: string) => {
    setGoingTo(dest);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Search Bar */}
      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl overflow-visible">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-3 items-end">
            {/* From */}
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">From</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🇮🇳</span>
                <Input
                  value="India"
                  disabled
                  className="bg-vvisa-bg border border-vvisa-border rounded-lg text-foreground pl-9 pr-3 h-11 opacity-60 cursor-not-allowed"
                />
              </div>
            </div>
            {/* Going To */}
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
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-11"
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
            {/* Travel Date */}
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Travel Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
                <Input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-11"
                />
              </div>
            </div>
            {/* Return Date */}
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-xs text-vvisa-text-secondary mb-1.5 font-medium">Return Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-11"
                />
              </div>
            </div>
            {/* Search Button */}
            <Button
              onClick={handleSearch}
              className="bg-primary hover:bg-primary/90 text-white h-11 px-6 rounded-lg flex items-center gap-2 shrink-0 w-full lg:w-auto"
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-5 border-b border-vvisa-border">
            <button className="pb-2.5 text-sm font-medium text-primary border-b-2 border-primary">
              Visas
            </button>
            <button className="pb-2.5 text-sm font-medium text-vvisa-text-muted cursor-not-allowed" disabled>
              Insurance
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Search + Alliance Row */}
      <div className="flex gap-6 items-start">
        {/* Left: Quick Stats + Recent Apps */}
        <div className="flex-1 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-vvisa-surface-2">
                  <Briefcase className="h-5 w-5 text-vvisa-text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-vvisa-text-muted">Total Applications</p>
                  <p className="text-xl font-bold text-foreground">{stats.totalApplications}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-950/30">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-vvisa-text-muted">Approved This Month</p>
                  <p className="text-xl font-bold text-emerald-400">{stats.approvedThisMonth}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-vvisa-text-muted">Wallet Balance</p>
                  <p className="text-xl font-bold text-primary font-mono">{formatINR(stats.walletBalance)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Applications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Applications</h2>
              {agency?.id && <span className="text-xs text-vvisa-border-active font-mono">{agency.id}</span>}
              <button
                onClick={() => {
                  navigate('applications');
                  router.push('/applications');
                }}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                View All Applications <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {recentApps.map((app) => {
                const sc = statusConfig[app.status];
                return (
                  <Card
                    key={app.id}
                    className="bg-vvisa-surface border border-vvisa-border rounded-xl cursor-pointer hover:bg-vvisa-surface-2 transition-colors"
                    onClick={() => {
                      useAppStore.getState().setSelectedApplicationId(app.id);
                      navigate('application-detail');
                      router.push('/application-detail');
                    }}
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-vvisa-surface-2 shrink-0">
                          <Plane className="h-4 w-4 text-vvisa-text-secondary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {app.groupName || app.travelers[0]?.firstName + ' ' + app.travelers[0]?.lastName}
                          </p>
                          <p className="text-xs text-vvisa-text-muted truncate">
                            {app.destination} · {app.visaType} · {app.travelers.length} traveler{app.travelers.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:shrink-0">
                        <span className="text-xs text-vvisa-text-muted">{formatDate(app.createdAt)}</span>
                        <Badge
                          variant="secondary"
                          className={`${sc?.bg || ''} ${sc?.text || ''} text-xs font-medium border-0`}
                        >
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc?.dot || ''} mr-1.5`} />
                          {sc?.label || app.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Alliance Program Card */}
        <AnimatePresence>
          {showAlliance && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="hidden lg:block w-80 shrink-0"
            >
              <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl relative overflow-hidden">
                <button
                  onClick={() => setShowAlliance(false)}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-vvisa-surface-2 transition-colors z-10"
                >
                  <X className="h-4 w-4 text-vvisa-text-muted" />
                </button>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">VVisa Alliance Program</h3>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-2">Introducing the VVisa Alliance Program</p>
                  <ul className="space-y-1.5 mb-4">
                    <li className="text-xs text-vvisa-text-secondary flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      Earn commissions on every referral
                    </li>
                    <li className="text-xs text-vvisa-text-secondary flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      Track links in real-time
                    </li>
                    <li className="text-xs text-vvisa-text-secondary flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      Dedicated support
                    </li>
                  </ul>
                  <Button
                    onClick={() => {
                      navigate('alliance');
                      router.push('/alliance');
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg text-sm h-9"
                  >
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
