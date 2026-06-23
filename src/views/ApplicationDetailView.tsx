'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockApplications, statusConfig } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, MoreVertical, Check, Plane, Calendar, Baby, Loader2, Lock } from 'lucide-react';

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

const statusSteps = [
  { label: 'Errors Fixed' },
  { label: 'Application Complete' },
  { label: 'Application Paid' },
  { label: 'Submitted' },
  { label: 'Visa Approved' },
];

export default function ApplicationDetailView() {
  const { navigate, selectedApplicationId } = useAppStore();

  const app = useMemo(
    () => mockApplications.find((a) => a.id === selectedApplicationId),
    [selectedApplicationId]
  );

  if (!app) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="text-center py-16"
      >
        <p className="text-[#6B7280] text-sm">Application not found</p>
        <Button
          variant="ghost"
          onClick={() => navigate('applications')}
          className="mt-4 text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Applications
        </Button>
      </motion.div>
    );
  }

  const approvedCount = app.travelers.filter((t) => t.status === 'APPROVED').length;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Back Link */}
      <button
        onClick={() => navigate('applications')}
        className="text-sm text-[#9CA3AF] hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">{app.groupName || 'Application'}</h1>
            <span className="text-[9px] text-[#3D3D54] font-mono ml-2">enKOdaUD6df8RHXgzoP723VOvHA2</span>
            {app.internalId && (
              <Badge variant="secondary" className="bg-[#1A1A24] text-[#9CA3AF] text-xs border-0 font-mono">
                {app.internalId}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-[#1A1A24] text-[#9CA3AF] text-xs border-0">
              <Lock className="h-3 w-3 mr-1" />
              Group Locked
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6B7280]">
            <span>Created On: {formatDateTime(app.createdAt)}</span>
            <span>·</span>
            <span>{app.travelers.length} Applicants</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <Card className="bg-[#111118] border border-[#2A2A38] rounded-xl">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            Checking for visas...
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-lg text-xs h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Group Invoice
            </Button>
            <Button variant="ghost" className="text-[#6B7280] hover:text-white h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Traveler Cards */}
      <div className="space-y-3">
        {app.travelers.map((traveler) => {
          const isApproved = traveler.status === 'APPROVED';
          return (
            <Card
              key={traveler.id}
              className={`bg-[#111118] border rounded-xl ${isApproved ? 'border-t-2 border-t-emerald-500' : 'border-[#2A2A38]'}`}
            >
              <CardContent className="p-4 sm:p-5">
                {/* Traveler Header */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {isApproved && (
                    <Badge className="bg-emerald-600 text-white text-xs font-medium border-0 px-2.5 py-0.5">
                      ✅ VISA APPROVED
                    </Badge>
                  )}
                  {traveler.isChild && (
                    <Badge variant="secondary" className="bg-amber-950/30 text-amber-400 text-xs border-0">
                      <Baby className="h-3 w-3 mr-1" />
                      Child
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {traveler.firstName} {traveler.lastName}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">Passport: {traveler.passportNumber}</p>
                  </div>
                  <div className="text-right sm:text-right">
                    <p className="text-xs text-[#6B7280]">
                      {app.destination} — {app.visaType}
                    </p>
                    {traveler.referenceNo && (
                      <p className="text-xs text-[#6B7280] mt-0.5 font-mono">Ref: {traveler.referenceNo}</p>
                    )}
                  </div>
                </div>

                {app.travelDate && app.returnDate && (
                  <p className="text-xs text-[#6B7280] flex items-center gap-1.5 mb-3">
                    <Calendar className="h-3 w-3" />
                    Travel: {formatDate(app.travelDate)} → {formatDate(app.returnDate)}
                  </p>
                )}

                {/* Status Timeline */}
                {isApproved && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mb-4">
                    {statusSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-[#9CA3AF]">{step.label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-indigo-400" />
                      </div>
                      <span className="text-xs text-indigo-400 font-medium">Delivered before time</span>
                    </div>
                  </div>
                )}

                {/* Action */}
                {isApproved && (
                  <Button
                    variant="outline"
                    className="border-[#2A2A38] text-[#9CA3AF] hover:bg-[#1A1A24] hover:text-white rounded-lg text-xs h-8"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download Visa
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}