'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockApplications, statusConfig } from '@/lib/mock-data';
import { evaluatePassportValidity, isMinorOnDate } from '@/lib/date/calculate-age';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, MoreVertical, Check, Plane, Calendar, Baby, Loader2, Lock, AlertTriangle } from 'lucide-react';

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
        <p className="text-vvisa-text-muted text-sm">Application not found</p>
        <Button
          variant="ghost"
          onClick={() => navigate('applications')}
          className="mt-4 text-primary"
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
        className="text-sm text-vvisa-text-secondary hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{app.groupName || 'Application'}</h1>
            {app.internalId && (
              <Badge variant="secondary" className="bg-vvisa-surface-2 text-vvisa-text-secondary text-xs border-0 font-mono">
                {app.internalId}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-vvisa-surface-2 text-vvisa-text-secondary text-xs border-0">
              <Lock className="h-3 w-3 mr-1" />
              Group Locked
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-vvisa-text-muted">
            <span>Created On: {formatDateTime(app.createdAt)}</span>
            <span>·</span>
            <span>{app.travelers.length} Applicants</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-vvisa-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Checking for visas...
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Group Invoice
            </Button>
            <Button variant="ghost" className="text-vvisa-text-muted hover:text-foreground h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Traveler Cards */}
      <div className="space-y-3">
        {app.travelers.map((traveler) => {
          const isApproved = traveler.status === 'APPROVED';
          const isMinor = isMinorOnDate(traveler.dateOfBirth, app.travelDate || app.createdAt);
          const passportValidity = evaluatePassportValidity({
            passportExpiryDate: traveler.dateOfExpiry,
            travelDate: app.travelDate,
            rule: 'UNKNOWN',
          });
          return (
            <Card
              key={traveler.id}
              className={`bg-vvisa-surface border rounded-xl ${isApproved ? 'border-t-2 border-t-emerald-500' : 'border-vvisa-border'}`}
            >
              <CardContent className="p-4 sm:p-5">
                {/* Traveler Header */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {isApproved && (
                    <Badge className="bg-emerald-600 text-foreground text-xs font-medium border-0 px-2.5 py-0.5">
                      ✅ VISA APPROVED
                    </Badge>
                  )}
                  {(traveler.isChild || isMinor) && (
                    <Badge variant="secondary" className="bg-amber-950/30 text-amber-400 text-xs border-0">
                      <Baby className="h-3 w-3 mr-1" />
                      Child
                    </Badge>
                  )}
                  {passportValidity.message && (
                    <Badge variant="secondary" className="bg-amber-950/30 text-amber-300 text-xs border-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Passport validity check
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {traveler.firstName} {traveler.lastName}
                    </p>
                    <p className="text-xs text-vvisa-text-muted mt-0.5">Passport: {traveler.passportNumber}</p>
                  </div>
                  <div className="text-right sm:text-right">
                    <p className="text-xs text-vvisa-text-muted">
                      {app.destination} — {app.visaType}
                    </p>
                    {traveler.referenceNo && (
                      <p className="text-xs text-vvisa-text-muted mt-0.5 font-mono">Ref: {traveler.referenceNo}</p>
                    )}
                  </div>
                </div>

                {app.travelDate && app.returnDate && (
                  <p className="text-xs text-vvisa-text-muted flex items-center gap-1.5 mb-3">
                    <Calendar className="h-3 w-3" />
                    Travel: {formatDate(app.travelDate)} → {formatDate(app.returnDate)}
                  </p>
                )}

                {passportValidity.message && (
                  <p className="text-xs text-amber-200 flex items-start gap-1.5 mb-3">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                    {passportValidity.message}
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
                        <span className="text-xs text-vvisa-text-secondary">{step.label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-primary" />
                      </div>
                      <span className="text-xs text-primary font-medium">Delivered before time</span>
                    </div>
                  </div>
                )}

                {/* Action */}
                {isApproved && (
                  <Button
                    variant="outline"
                    className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs h-8"
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
