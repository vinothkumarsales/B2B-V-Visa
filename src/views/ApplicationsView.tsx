'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockApplications, statusConfig } from '@/lib/mock-data';
import type { ApplicationStatus } from '@/types';
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + new Date(dateStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

type TabFilter = 'ALL' | 'APPROVED' | 'PAYMENT_PENDING';

const statusSteps = [
  { label: 'Errors Fixed', key: 'VALIDATED' },
  { label: 'Application Complete', key: 'PAID' },
  { label: 'Application Paid', key: 'PAID' },
  { label: 'Submitted', key: 'SUBMITTED' },
  { label: 'Visa Approved', key: 'APPROVED' },
];

export default function ApplicationsView() {
  const { navigate, setSelectedApplicationId } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [destination, setDestination] = useState('all');
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');

  const allDestinations = useMemo(
    () => [...new Set(mockApplications.map((a) => a.destination))],
    []
  );

  const filteredApps = useMemo(() => {
    return mockApplications.filter((app) => {
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
  }, [searchQuery, travelDate, destination, activeTab]);

  const tabCounts = useMemo(() => ({
    ALL: mockApplications.length,
    APPROVED: mockApplications.filter((a) => a.status === 'APPROVED').length,
    PAYMENT_PENDING: mockApplications.filter((a) => a.status === 'PAYMENT_PENDING').length,
  }), []);

  const isGroup = (app: typeof mockApplications[0]) => app.groupId != null && app.travelers.length > 1;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Applications</h1>
        <p className="text-sm text-[#6B7280] mt-1">Track and manage visa applications</p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or passport..."
            className="bg-[#111118] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pl-9 pr-3 h-10"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className="bg-[#111118] border border-[#2A2A38] focus:border-indigo-500 rounded-lg text-white pl-9 pr-3 h-10 w-48"
          />
        </div>
        <Select value={destination} onValueChange={setDestination}>
          <SelectTrigger className="bg-[#111118] border border-[#2A2A38] rounded-lg text-white h-10 w-44">
            <SelectValue placeholder="Destination" />
          </SelectTrigger>
          <SelectContent className="bg-[#111118] border border-[#2A2A38]">
            <SelectItem value="all">All Destinations</SelectItem>
            {allDestinations.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
        <TabsList className="bg-[#111118] border border-[#2A2A38] rounded-lg p-1 h-auto">
          <TabsTrigger
            value="ALL"
            className="data-[state=active]:bg-[#1A1A24] data-[state=active]:text-white text-[#6B7280] rounded-md px-4 py-2 text-sm flex items-center gap-2"
          >
            All <Badge variant="secondary" className="bg-[#2A2A38] text-[#9CA3AF] text-xs border-0">{tabCounts.ALL}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="APPROVED"
            className="data-[state=active]:bg-[#1A1A24] data-[state=active]:text-white text-[#6B7280] rounded-md px-4 py-2 text-sm flex items-center gap-2"
          >
            Approved <Badge variant="secondary" className="bg-emerald-950/30 text-emerald-400 text-xs border-0">{tabCounts.APPROVED}</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="PAYMENT_PENDING"
            className="data-[state=active]:bg-[#1A1A24] data-[state=active]:text-white text-[#6B7280] rounded-md px-4 py-2 text-sm flex items-center gap-2"
          >
            Pending Payment <Badge variant="secondary" className="bg-amber-950/30 text-amber-400 text-xs border-0">{tabCounts.PAYMENT_PENDING}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Application Cards */}
      <div className="space-y-3">
        {filteredApps.map((app) => {
          if (isGroup(app)) {
            return (
              <GroupCard
                key={app.id}
                app={app}
                onViewGroup={() => {
                  setSelectedApplicationId(app.id);
                  navigate('application-detail');
                }}
              />
            );
          } else if (app.status === 'APPROVED') {
            return (
              <IndividualApprovedCard key={app.id} app={app} />
            );
          } else {
            return (
              <GroupCard
                key={app.id}
                app={app}
                onViewGroup={() => {
                  setSelectedApplicationId(app.id);
                  navigate('application-detail');
                }}
              />
            );
          }
        })}

        {filteredApps.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-[#2A2A38] mx-auto mb-3" />
            <p className="text-[#6B7280] text-sm">No applications found</p>
            <p className="text-[#6B7280] text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* Group Card Component */
function GroupCard({ app, onViewGroup }: { app: typeof mockApplications[0]; onViewGroup: () => void }) {
  const sc = statusConfig[app.status];
  const approvedCount = app.travelers.filter((t) => t.status === 'APPROVED').length;

  return (
    <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl hover:bg-[#1A1A24] transition-colors cursor-pointer" onClick={onViewGroup}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {app.groupName || app.internalId || 'Unnamed Group'}
              {app.internalId && <span className="text-[#6B7280] font-normal"> - {app.internalId}</span>}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Created: {formatDateTime(app.createdAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 text-sm p-0 h-auto"
          >
            View Group <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-[#6B7280]">Destination</p>
            <p className="text-white font-medium flex items-center gap-1.5 mt-0.5">
              <Plane className="h-3.5 w-3.5 text-[#6B7280]" />
              {app.destination}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280]">Visa Type</p>
            <p className="text-white font-medium mt-0.5">{app.visaType}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280]">Applicants</p>
            <p className="text-white font-medium mt-0.5">{app.travelers.length}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280]">Approved</p>
            <p className="text-emerald-400 font-medium mt-0.5">{approvedCount}</p>
          </div>
        </div>

        {app.travelDate && app.returnDate && (
          <div className="mt-3 pt-3 border-t border-[#2A2A38]">
            <p className="text-xs text-[#6B7280] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Travel: {formatDate(app.travelDate)} → {formatDate(app.returnDate)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Individual Approved Card */
function IndividualApprovedCard({ app }: { app: typeof mockApplications[0] }) {
  const traveler = app.travelers[0];
  if (!traveler) return null;

  return (
    <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl border-t-2 border-t-emerald-500">
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Badge className="bg-emerald-600 text-white text-xs font-medium border-0 px-2.5 py-0.5">
            ✅ VISA APPROVED
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <div>
            <p className="text-base font-semibold text-white">{traveler.firstName} {traveler.lastName}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Submitted: {formatDate(app.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280]">Passport</p>
            <p className="text-sm text-white font-mono">{traveler.passportNumber}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#0A0A0F] border border-[#2A2A38] mb-4">
          <p className="text-sm text-white">
            {app.destination} — <span className="text-[#9CA3AF]">{app.visaType}</span>
          </p>
          <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Travel: {app.travelDate ? formatDate(app.travelDate) : '—'} → {app.returnDate ? formatDate(app.returnDate) : '—'}
          </p>
          {traveler.referenceNo && (
            <p className="text-xs text-[#6B7280] mt-1">Reference: {traveler.referenceNo}</p>
          )}
        </div>

        {/* Status Timeline */}
        <div className="space-y-2 mb-5">
          {statusSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-xs text-[#9CA3AF]">{step.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 text-indigo-400" />
            </div>
            <span className="text-xs text-indigo-400 font-medium">Delivered before time</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-lg text-xs h-8">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Generate Invoice
          </Button>
          <Button variant="outline" className="border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-lg text-xs h-8">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View
          </Button>
          <Button variant="outline" className="border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-lg text-xs h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download Visa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}