'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockVisaTypes } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import {
  Upload, AlertTriangle, Plus, ArrowRight, Check, Circle, Scan,
  Loader2, X, FileCheck, ChevronDown, ChevronUp, Image as ImageIcon,
  Trash2, FileText, Copy, CheckCircle2, Receipt,
} from 'lucide-react';
import type { Traveler } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const CLIENT_ID = 'enKOdaUD6df8RHXgzoP723VOvHA2';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

interface TravelerData {
  id: string;
  passportNumber: string;
  firstName: string;
  lastName: string;
  nationality: string;
  sex: string;
  dateOfBirth: string;
  placeOfBirth: string;
  placeOfIssue: string;
  maritalStatus: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  passportFileName: string;
  ocrStatus: 'idle' | 'scanning' | 'done' | 'error';
  ocrError: string;
  additionalDocs: { [key: string]: string | null };
  expanded: boolean;
}

// Normalize document names — strip parenthetical annotations (e.g. "Bank Statement (min ₹3L)" → "Bank Statement")
function normalizeDocName(name: string): string {
  const cleaned = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  // Also normalize common variations
  const map: Record<string, string> = {
    'Hotel Booking Confirmation': 'Hotel Booking',
    'Medical Insurance': 'Health Insurance',
  };
  return map[cleaned] || cleaned;
}

// Map document names from visa types to upload zone metadata
const docNameToMeta: Record<string, { key: string; helper: string }> = {
  'Travel Itinerary': { key: 'travelItinerary', helper: 'Flight tickets or travel plan' },
  'Bank Statement': { key: 'bankStatement', helper: 'Last 6 months bank statement' },
  'Hotel Booking': { key: 'hotelBooking', helper: 'Confirmed hotel reservation' },
  'Hotel Booking Confirmation': { key: 'hotelBooking', helper: 'Confirmed hotel reservation' },
  'National ID': { key: 'nationalId', helper: 'Aadhar card or voter ID' },
  'ITR': { key: 'itr', helper: 'Income Tax Return for last 2 years' },
  'Salary Slips': { key: 'salarySlips', helper: 'Last 3 months salary slips' },
  'Covering Letter': { key: 'coveringLetter', helper: 'From employer on company letterhead' },
  'Form 54': { key: 'form54', helper: 'Family composition form (if applicable)' },
  'Employment Letter': { key: 'employmentLetter', helper: 'Employment verification letter from company' },
  'Business Invitation Letter': { key: 'businessInvitation', helper: 'Invitation letter from business partner' },
  'Company Registration': { key: 'companyRegistration', helper: 'Company registration / incorporation certificate' },
  'Onward Flight Ticket': { key: 'onwardFlight', helper: 'Onward/return flight ticket' },
  'Return Flight Ticket': { key: 'returnFlight', helper: 'Confirmed return flight ticket' },
  'Offer Letter': { key: 'offerLetter', helper: 'Job offer letter from employer' },
  'GTE Statement': { key: 'gteStatement', helper: 'Genuine Temporary Entrant statement' },
  'Financial Documents': { key: 'financialDocs', helper: 'Proof of financial capacity' },
  'Health Insurance': { key: 'healthInsurance', helper: 'Travel health insurance policy' },
  'Medical Insurance': { key: 'healthInsurance', helper: 'Medical / travel health insurance policy' },
  'English Test Scores': { key: 'englishScores', helper: 'IELTS / TOEFL / PTE score report' },
  'Travel Insurance': { key: 'travelInsurance', helper: 'Travel insurance policy document' },
  'DS-160 Confirmation': { key: 'ds160Confirmation', helper: 'DS-160 form confirmation page' },
  'Property Documents': { key: 'propertyDocs', helper: 'Property ownership documents' },
  'Accommodation Proof': { key: 'accommodationProof', helper: 'Proof of accommodation / hotel reservation' },
  'Invitation from Child/Grandchild': { key: 'invitationLetter', helper: 'Invitation letter from child or grandchild in Canada' },
  'Medical Exam Report': { key: 'medicalExamReport', helper: 'Immigration medical examination report' },
  'Previous Japan Visas': { key: 'previousJapanVisas', helper: 'Copies of previous Japan visa stamps' },
  'Previous China Visas': { key: 'previousChinaVisas', helper: 'Copies of previous China visa stamps' },
  'Employment Contract': { key: 'employmentContract', helper: 'Employment contract from employer' },
  'Qualification Certificates': { key: 'qualificationCerts', helper: 'Educational qualification certificates' },
  'Hotel Voucher': { key: 'hotelVoucher', helper: 'Hotel voucher / confirmation from tour operator' },
  'Sponsor Letter': { key: 'sponsorLetter', helper: 'Sponsor letter from Indonesian sponsor' },
  'Medical Certificate': { key: 'medicalCertificate', helper: 'Medical fitness certificate' },
  'Police Clearance': { key: 'policeClearance', helper: 'Police clearance certificate (PCC)' },
  'Daily Package Payment Proof': { key: 'dailyPackageProof', helper: 'Proof of daily package payment to Bhutanese tour operator' },
  'Yellow Fever Certificate': { key: 'yellowFeverCert', helper: 'Yellow fever vaccination certificate' },
  'Purpose of Visit Letter': { key: 'purposeOfVisitLetter', helper: 'Letter explaining purpose of visit to Canada' },
};

