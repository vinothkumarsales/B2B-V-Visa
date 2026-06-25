'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockApplications, statusConfig } from '@/lib/mock-data';
import type { VisaApplication } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ArrowRight, Download, Eye, Check, Plane, Calendar, FileText } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const listVariants = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
} as const;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + new Date(dateStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

type TabFilter = 'ALL' | 'APPROVED' | 'PAYMENT_PENDING' | 'SUBMITTED' | 'DRAFT';

function StatusBadge({ status }: { status: string }) {
  const sc = statusConfig[status];
  if (!sc) return <span className="text-xs text-vvisa-text-muted">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${sc.bg} ${sc.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} animate-pulse`} />
      {sc.label}
    </span>
  );
}

const approvedSteps = [
  { label: 'Errors Fixed' },
  { label: 'Application Complete' },
  { label: 'Application Paid' },
  { label: 'Submitted to Immigration' },
  { label: 'Visa Approved' },
];

export default function ApplicationsView() {
  const router = useRouter();
  const { navigate, setSelectedApplicationId } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [destination, setDestination] = useState('all');
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');

  const allDestinations = useMemo(
    () => [...new Set(mockApplications.map((a) => a.destination))],
    []
  );

  const sortedApplications = useMemo(() => {
    return [...mockApplications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);

  const filteredApps = useMemo(() => {
    return sortedApplications.filter((app) => {
      if (activeTab !== 'ALL' && app.status !== activeTab) return false;
      if (destination !== 'all' && app.destination !== destination) return false;
      if (travelDate && app.travelDate !== travelDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = app.travelers.some(
          (t) => t.firstName.toLowerCase().includes(q) || t.lastName.toLowerCase().includes(q)
        );
        const passportMatch = app.travelers.some((t) => t.passportNumber.toLowerCase().includes(q));
        const groupMatch = app.groupName?.toLowerCase().includes(q);
        if (!nameMatch && !passportMatch && !groupMatch) return false;
      }
      return true;
    });
  }, [sortedApplications, searchQuery, travelDate, destination, activeTab]);

  const tabCounts = useMemo(() => ({
    ALL: mockApplications.length,
    APPROVED: mockApplications.filter((a) => a.status === 'APPROVED').length,
    PAYMENT_PENDING: mockApplications.filter((a) => a.status === 'PAYMENT_PENDING').length,
    SUBMITTED: mockApplications.filter((a) => a.status === 'SUBMITTED').length,
    DRAFT: mockApplications.filter((a) => a.status === 'DRAFT').length,
  }), []);

  const isGroup = (app: VisaApplication) => app.groupId != null && app.travelers.length > 1;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' as const }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Applications</h1>
        <p className="text-sm text-vvisa-text-muted mt-1">Track and manage visa applications</p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or passport..."
            className="bg-vvisa-surface border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-10"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vvisa-text-muted" />
          <Input
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className="bg-vvisa-surface border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-9 pr-3 h-10 w-48"
          />
        </div>
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger className="bg-vvisa-surface border border-vvisa-border rounded-lg text-foreground h-10 w-44">
            <SelectValue placeholder="Destination" />
          </SelectTrigger>
          <SelectContent className="bg-vvisa-surface border border-vvisa-border">
            <SelectItem value="all">All Destinations</SelectItem>
            {allDestinations.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
        <TabsList className="bg-vvisa-surface border border-vvisa-border rounded-lg p-1 h-auto">
          <TabsTrigger
            value="ALL"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-3 py-2 text-xs sm:text-sm flex items-center gap-1.5"
          >
            All <Badge variant="secondary" className="bg-vvisa-border text-vvisa-text-secondary text-xs border-0">{tabCounts.ALL}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="APPROVED"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-3 py-2 text-xs sm:text-sm flex items-center gap-1.5"
          >
            Approved <Badge variant="secondary" className="bg-emerald-950/30 text-emerald-400 text-xs border-0">{tabCounts.APPROVED}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="PAYMENT_PENDING"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-3 py-2 text-xs sm:text-sm flex items-center gap-1.5"
          >
            Pending Payment <Badge variant="secondary" className="bg-amber-950/30 text-amber-400 text-xs border-0">{tabCounts.PAYMENT_PENDING}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="SUBMITTED"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-3 py-2 text-xs sm:text-sm flex items-center gap-1.5"
          >
            Submitted <Badge variant="secondary" className="bg-blue-950/30 text-blue-400 text-xs border-0">{tabCounts.SUBMITTED}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="DRAFT"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-3 py-2 text-xs sm:text-sm flex items-center gap-1.5"
          >
            Draft <Badge variant="secondary" className="bg-vvisa-surface-2 text-vvisa-text-muted text-xs border-0">{tabCounts.DRAFT}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Application Cards */}
      <motion.div
        className="space-y-3"
        variants={listVariants}
        initial="initial"
        animate="animate"
      >
        {filteredApps.map((app) => {
          if (isGroup(app)) {
            return (
              <motion.div key={app.id} variants={cardVariants}>
                <GroupCard
                  app={app}
                  onViewGroup={() => {
                    setSelectedApplicationId(app.id);
                    navigate('application-detail');
                    router.push('/application-detail');
                  }}
                />
              </motion.div>
            );
          } else if (app.status === 'APPROVED') {
            return (
              <motion.div key={app.id} variants={cardVariants}>
                <IndividualApprovedCard app={app} />
              </motion.div>
            );
          } else {
            return (
              <motion.div key={app.id} variants={cardVariants}>
                <IndividualDefaultCard
                  app={app}
                  onView={() => {
                    setSelectedApplicationId(app.id);
                    navigate('application-detail');
                    router.push('/application-detail');
                  }}
                />
              </motion.div>
            );
          }
        })}

        {filteredApps.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-vvisa-border mx-auto mb-3" />
            <p className="text-vvisa-text-muted text-sm">No applications found</p>
            <p className="text-vvisa-text-muted text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Group Application Card ─── */
function GroupCard({ app, onViewGroup }: { app: VisaApplication; onViewGroup: () => void }) {
  const approvedCount = app.travelers.filter((t) => t.status === 'APPROVED').length;
  const totalTravelers = app.travelers.length;
  const allApproved = approvedCount === totalTravelers;

  return (
    <Card
      className="bg-vvisa-surface border border-vvisa-border rounded-xl hover:bg-vvisa-surface-2 transition-colors cursor-pointer"
      onClick={onViewGroup}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Header: Group Name + Internal ID + Date */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {app.groupName || app.internalId || 'Unnamed Group'}
              {app.internalId && <span className="text-vvisa-text-muted font-normal"> - {app.internalId}</span>}
              {' - '}{formatDate(app.travelDate || app.createdAt)}
            </h3>
            <p className="text-xs text-vvisa-text-muted mt-0.5">
              Created: {formatDateTime(app.createdAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-primary hover:text-primary/80 hover:bg-primary/10 text-sm p-0 h-auto shrink-0"
          >
            View Group <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        {/* Destination + Applicant counts */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-3">
          <div>
            <p className="text-foreground font-medium flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5 text-vvisa-text-muted" />
              {app.destination}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-vvisa-text-muted">
              Applicants: <span className="text-foreground font-medium">{totalTravelers}</span>
            </span>
            {allApproved ? (
              <span className="text-emerald-400 font-medium">
                Approved: {approvedCount} <Check className="h-3.5 w-3.5 inline" />
              </span>
            ) : (
              <span className="text-amber-400 font-medium">
                Approved: {approvedCount}/{totalTravelers}
              </span>
            )}
          </div>
        </div>

        {/* Visa Type */}
        <p className="text-xs text-vvisa-text-secondary mb-2">{app.visaType}</p>

        {/* Travel Dates */}
        {app.travelDate && app.returnDate && (
          <p className="text-xs text-vvisa-text-muted flex items-center gap-1.5 mb-4">
            <Calendar className="h-3 w-3" />
            Travel: {formatDate(app.travelDate)} → {formatDate(app.returnDate)}
          </p>
        )}

        {/* Bottom: Client ID + View Group */}
        <div className="flex items-center justify-between pt-3 border-t border-vvisa-border">
          <span className="text-[10px] text-vvisa-text-muted">{app.status}</span>
          <Button
            variant="ghost"
            className="text-primary hover:text-primary/80 hover:bg-primary/10 text-xs p-0 h-auto"
          >
            View Group <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Individual Approved Card ─── */
function IndividualApprovedCard({ app }: { app: VisaApplication }) {
  const traveler = app.travelers[0];
  if (!traveler) return null;

  return (
    <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl border-t-2 border-t-emerald-500">
      <CardContent className="p-4 sm:p-5">
        {/* Approved Badge */}
        <Badge className="bg-emerald-600 text-foreground text-xs font-medium border-0 px-2.5 py-0.5 mb-4 inline-flex">
          ✅ VISA APPROVED
        </Badge>

        {/* Name + Submitted + Passport */}
        <div className="mb-4">
          <p className="text-base font-semibold text-foreground">{traveler.firstName} {traveler.lastName}</p>
          <p className="text-xs text-vvisa-text-muted mt-0.5">Submitted: {formatDateTime(app.createdAt)}</p>
          <p className="text-xs text-vvisa-text-muted mt-0.5">Passport: {traveler.passportNumber}</p>
        </div>

        {/* Destination + Visa Type + Travel Dates + Reference */}
        <div className="p-3 rounded-lg bg-vvisa-bg border border-vvisa-border mb-4">
          <p className="text-sm text-foreground">
            {app.destination} — <span className="text-vvisa-text-secondary">{app.visaType}</span>
          </p>
          <p className="text-xs text-vvisa-text-muted mt-1 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Travel: {app.travelDate ? formatDate(app.travelDate) : '—'} → {app.returnDate ? formatDate(app.returnDate) : '—'}
          </p>
          {traveler.referenceNo && (
            <p className="text-xs text-vvisa-text-muted mt-1">Reference No: {traveler.referenceNo}</p>
          )}
        </div>

        {/* Two-Column: Application Details | Visa Approved Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Left: Application Details steps */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-vvisa-text-muted font-semibold mb-2">Application Details:</p>
            <div className="space-y-1.5">
              {approvedSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-vvisa-text-secondary">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visa Approved Card details */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-vvisa-text-muted font-semibold mb-2">Visa Approved Card:</p>
            <div className="space-y-1.5">
              {traveler.estimatedArrival && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-vvisa-text-secondary">Estimated on {formatDate(traveler.estimatedArrival)}</span>
                </div>
              )}
              {traveler.deliveredAt && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-vvisa-text-secondary">Delivered on {formatDate(traveler.deliveredAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 text-primary" />
                </div>
                <span className="text-xs text-primary font-medium">before time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs h-8">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Generate Invoice
          </Button>
          <Button variant="outline" className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs h-8">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View
          </Button>
          <Button variant="outline" className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download Visa ↓
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Individual Pending / Submitted / Draft Card ─── */
function IndividualDefaultCard({ app, onView }: { app: VisaApplication; onView: () => void }) {
  const traveler = app.travelers[0];
  if (!traveler) return null;

  return (
    <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl hover:bg-vvisa-surface-2 transition-colors">
      <CardContent className="p-4 sm:p-5">
        {/* Name + Submitted + Passport */}
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">{traveler.firstName} {traveler.lastName}</p>
          <p className="text-xs text-vvisa-text-muted mt-0.5">Submitted: {formatDateTime(app.createdAt)}</p>
          <p className="text-xs text-vvisa-text-muted mt-0.5">Passport: {traveler.passportNumber}</p>
        </div>

        {/* Destination + Visa Type + Travel Dates + Reference */}
        <div className="p-3 rounded-lg bg-vvisa-bg border border-vvisa-border mb-3">
          <p className="text-sm text-foreground">
            {app.destination} — <span className="text-vvisa-text-secondary">{app.visaType}</span>
          </p>
          <p className="text-xs text-vvisa-text-muted mt-1 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Travel: {app.travelDate ? formatDate(app.travelDate) : '—'} → {app.returnDate ? formatDate(app.returnDate) : '—'}
          </p>
          {traveler.referenceNo && (
            <p className="text-xs text-vvisa-text-muted mt-1">Reference No: {traveler.referenceNo}</p>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <span className="text-xs text-vvisa-text-muted">Status: </span>
          <StatusBadge status={app.status} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs h-8"
            onClick={onView}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View Application
          </Button>
          <Button variant="outline" className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs h-8">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Generate Invoice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