// Documents that are always covered by the passport upload section (not shown as additional)
const ALWAYS_COVERED = new Set(['Passport', 'Photo']);

function getRequiredAdditionalDocs(visaDocuments: string[]): { key: string; title: string; helper: string }[] {
  const seen = new Set<string>();
  return visaDocuments
    .filter((doc) => !ALWAYS_COVERED.has(doc))
    .map((doc) => {
      const normalized = normalizeDocName(doc);
      const meta = docNameToMeta[normalized] || docNameToMeta[doc];
      if (meta) {
        // Deduplicate by key in case two doc names normalize to same key
        if (seen.has(meta.key)) return null;
        seen.add(meta.key);
        return { key: meta.key, title: doc, helper: meta.helper };
      }
      // Fallback for unknown doc names
      const key = normalized.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (seen.has(key)) return null;
      seen.add(key);
      return { key, title: doc, helper: `Upload ${doc}` };
    })
    .filter(Boolean) as { key: string; title: string; helper: string }[];
}

function createEmptyTraveler(index: number, requiredDocKeys: string[]): TravelerData {
  return {
    id: `traveler-${Date.now()}-${index}`,
    passportNumber: '',
    firstName: '',
    lastName: '',
    nationality: 'Indian',
    sex: '',
    dateOfBirth: '',
    placeOfBirth: '',
    placeOfIssue: '',
    maritalStatus: '',
    dateOfIssue: '',
    dateOfExpiry: '',
    passportFileName: '',
    ocrStatus: 'idle',
    ocrError: '',
    additionalDocs: Object.fromEntries(requiredDocKeys.map((k) => [k, null])),
    expanded: index === 0,
  };
}

function readStoredVisaType() {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('vvisa:selectedVisaType');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatDateForInput(dateStr: string): string {
  if (!dateStr) return '';
  // Handle DD/MM/YYYY format from OCR
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [d, m, y] = parts.map((p) => p.trim());
    // If year is 2 digits, convert to 4 digits
    const fullYear = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y;
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

/* ─── Traveler Card Component ─── */
function TravelerCard({
  traveler,
  index,
  onUpdate,
  onRemove,
  canRemove,
  requiredDocs,
}: {
  traveler: TravelerData;
  index: number;
  onUpdate: (id: string, field: keyof TravelerData, value: TravelerData[keyof TravelerData]) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  requiredDocs: { key: string; title: string; helper: string }[];
}) {
  const passportInputRef = useRef<HTMLInputElement>(null);
  const [showAddDocs, setShowAddDocs] = useState(false);
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handlePassportUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        onUpdate(traveler.id, 'ocrError', 'File size exceeds 5 MB limit');
        onUpdate(traveler.id, 'ocrStatus', 'error');
        return;
      }

      // Update file name
      onUpdate(traveler.id, 'passportFileName', file.name);
      onUpdate(traveler.id, 'ocrStatus', 'scanning');
      onUpdate(traveler.id, 'ocrError', '');

      try {
        const base64 = await fileToBase64(file);
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, documentType: 'passport' }),
        });
        const data = await res.json();

        if (data.success && data.fields) {
          for (const f of data.fields) {
            if (f.value) {
              const key = f.field as keyof TravelerData;
              if (key === 'dateOfBirth' || key === 'dateOfIssue' || key === 'dateOfExpiry') {
                const formatted = formatDateForInput(f.value);
                if (formatted) onUpdate(traveler.id, key, formatted);
              } else {
                onUpdate(traveler.id, key, f.value);
              }
            }
          }
          onUpdate(traveler.id, 'ocrStatus', 'done');
        } else {
          onUpdate(traveler.id, 'ocrError', data.error || 'OCR failed. Please enter details manually.');
          onUpdate(traveler.id, 'ocrStatus', 'error');
        }
      } catch (err) {
        console.error('OCR upload error:', err);
        onUpdate(traveler.id, 'ocrError', 'Network error. Please try again.');
        onUpdate(traveler.id, 'ocrStatus', 'error');
      }

      // Reset file input
      if (passportInputRef.current) passportInputRef.current.value = '';
    },
    [traveler.id, onUpdate]
  );

  const handleDocUpload = useCallback(
    async (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) return;

      try {
        const base64 = await fileToBase64(file);
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, documentType: docKey }),
        });
        const data = await res.json();
        if (data.success) {
          onUpdate(traveler.id, 'additionalDocs', { ...traveler.additionalDocs, [docKey]: file.name });
        }
      } catch {
        // Silently fail for additional docs
      }

      if (docInputRefs.current[docKey]) docInputRefs.current[docKey]!.value = '';
    },
    [traveler.id, traveler.additionalDocs, onUpdate]
  );

  const toggleExpand = () => {
    onUpdate(traveler.id, 'expanded', !traveler.expanded);
  };

  return (
    <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl overflow-hidden">
      {/* Traveler Header - Always visible */}
      <div
        className="p-4 sm:p-5 cursor-pointer hover:bg-vvisa-surface-2/50 transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {index + 1}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Traveler {index + 1}
                {traveler.firstName && (
                  <span className="text-vvisa-text-secondary font-normal"> — {traveler.firstName} {traveler.lastName}</span>
                )}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {traveler.ocrStatus === 'done' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                    <FileCheck className="h-3 w-3" /> OCR Complete
                  </span>
                )}
                {traveler.ocrStatus === 'scanning' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> Scanning with ocr.z.ai...
                  </span>
                )}
                {traveler.ocrStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
                    <X className="h-3 w-3" /> {traveler.ocrError}
                  </span>
                )}
                {traveler.ocrStatus === 'idle' && !traveler.passportFileName && (
                  <span className="text-[10px] text-vvisa-text-muted">Awaiting passport upload</span>
                )}
                {traveler.passportFileName && traveler.ocrStatus !== 'scanning' && (
                  <span className="text-[10px] text-vvisa-text-muted">
                    <ImageIcon className="h-3 w-3 inline mr-0.5" /> {traveler.passportFileName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(traveler.id);
                }}
                className="p-1.5 rounded-lg hover:bg-red-950/30 text-vvisa-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {traveler.expanded ? (
              <ChevronUp className="h-4 w-4 text-vvisa-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-vvisa-text-muted" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Traveler Details */}
      <AnimatePresence>
        {traveler.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 border-t border-vvisa-border">
              <div className="flex items-center justify-between mt-4 mb-1">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Scan className="h-4 w-4 text-primary" />
                  Passport Upload & OCR Scan
                </h4>
                <span className="text-[9px] text-vvisa-border-active font-mono">{CLIENT_ID}</span>
              </div>

              {/* Warning Banner */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/30 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80">
                  VVisa uses <span className="text-primary font-medium">ocr.z.ai</span> for 99.9% accurate passport scanning. Upload a clear passport image and details will be filled automatically. However, it is mandatory to review the information before submitting.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Upload Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[200px] cursor-pointer
                    ${traveler.ocrStatus === 'scanning'
                      ? 'border-primary bg-primary/5'
                      : traveler.ocrStatus === 'done'
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : 'border-vvisa-border hover:border-primary/50'
                    }`}
                  onClick={() => passportInputRef.current?.click()}
                >
                  <input
                    ref={passportInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    onChange={handlePassportUpload}
                  />

                  {traveler.ocrStatus === 'scanning' ? (
                    <>
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-sm text-primary font-medium mb-1">Scanning with ocr.z.ai...</p>
                      <p className="text-xs text-vvisa-text-muted">Extracting passport data</p>
                    </>
                  ) : traveler.ocrStatus === 'done' ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center mb-2">
                        <Check className="h-5 w-5 text-emerald-400" />
                      </div>
                      <p className="text-sm text-emerald-400 font-medium mb-1">Scan Complete</p>
                      <p className="text-xs text-vvisa-text-muted">Click to re-scan</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-vvisa-text-muted mb-3" />
                      <p className="text-sm text-vvisa-text-secondary mb-1">Drag & drop passport image</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium">
                        <Scan className="h-3 w-3" />
                        Powered by ocr.z.ai
                      </span>
                      <p className="text-xs text-vvisa-text-muted mt-2">JPG, PNG or PDF — max 5 MB</p>
                      <Button
                        variant="outline"
                        className="mt-3 border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          passportInputRef.current?.click();
                        }}
                      >
                        Choose File
                      </Button>
                    </>
                  )}
                </div>

                {/* Auto-populated Fields */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-vvisa-text-muted">Passport Number</Label>
                    <Input
                      value={traveler.passportNumber}
                      onChange={(e) => onUpdate(traveler.id, 'passportNumber', e.target.value)}
                      placeholder="Auto-filled after upload"
                      className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">First Name</Label>
                      <Input
                        value={traveler.firstName}
                        onChange={(e) => onUpdate(traveler.id, 'firstName', e.target.value)}
                        placeholder="First name"
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Last Name</Label>
                      <Input
                        value={traveler.lastName}
                        onChange={(e) => onUpdate(traveler.id, 'lastName', e.target.value)}
                        placeholder="Last name"
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Nationality</Label>
                      <Input
                        value={traveler.nationality}
                        onChange={(e) => onUpdate(traveler.id, 'nationality', e.target.value)}
                        placeholder="Indian"
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Sex</Label>
                      <Input
                        value={traveler.sex}
                        onChange={(e) => onUpdate(traveler.id, 'sex', e.target.value)}
                        placeholder="Male / Female"
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-vvisa-text-muted">Date of Birth</Label>
                    <Input
                      type="date"
                      value={traveler.dateOfBirth}
                      onChange={(e) => onUpdate(traveler.id, 'dateOfBirth', e.target.value)}
                      className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Place of Birth</Label>
                      <Input
                        value={traveler.placeOfBirth}
                        onChange={(e) => onUpdate(traveler.id, 'placeOfBirth', e.target.value)}
                        placeholder="City"
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Place of Issue</Label>
                      <Input
                        value={traveler.placeOfIssue}
                        onChange={(e) => onUpdate(traveler.id, 'placeOfIssue', e.target.value)}
                        placeholder="City"
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Marital Status</Label>
                      <Input
                        value={traveler.maritalStatus}
                        onChange={(e) => onUpdate(traveler.id, 'maritalStatus', e.target.value)}
                        placeholder="Single"
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Date of Issue</Label>
                      <Input
                        type="date"
                        value={traveler.dateOfIssue}
                        onChange={(e) => onUpdate(traveler.id, 'dateOfIssue', e.target.value)}
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-vvisa-text-muted">Date of Expiry</Label>
                      <Input
                        type="date"
                        value={traveler.dateOfExpiry}
                        onChange={(e) => onUpdate(traveler.id, 'dateOfExpiry', e.target.value)}
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Documents Section for this Traveler */}
              <Separator className="bg-vvisa-border my-5" />

              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Required Documents for Traveler {index + 1}
                  <span className="text-xs text-vvisa-text-muted font-normal">({requiredDocs.length} document{requiredDocs.length !== 1 ? 's' : ''})</span>
                </h4>
                <button
                  onClick={() => setShowAddDocs(!showAddDocs)}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  {showAddDocs ? 'Hide' : 'Show'} Documents
                  {showAddDocs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {requiredDocs.length === 0 ? (
                <p className="text-xs text-vvisa-text-muted py-4 text-center">No additional documents required for this visa type (only Passport & Photo).</p>
              ) : (
                <AnimatePresence>
                  {showAddDocs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {requiredDocs.map((doc) => {
                        const uploadedName = traveler.additionalDocs[doc.key];
                        return (
                          <div key={doc.key} className="space-y-1.5">
                            <Label className="text-sm text-foreground font-medium">{doc.title}</Label>
                            <p className="text-xs text-vvisa-text-muted">{doc.helper}</p>
                            <input
                              ref={(el) => { docInputRefs.current[doc.key] = el; }}
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                              className="hidden"
                              onChange={(e) => handleDocUpload(doc.key, e)}
                            />
                            <div
                              className={`border border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-center transition-colors cursor-pointer h-20
                                ${uploadedName
                                  ? 'border-emerald-500/50 bg-emerald-950/10'
                                  : 'border-vvisa-border hover:border-primary/50'
                                }`}
                              onClick={() => docInputRefs.current[doc.key]?.click()}
                            >
                              {uploadedName ? (
                                <>
                                  <FileCheck className="h-3.5 w-3.5 text-emerald-400 mb-1" />
                                  <p className="text-xs text-emerald-400 font-medium truncate max-w-full px-2">{uploadedName}</p>
                                  <span className="text-[9px] text-vvisa-text-muted mt-0.5">Click to replace</span>
                                </>
                              ) : (
                                <>
                                  <Scan className="h-3.5 w-3.5 text-vvisa-text-muted mb-1" />
                                  <p className="text-xs text-vvisa-text-muted">Click to upload</p>
                                  <span className="inline-flex items-center gap-0.5 text-[9px] text-primary mt-0.5">
                                    <Scan className="h-2.5 w-2.5" /> ocr.z.ai ready
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ─── Helper: Convert File to Base64 ─── */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Progress Stepper Component ─── */
function ProgressStepper({ currentStep }: { currentStep: number }) {
  const steps = ['Application Type', 'Internal ID', 'Traveler Details', 'Additional Documents', 'Review', 'Submit'];

  return (
    <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-vvisa-text-muted font-medium">APPLICATION PROGRESS</p>
          <span className="text-[9px] text-vvisa-border-active font-mono">{CLIENT_ID}</span>
        </div>
        <div className="space-y-0">
          {steps.map((step, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;

            return (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : isActive ? (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 ring-4 ring-primary/20">
                      <Circle className="h-2 w-2 text-white fill-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-vvisa-surface-2 border border-vvisa-border flex items-center justify-center shrink-0">
                      <Circle className="h-2 w-2 text-vvisa-text-muted" />
                    </div>
                  )}
                  {i < steps.length - 1 && (
                    <div className={`w-0.5 h-6 ${isCompleted ? 'bg-primary' : 'bg-vvisa-border'}`} />
                  )}
                </div>
                <p className={`text-xs pt-1 ${isActive ? 'text-foreground font-medium' : isCompleted ? 'text-vvisa-text-secondary' : 'text-vvisa-text-muted'}`}>
                  {step}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main ApplyView ─── */
export default function ApplyView() {
  const router = useRouter();
  const { selectedVisaType, setSelectedVisaType, walletBalance, submitApplication, navigate } = useAppStore();
  const activeVisaType = selectedVisaType ?? readStoredVisaType() ?? mockVisaTypes[0];
  const [appType, setAppType] = useState<'individual' | 'group'>('individual');
  const [internalId, setInternalId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ txnId: string; appId: string; error?: string } | null>(null);
  const [copiedTxn, setCopiedTxn] = useState(false);

  // Compute required additional docs from the selected visa type
  const requiredDocs = useMemo(() => {
    if (!activeVisaType?.documents) return [];
    return getRequiredAdditionalDocs(activeVisaType.documents);
  }, [activeVisaType]);

  const requiredDocKeys = useMemo(() => requiredDocs.map((d) => d.key), [requiredDocs]);

  const [travelers, setTravelers] = useState<TravelerData[]>(() => [createEmptyTraveler(0, requiredDocKeys)]);

  useEffect(() => {
    if (!selectedVisaType && activeVisaType) {
      setSelectedVisaType(activeVisaType);
    }
  }, [activeVisaType, selectedVisaType, setSelectedVisaType]);

  const pricePerTraveler = activeVisaType?.price || 13499;
  const total = pricePerTraveler * travelers.length;

  const handleUpdateTraveler = useCallback(
    (id: string, field: keyof TravelerData, value: TravelerData[keyof TravelerData]) => {
      setTravelers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    []
  );

  const handleRemoveTraveler = useCallback((id: string) => {
    setTravelers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleAddTraveler = () => {
    setTravelers((prev) => [...prev, createEmptyTraveler(prev.length, requiredDocKeys)]);
  };

  const handleSubmit = useCallback(() => {
    if (!activeVisaType || submitting) return;
    setSubmitting(true);

    // Build travelers array for submission
    const travelersPayload: Traveler[] = travelers.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      passportNumber: t.passportNumber,
      nationality: t.nationality,
      sex: t.sex || undefined,
      dateOfBirth: t.dateOfBirth || undefined,
      placeOfBirth: t.placeOfIssue || undefined,
      placeOfIssue: t.placeOfIssue || undefined,
      maritalStatus: t.maritalStatus || undefined,
      dateOfIssue: t.dateOfIssue || undefined,
      dateOfExpiry: t.dateOfExpiry || undefined,
      isChild: false,
      status: 'PAYMENT_PENDING' as const,
    }));

    const result = submitApplication({
      internalId,
      groupName: appType === 'group' ? groupName : '',
      destination: activeVisaType.destination,
      visaType: activeVisaType.name,
      visaCategory: activeVisaType.category,
      totalPrice: total,
      travelers: travelersPayload,
    });

    setSubmitting(false);

    if (result.success) {
      setSubmitResult({ txnId: result.transactionId, appId: result.applicationId });
    } else {
      setSubmitResult({ txnId: '', appId: '', error: result.error });
    }
  }, [activeVisaType, submitting, travelers, internalId, groupName, appType, total, submitApplication]);

  const copyTxnId = useCallback(() => {
    if (submitResult?.txnId) {
      navigator.clipboard.writeText(submitResult.txnId);
      setCopiedTxn(true);
      setTimeout(() => setCopiedTxn(false), 2000);
    }
  }, [submitResult]);

  // Determine current step based on form completion
  const currentStep = travelers.length > 1 ? 3 : travelers[0]?.ocrStatus === 'done' ? 3 : 2;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Application Setup */}
      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-vvisa-text-secondary mb-1.5 block font-medium">Are You Applying For</Label>
                <span className="text-[9px] text-vvisa-border-active font-mono">{CLIENT_ID}</span>
              </div>
              <ToggleGroup
                type="single"
                value={appType}
                onValueChange={(val) => val && setAppType(val as 'individual' | 'group')}
                className="bg-vvisa-bg border border-vvisa-border rounded-lg p-1"
              >
                <ToggleGroupItem
                  value="individual"
                  className="data-[state=on]:bg-primary data-[state=on]:text-white text-vvisa-text-secondary rounded-md px-4 h-9 text-sm"
                >
                  Individual
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="group"
                  className="data-[state=on]:bg-primary data-[state=on]:text-white text-vvisa-text-secondary rounded-md px-4 h-9 text-sm"
                >
                  Group
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-vvisa-text-secondary mb-1.5 block font-medium">Internal ID</Label>
              <Input
                value={internalId}
                onChange={(e) => setInternalId(e.target.value)}
                placeholder="e.g. C7612934"
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
              />
            </div>
            {appType === 'group' && (
              <div className="flex-1">
                <Label className="text-xs text-vvisa-text-secondary mb-1.5 block font-medium">Group Name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. SAPNA CHHAJER"
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                />
              </div>
            )}
          </div>

          {/* Visa Type Display */}
          {activeVisaType && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-vvisa-text-muted">Selected Visa Type</p>
                <p className="text-sm font-medium text-foreground">{activeVisaType.name}</p>
              </div>
              <span className="text-sm font-bold font-mono text-primary">
                {formatINR(activeVisaType.price)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3-Column Layout */}
      <div className="flex gap-6">
        {/* Left: Progress Stepper */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <ProgressStepper currentStep={currentStep} />
          </div>
        </div>

        {/* Center: Traveler Cards */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Traveler Cards */}
          <AnimatePresence mode="popLayout">
            {travelers.map((traveler, i) => (
              <motion.div
                key={traveler.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <TravelerCard
                  traveler={traveler}
                  index={i}
                  onUpdate={handleUpdateTraveler}
                  onRemove={handleRemoveTraveler}
                  canRemove={travelers.length > 1}
                  requiredDocs={requiredDocs}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Traveler Button */}
          <Button
            variant="outline"
            onClick={handleAddTraveler}
            className="w-full border-dashed border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground hover:border-primary/50 rounded-xl h-12 flex items-center gap-2 text-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Another Traveler
            <span className="text-xs text-vvisa-text-muted ml-1">
              (+{formatINR(pricePerTraveler)})
            </span>
          </Button>

          {/* Review CTA (mobile) */}
          <div className="lg:hidden">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !activeVisaType}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-11 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? 'Submitting...' : 'Review and Save'} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right: Price Summary */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24">
            <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Price Summary</h3>
                  <span className="text-[9px] text-vvisa-border-active font-mono">{CLIENT_ID}</span>
                </div>

                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {travelers.map((t, i) => (
                    <div key={t.id} className="flex justify-between items-center">
                      <span className="text-xs text-vvisa-text-secondary">
                        Traveler {i + 1}
                        {t.firstName ? ` — ${t.firstName} ${t.lastName}` : ''}
                      </span>
                      <span className="text-sm font-mono text-foreground">{formatINR(pricePerTraveler)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="bg-vvisa-border my-3" />

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-semibold text-foreground">Total ({travelers.length} traveler{travelers.length > 1 ? 's' : ''})</span>
                  <span className="text-lg font-bold font-mono text-foreground">{formatINR(total)}</span>
                </div>

                <Separator className="bg-vvisa-border my-3" />

                <div className="flex justify-between items-center mb-5">
                  <span className="text-xs text-vvisa-text-muted">Current Wallet Balance</span>
                  <span className="text-sm font-mono text-primary">{formatINR(walletBalance)}</span>
                </div>

                <div className="flex justify-between items-center mb-5">
                  <span className="text-xs text-vvisa-text-muted">After Payment</span>
                  <span className={`text-sm font-mono ${walletBalance - total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatINR(walletBalance - total)}
                  </span>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !activeVisaType || walletBalance < total}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {submitting ? 'Submitting...' : 'Review and Save'} <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submission Result Dialog */}
      <AnimatePresence>
        {submitResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSubmitResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-vvisa-surface border border-vvisa-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {submitResult.error ? (
                <>
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-red-950/30 flex items-center justify-center">
                      <X className="h-7 w-7 text-red-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground text-center mb-2">Submission Failed</h3>
                  <p className="text-sm text-vvisa-text-secondary text-center mb-6">{submitResult.error}</p>
                  <Button onClick={() => setSubmitResult(null)} className="w-full bg-vvisa-surface-2 border border-vvisa-border hover:bg-vvisa-border text-foreground rounded-lg h-10">
                    Dismiss
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-950/30 flex items-center justify-center">
                      <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground text-center mb-1">Application Submitted</h3>
                  <p className="text-xs text-vvisa-text-muted text-center mb-5">Your wallet has been debited. Track status in Applications.</p>

                  {/* Transaction ID */}
                  <div className="bg-vvisa-bg border border-vvisa-border rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="text-xs text-vvisa-text-secondary font-medium">Unique Transaction ID</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-foreground break-all">{submitResult.txnId}</code>
                      <button
                        onClick={copyTxnId}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-vvisa-surface-2 transition-colors"
                        title="Copy Transaction ID"
                      >
                        {copiedTxn ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-vvisa-text-muted" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-vvisa-border-active font-mono mt-2">Derived from Client ID: {CLIENT_ID}</p>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Destination</p>
                      <p className="text-foreground font-medium mt-0.5">{activeVisaType?.destination}</p>
                    </div>
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Amount Debited</p>
                      <p className="text-foreground font-mono font-medium mt-0.5">{formatINR(total)}</p>
                    </div>
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Travelers</p>
                      <p className="text-foreground font-medium mt-0.5">{travelers.length}</p>
                    </div>
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Remaining Balance</p>
                      <p className="text-emerald-400 font-mono font-medium mt-0.5">{formatINR(walletBalance - total)}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setSubmitResult(null);
                        navigate('applications');
                        router.push('/applications');
                      }}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-lg h-10 text-sm"
                    >
                      View Applications
                    </Button>
                    <Button
                      onClick={() => setSubmitResult(null)}
                      className="flex-1 bg-vvisa-surface-2 border border-vvisa-border hover:bg-vvisa-border text-foreground rounded-lg h-10 text-sm"
                    >
                      Submit Another
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
