'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockVisaTypes } from '@/lib/mock-data';
import { useVisaCatalogue } from '@/lib/use-visa-catalogue';
import { isDemoMode } from '@/lib/app-mode';
import { getRequiredAdditionalDocs as resolveRequiredAdditionalDocs } from '@/lib/checklist';
import { resolveVisaJurisdiction } from '@/lib/jurisdiction';
import { formatMoneyMinor, resolveVisaPricing } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { PriceBreakdownPopover } from '@/components/pricing/PriceBreakdownPopover';
import { VisaAttributeBadges } from '@/components/visa/VisaAttributeBadges';
import { calculateAge, evaluatePassportValidity } from '@/lib/date/calculate-age';
import { normalizePassportAutofillValue, resolvePassportAutofillField } from '@/lib/ocr/passport-fields';
import {
  Upload, AlertTriangle, Plus, ArrowRight, Check, Circle, Scan,
  Loader2, X, FileCheck, ChevronDown, ChevronUp, Image as ImageIcon,
  Trash2, FileText, Copy, CheckCircle2, Receipt,
} from 'lucide-react';
import type { Traveler, VisaDocumentRequirement, VisaPricingLineItem, VisaStickerRoute, VisaType } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

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
  guardianApplicantId: string;
  guardianRelationship: 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN' | 'OTHER_GUARDIAN' | '';
  dateOfIssue: string;
  dateOfExpiry: string;
  passportFileName: string;
  ocrStatus: 'idle' | 'scanning' | 'done' | 'error';
  ocrError: string;
  additionalDocs: { [key: string]: string | null };
  expanded: boolean;
}

interface ApplicantValidationIssue {
  travelerId: string;
  message: string;
  blocksSubmit: boolean;
}

// Normalize document names - strip parenthetical annotations (e.g. "Bank Statement (min Rs 3L)" -> "Bank Statement")
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

function getUploadableDoc(doc: VisaDocumentRequirement): { key: string; title: string; helper: string } | null {
  if (doc.uploadRequired === false || doc.appliesTo === 'AGENCY' || doc.appliesTo === 'SPONSOR') return null;
  const title = doc.documentName ?? doc.label;
  if (ALWAYS_COVERED.has(normalizeDocName(title))) return null;
  const normalized = normalizeDocName(title);
  const meta = docNameToMeta[normalized] || docNameToMeta[title];

  return {
    key: meta?.key ?? doc.documentCode ?? normalized.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    title: doc.requirement === 'MANDATORY' ? `${title} *` : title,
    helper: doc.description ?? doc.notes ?? meta?.helper ?? `Upload ${title}`,
  };
}

function getRequiredAdditionalDocs(visa: VisaType): { key: string; title: string; helper: string }[] {
  const seen = new Set<string>();
  const structuredMandatory = visa.documentRequirements?.mandatory ?? [];
  const docs = structuredMandatory.length
    ? structuredMandatory.map(getUploadableDoc).filter(Boolean)
    : visa.documents
    .filter((doc) => !ALWAYS_COVERED.has(doc))
    .map((doc) => {
      const normalized = normalizeDocName(doc);
      const meta = docNameToMeta[normalized] || docNameToMeta[doc];
      if (meta) {
        return { key: meta.key, title: doc, helper: meta.helper };
      }
      const key = normalized.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return { key, title: doc, helper: `Upload ${doc}` };
    });

  return (docs as { key: string; title: string; helper: string }[]).filter((doc) => {
    if (seen.has(doc.key)) return false;
    seen.add(doc.key);
    return true;
  });
}

function scalePricingLineItems(lineItems: VisaPricingLineItem[] | undefined, quantity: number): VisaPricingLineItem[] | undefined {
  if (!lineItems?.length || quantity <= 1) return lineItems;
  return lineItems.map((line) => ({
    ...line,
    amount: line.amount * quantity,
    amountMinor: line.amountMinor !== undefined ? line.amountMinor * quantity : undefined,
    quantity: (line.quantity ?? 1) * quantity,
  }));
}

function getStickerRoutes(visa: VisaType): VisaStickerRoute[] {
  return visa.stickerRoutes?.length ? visa.stickerRoutes : visa.courierRules?.routes ?? [];
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
    guardianApplicantId: '',
    guardianRelationship: '',
    dateOfIssue: '',
    dateOfExpiry: '',
    passportFileName: '',
    ocrStatus: 'idle',
    ocrError: '',
    additionalDocs: Object.fromEntries(requiredDocKeys.map((k) => [k, null])),
    expanded: index === 0,
  };
}

function getAgeReferenceDate(travelDate: string): string {
  return travelDate || new Date().toISOString().slice(0, 10);
}

function getTravelerDisplayName(traveler: TravelerData, index: number): string {
  const name = `${traveler.firstName} ${traveler.lastName}`.trim();
  return name || `Traveler ${index + 1}`;
}

function validateApplicants(travelers: TravelerData[], travelDate: string): ApplicantValidationIssue[] {
  const ageReferenceDate = getAgeReferenceDate(travelDate);
  const adultIds = new Set(
    travelers
      .filter((traveler) => {
        const age = calculateAge(traveler.dateOfBirth, ageReferenceDate);
        return age !== null && age >= 18;
      })
      .map((traveler) => traveler.id)
  );

  return travelers.flatMap((traveler, index) => {
    const issues: ApplicantValidationIssue[] = [];
    const displayName = getTravelerDisplayName(traveler, index);
    const passportValidity = evaluatePassportValidity({
      passportExpiryDate: traveler.dateOfExpiry,
      travelDate: travelDate || undefined,
      rule: 'UNKNOWN',
    });

    if (passportValidity.blocksProgress) {
      issues.push({
        travelerId: traveler.id,
        message: `${displayName}: passport is expired for the travel date.`,
        blocksSubmit: true,
      });
    }

    const age = calculateAge(traveler.dateOfBirth, ageReferenceDate);
    const isMinor = age !== null && age < 18;
    if (isMinor) {
      if (adultIds.size === 0) {
        issues.push({
          travelerId: traveler.id,
          message: `${displayName}: no adult traveler is available, so guardian details need manual review.`,
          blocksSubmit: true,
        });
      } else if (!traveler.guardianApplicantId || !traveler.guardianRelationship || !adultIds.has(traveler.guardianApplicantId)) {
        issues.push({
          travelerId: traveler.id,
          message: `${displayName}: link a travelling parent or guardian and select the relationship.`,
          blocksSubmit: true,
        });
      }
    }

    return issues;
  });
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

function getApplySearchSessionId(visa?: VisaType) {
  if (typeof window === 'undefined') return undefined;
  const key = 'vvisa:crmSearchSessionId';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const searchSessionId = `apply:${visa?.id ?? 'unknown'}:${crypto.randomUUID()}`;
  sessionStorage.setItem(key, searchSessionId);
  return searchSessionId;
}

function trackApplyProductIntent(input: {
  eventType: 'APPLICATION_STARTED' | 'DOCUMENT_UPLOADED' | 'PAYMENT_SCREEN_OPENED' | 'PAYMENT_ABANDONED';
  visa?: VisaType | null;
}) {
  if (isDemoMode() || !input.visa) return;

  void fetch('/api/events/product-intent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      eventType: input.eventType,
      country: input.visa.destination,
      countryCode: input.visa.destinationCode,
      productId: input.visa.id,
      productName: input.visa.name,
      category: input.visa.category,
      sourcePage: '/apply',
      searchSessionId: getApplySearchSessionId(input.visa),
    }),
  }).catch(() => undefined);
}

/* --- Traveler Card Component --- */
function TravelerCard({
  traveler,
  index,
  onUpdate,
  onRemove,
  onDocumentUploaded,
  canRemove,
  requiredDocs,
  travelers,
  travelDate,
}: {
  traveler: TravelerData;
  index: number;
  onUpdate: (id: string, field: keyof TravelerData, value: TravelerData[keyof TravelerData]) => void;
  onRemove: (id: string) => void;
  onDocumentUploaded: () => void;
  canRemove: boolean;
  requiredDocs: { key: string; title: string; helper: string }[];
  travelers: TravelerData[];
  travelDate: string;
}) {
  const passportInputRef = useRef<HTMLInputElement>(null);
  const [showAddDocs, setShowAddDocs] = useState(false);
  const [passportPreview, setPassportPreview] = useState<{ url: string; type: 'image' | 'pdf' | ''; name: string } | null>(null);
  const [lensPosition, setLensPosition] = useState({ x: 50, y: 50 });
  const [showLens, setShowLens] = useState(false);
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    return () => {
      if (passportPreview?.url) URL.revokeObjectURL(passportPreview.url);
    };
  }, [passportPreview?.url]);

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
      setPassportPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return {
          url: URL.createObjectURL(file),
          type: file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : '',
          name: file.name,
        };
      });
      onUpdate(traveler.id, 'ocrStatus', 'scanning');
      onUpdate(traveler.id, 'ocrError', '');

      try {
        const base64 = await fileToBase64(file);
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, documentType: 'passport', mimeType: file.type }),
        });
        const data = await res.json().catch(() => ({}));

        if (data.success && data.fields) {
          for (const f of data.fields) {
            if (!f.value) continue;
            const key = resolvePassportAutofillField(f.field);
            if (!key) continue;
            const value = normalizePassportAutofillValue(key, String(f.value));
            if (value) onUpdate(traveler.id, key, value);
          }
          onUpdate(traveler.id, 'ocrStatus', 'done');
          onDocumentUploaded();
        } else {
          onUpdate(traveler.id, 'ocrError', data.error || (res.ok ? 'OCR failed. Please enter details manually.' : 'V-Visa AI scan is unavailable. Please enter details manually.'));
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
    [traveler.id, onUpdate, onDocumentUploaded]
  );

  const handlePreviewPointerMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    setLensPosition({ x, y });
  }, []);

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
          onDocumentUploaded();
        }
      } catch {
        // Silently fail for additional docs
      }

      if (docInputRefs.current[docKey]) docInputRefs.current[docKey]!.value = '';
    },
    [traveler.id, traveler.additionalDocs, onUpdate, onDocumentUploaded]
  );

  const toggleExpand = () => {
    onUpdate(traveler.id, 'expanded', !traveler.expanded);
  };
  const ageReferenceDate = travelDate || new Date().toISOString().slice(0, 10);
  const age = calculateAge(traveler.dateOfBirth, ageReferenceDate);
  const isMinor = age !== null && age < 18;
  const adultTravelers = travelers.filter((candidate) => {
    if (candidate.id === traveler.id) return false;
    const candidateAge = calculateAge(candidate.dateOfBirth, ageReferenceDate);
    return candidateAge !== null && candidateAge >= 18;
  });
  const passportValidity = evaluatePassportValidity({
    passportExpiryDate: traveler.dateOfExpiry,
    travelDate: travelDate || undefined,
    rule: 'UNKNOWN',
  });

  return (
    <Card className="vv-surface overflow-hidden rounded-xl border">
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
                  <span className="text-vvisa-text-secondary font-normal"> - {traveler.firstName} {traveler.lastName}</span>
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
                    <Loader2 className="h-3 w-3 animate-spin" /> Scanning with V-Visa AI...
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
                  Passport Upload & V-Visa AI Scan
                </h4>
              </div>

              {/* Warning Banner */}
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700/80 dark:text-amber-200/80">
                  VVisa uses <span className="text-primary font-medium">V-Visa AI</span> for passport scanning. Upload a clear passport image and details will be filled automatically. However, it is mandatory to review the information before submitting.
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

                  {passportPreview?.url && passportPreview.type === 'image' && traveler.ocrStatus !== 'scanning' ? (
                    <>
                      <div
                        className="relative mb-3 w-full max-w-[280px] overflow-hidden rounded-lg border border-vvisa-border bg-vvisa-bg"
                        onMouseEnter={() => setShowLens(true)}
                        onMouseLeave={() => setShowLens(false)}
                        onMouseMove={handlePreviewPointerMove}
                      >
                        <img
                          src={passportPreview.url}
                          alt={`${passportPreview.name || 'Passport'} preview`}
                          className="h-40 w-full object-contain"
                        />
                        {showLens && (
                          <div
                            className="pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-2xl ring-2 ring-primary/40"
                            style={{
                              left: `${lensPosition.x}%`,
                              top: `${lensPosition.y}%`,
                              backgroundImage: `url(${passportPreview.url})`,
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '280% 280%',
                              backgroundPosition: `${lensPosition.x}% ${lensPosition.y}%`,
                            }}
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <p className="max-w-full truncate text-sm font-medium text-foreground">{passportPreview.name}</p>
                      <p className="text-xs text-vvisa-text-muted">{traveler.ocrStatus === 'done' ? 'Preview ready. Hover to magnify, click to replace.' : 'Preview ready. Hover to magnify and review details.'}</p>
                    </>
                  ) : passportPreview?.url && passportPreview.type === 'pdf' && traveler.ocrStatus !== 'scanning' ? (
                    <>
                      <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-xl border border-vvisa-border bg-vvisa-bg">
                        <FileText className="h-10 w-10 text-primary" />
                      </div>
                      <p className="max-w-full truncate text-sm font-medium text-foreground">{passportPreview.name}</p>
                      <p className="text-xs text-vvisa-text-muted">PDF uploaded. Click to replace.</p>
                    </>
                  ) : traveler.ocrStatus === 'scanning' ? (
                    <>
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-sm text-primary font-medium mb-1">Scanning with V-Visa AI...</p>
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
                        Powered by V-Visa AI
                      </span>
                      <p className="text-xs text-vvisa-text-muted mt-2">JPG, PNG or PDF - max 5 MB</p>
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
                    {isMinor && (
                      <>
                        <div>
                          <Label className="text-xs text-vvisa-text-muted">Travelling Parent / Guardian *</Label>
                          <select
                            value={traveler.guardianApplicantId}
                            onChange={(e) => onUpdate(traveler.id, 'guardianApplicantId', e.target.value)}
                            className="w-full bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1 px-3"
                          >
                            <option value="">Link Parent / Guardian</option>
                            {adultTravelers.map((adult) => (
                              <option key={adult.id} value={adult.id}>
                                {`${adult.firstName || `Traveler ${travelers.indexOf(adult) + 1}`} ${adult.lastName || ''}`.trim()}
                                {adult.passportNumber ? ` - Passport ending ${adult.passportNumber.slice(-4)}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-vvisa-text-muted">Relationship *</Label>
                          <select
                            value={traveler.guardianRelationship}
                            onChange={(e) => onUpdate(traveler.id, 'guardianRelationship', e.target.value as TravelerData['guardianRelationship'])}
                            className="w-full bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1 px-3"
                          >
                            <option value="">Select relationship</option>
                            <option value="FATHER">Father</option>
                            <option value="MOTHER">Mother</option>
                            <option value="LEGAL_GUARDIAN">Legal guardian</option>
                            <option value="OTHER_GUARDIAN">Other guardian</option>
                          </select>
                        </div>
                      </>
                    )}
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
                      {passportValidity.message && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-4 text-amber-700 dark:text-amber-100">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <span>{passportValidity.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isMinor && (!traveler.guardianApplicantId || !traveler.guardianRelationship) && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span>This traveller will be under 18 on the travel date. Link a parent or legal guardian travelling in the same application.</span>
                    </div>
                  )}
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
                                    <Scan className="h-2.5 w-2.5" /> V-Visa AI ready
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

/* --- Helper: Convert File to Base64 --- */
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

/* --- Progress Stepper Component --- */
function ProgressStepper({ currentStep }: { currentStep: number }) {
  const steps = ['Application Type', 'Internal ID', 'Traveler Details', 'Additional Documents', 'Review', 'Submit'];

  return (
    <Card className="vv-surface rounded-xl border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-vvisa-text-muted font-medium">APPLICATION PROGRESS</p>
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

/* --- Main ApplyView --- */
export default function ApplyView() {
  const router = useRouter();
  const { selectedVisaType, setSelectedVisaType, walletBalance, submitApplication, navigate } = useAppStore();
  const { visaTypes } = useVisaCatalogue();
  const activeVisaType = selectedVisaType ?? readStoredVisaType() ?? visaTypes[0] ?? mockVisaTypes[0];
  const [appType, setAppType] = useState<'individual' | 'group'>('individual');
  const [internalId, setInternalId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ txnId: string; appId: string; error?: string } | null>(null);
  const [copiedTxn, setCopiedTxn] = useState(false);
  const [passportOriginCity, setPassportOriginCity] = useState('');
  const [residenceState, setResidenceState] = useState('');
  const [residenceCity, setResidenceCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const requiredDocs = useMemo(() => {
    if (!activeVisaType) return [];
    return resolveRequiredAdditionalDocs(activeVisaType);
  }, [activeVisaType]);

  const requiredDocKeys = useMemo(() => requiredDocs.map((d) => d.key), [requiredDocs]);
  const stickerRoutes = useMemo(() => activeVisaType ? getStickerRoutes(activeVisaType) : [], [activeVisaType]);
  const isStickerVisa = activeVisaType?.visaKind === 'STICKER_VISA';
  const jurisdictionRequired = Boolean(activeVisaType?.jurisdictions?.length);
  const jurisdictionResolution = useMemo(
    () => resolveVisaJurisdiction(activeVisaType, {
      residenceCountry: 'India',
      residenceState,
      residenceCity,
      postalCode,
    }),
    [activeVisaType, postalCode, residenceCity, residenceState]
  );
  const jurisdictionBlocksSubmit = jurisdictionResolution.status === 'MANUAL_REVIEW';
  const selectedPassportOriginCity = passportOriginCity;

  const [travelers, setTravelers] = useState<TravelerData[]>(() => [createEmptyTraveler(0, requiredDocKeys)]);
  const pricingResult = useMemo(
    () => resolveVisaPricing(activeVisaType, { quantity: travelers.length, routeKey: selectedPassportOriginCity || undefined }),
    [activeVisaType, selectedPassportOriginCity, travelers.length]
  );
  const singleTravelerPricingResult = useMemo(
    () => resolveVisaPricing(activeVisaType, { quantity: 1, routeKey: selectedPassportOriginCity || undefined }),
    [activeVisaType, selectedPassportOriginCity]
  );

  useEffect(() => {
    if (!selectedVisaType && activeVisaType) {
      setSelectedVisaType(activeVisaType);
    }
  }, [activeVisaType, selectedVisaType, setSelectedVisaType]);

  useEffect(() => {
    trackApplyProductIntent({ eventType: 'APPLICATION_STARTED', visa: activeVisaType });
  }, [activeVisaType?.id]);

  const pricePerTraveler = Math.round(singleTravelerPricingResult.visibleTotalMinor / 100);
  const total = Math.round(pricingResult.visibleTotalMinor / 100);

  const validationIssues = useMemo(() => validateApplicants(travelers, travelDate), [travelers, travelDate]);
  const blockingValidationIssues = useMemo(
    () => validationIssues.filter((issue) => issue.blocksSubmit),
    [validationIssues]
  );
  const canSubmit = Boolean(activeVisaType) && walletBalance >= total && blockingValidationIssues.length === 0 && !pricingResult.manualQuotationRequired && !jurisdictionBlocksSubmit;

  const handleTravelDateChange = useCallback((nextTravelDate: string) => {
    setTravelDate(nextTravelDate);
    setTravelers((prev) => {
      const ageReferenceDate = getAgeReferenceDate(nextTravelDate);
      const adultIds = new Set(
        prev
          .filter((traveler) => {
            const age = calculateAge(traveler.dateOfBirth, ageReferenceDate);
            return age !== null && age >= 18;
          })
          .map((traveler) => traveler.id)
      );

      let changed = false;
      const next = prev.map((traveler) => {
        const age = calculateAge(traveler.dateOfBirth, ageReferenceDate);
        const isMinor = age !== null && age < 18;
        const nextTraveler = { ...traveler };

        if (!isMinor && (nextTraveler.guardianApplicantId || nextTraveler.guardianRelationship)) {
          nextTraveler.guardianApplicantId = '';
          nextTraveler.guardianRelationship = '';
          changed = true;
        } else if (isMinor && nextTraveler.guardianApplicantId && !adultIds.has(nextTraveler.guardianApplicantId)) {
          nextTraveler.guardianApplicantId = '';
          changed = true;
        }

        return nextTraveler;
      });

      return changed ? next : prev;
    });
  }, []);

  const handleUpdateTraveler = useCallback(
    (id: string, field: keyof TravelerData, value: TravelerData[keyof TravelerData]) => {
      setTravelers((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, [field]: value } : t));
        const ageReferenceDate = getAgeReferenceDate(travelDate);
        const adultIds = new Set(
          next
            .filter((traveler) => {
              const age = calculateAge(traveler.dateOfBirth, ageReferenceDate);
              return age !== null && age >= 18;
            })
            .map((traveler) => traveler.id)
        );

        return next.map((traveler) => {
          const age = calculateAge(traveler.dateOfBirth, ageReferenceDate);
          const isMinor = age !== null && age < 18;
          if (!isMinor && (traveler.guardianApplicantId || traveler.guardianRelationship)) {
            return { ...traveler, guardianApplicantId: '', guardianRelationship: '' };
          }
          if (isMinor && traveler.guardianApplicantId && !adultIds.has(traveler.guardianApplicantId)) {
            return { ...traveler, guardianApplicantId: '' };
          }
          return traveler;
        });
      });
    },
    [travelDate]
  );

  const handleRemoveTraveler = useCallback((id: string) => {
    setTravelers((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t) => (t.guardianApplicantId === id ? { ...t, guardianApplicantId: '' } : t))
    );
  }, []);

  const handleAddTraveler = () => {
    setTravelers((prev) => [...prev, createEmptyTraveler(prev.length, requiredDocKeys)]);
  };

  const handleDocumentUploaded = useCallback(() => {
    trackApplyProductIntent({ eventType: 'DOCUMENT_UPLOADED', visa: activeVisaType });
  }, [activeVisaType]);

  const handleSubmit = useCallback(() => {
    if (!activeVisaType || submitting) return;
    if (blockingValidationIssues.length > 0) {
      setSubmitResult({ txnId: '', appId: '', error: blockingValidationIssues.map((issue) => issue.message).join(' ') });
      return;
    }
    trackApplyProductIntent({ eventType: 'APPLICATION_STARTED', visa: activeVisaType });
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
      guardianApplicantId: t.guardianApplicantId || undefined,
      guardianRelationship: t.guardianRelationship || undefined,
      dateOfIssue: t.dateOfIssue || undefined,
      dateOfExpiry: t.dateOfExpiry || undefined,
      isChild: calculateAge(t.dateOfBirth, travelDate || new Date().toISOString().slice(0, 10)) !== null
        ? (calculateAge(t.dateOfBirth, travelDate || new Date().toISOString().slice(0, 10)) as number) < 18
        : false,
      status: 'PAYMENT_PENDING' as const,
    }));

    const result = submitApplication({
      internalId,
      groupName: appType === 'group' ? groupName : '',
      destination: activeVisaType.destination,
      visaType: activeVisaType.name,
      visaCategory: activeVisaType.category,
      travelDate,
      returnDate,
      totalPrice: total,
      travelers: travelersPayload,
    });

    setSubmitting(false);

    if (result.success) {
      setSubmitResult({ txnId: result.transactionId, appId: result.applicationId });
    } else {
      setSubmitResult({ txnId: '', appId: '', error: result.error });
    }
  }, [activeVisaType, submitting, blockingValidationIssues, travelers, internalId, groupName, appType, total, travelDate, returnDate, submitApplication]);

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
      <Card className="vv-surface-elevated rounded-xl border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-vvisa-text-secondary mb-1.5 block font-medium">Are You Applying For</Label>
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
            <div className="flex-1">
              <Label className="text-xs text-vvisa-text-secondary mb-1.5 block font-medium">Travel Date</Label>
              <Input
                type="date"
                value={travelDate}
                onChange={(e) => handleTravelDateChange(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-vvisa-text-secondary mb-1.5 block font-medium">Return Date</Label>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
              />
            </div>
          </div>

          {/* Visa Type Display */}
          {activeVisaType && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-vvisa-text-muted">Selected Visa Type</p>
                <p className="text-sm font-medium text-foreground">{activeVisaType.name}</p>
                <VisaAttributeBadges visa={activeVisaType} className="mt-2" includeProcessing={false} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="vv-tabular text-sm font-bold text-primary">
                  {formatMoneyMinor(singleTravelerPricingResult.visibleTotalMinor, singleTravelerPricingResult.currency)}
                </span>
                <PriceBreakdownPopover
                  amount={activeVisaType.price}
                  currency={activeVisaType.currency}
                  pricingResult={singleTravelerPricingResult}
                />
              </div>
            </div>
          )}

          {activeVisaType && jurisdictionRequired && (
            <div className="mt-4 rounded-lg border border-blue-500/25 bg-blue-500/10 p-3">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_0.8fr]">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold text-blue-700 dark:text-blue-200">Residence State</Label>
                  <Input
                    value={residenceState}
                    onChange={(event) => setResidenceState(event.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="bg-vvisa-surface"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold text-blue-700 dark:text-blue-200">Residence City</Label>
                  <Input
                    value={residenceCity}
                    onChange={(event) => setResidenceCity(event.target.value)}
                    placeholder="e.g. Mumbai"
                    className="bg-vvisa-surface"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold text-blue-700 dark:text-blue-200">PIN Code</Label>
                  <Input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    placeholder="Optional"
                    className="bg-vvisa-surface"
                  />
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-vvisa-border-subtle bg-vvisa-surface p-3 text-xs leading-5">
                {jurisdictionResolution.status === 'RESOLVED' && jurisdictionResolution.rule ? (
                  <div>
                    <p className="font-semibold text-foreground">Your application jurisdiction: {jurisdictionResolution.rule.jurisdictionLabel}</p>
                    <p className="text-vvisa-text-secondary">Submission centre: {jurisdictionResolution.rule.submissionCentreName ?? 'Manual review'}</p>
                    {jurisdictionResolution.rule.processingCentreCity && (
                      <p className="text-vvisa-text-secondary">Processing mission: {jurisdictionResolution.rule.processingCentreCity}</p>
                    )}
                    {jurisdictionResolution.rule.biometricCentreCity && (
                      <p className="text-vvisa-text-secondary">Biometric centre: {jurisdictionResolution.rule.biometricCentreCity}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-200">Jurisdiction verification required</p>
                    <p className="text-vvisa-text-secondary">Save the draft, but final submission is blocked until the assigned centre is confirmed.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeVisaType && isStickerVisa && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.2fr] sm:items-end">
                <div>
                  <Label className="text-xs text-amber-700 dark:text-amber-200 mb-1.5 block font-semibold">Passport Origin City</Label>
                  <select
                    value={selectedPassportOriginCity}
                    onChange={(event) => setPassportOriginCity(event.target.value)}
                    disabled={stickerRoutes.length === 0}
                    className="h-10 w-full rounded-lg border border-amber-500/30 bg-vvisa-surface px-3 text-sm text-foreground shadow-[var(--vvisa-shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {stickerRoutes.length > 0 ? (
                      <>
                        <option value="">Other India / choose city</option>
                        {stickerRoutes.map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.originCityLabel ?? route.origin}
                          </option>
                        ))}
                      </>
                    ) : (
                      <option value="">Manual quotation required</option>
                    )}
                  </select>
                </div>
                <p className="text-xs leading-5 text-amber-700/80 dark:text-amber-200/80">
                  {stickerRoutes.length > 0
                    ? 'Sticker visas require passport handover. Pricing uses the selected route when mapped, falls back to other India, or needs manual quotation.'
                    : 'No passport route is mapped for this sticker visa yet. Save the application for manual quotation before final confirmation.'}
                </p>
                {pricingResult.manualQuotationRequired && (
                  <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-200">
                    Manual quotation required before final confirmation.
                  </p>
                )}
              </div>
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
                  onDocumentUploaded={handleDocumentUploaded}
                  canRemove={travelers.length > 1}
                  requiredDocs={requiredDocs}
                  travelers={travelers}
                  travelDate={travelDate}
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

          {blockingValidationIssues.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="space-y-1">
                  {blockingValidationIssues.map((issue) => (
                    <p key={`${issue.travelerId}-${issue.message}`}>{issue.message}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Review CTA (mobile) */}
          <div className="lg:hidden">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
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
            <Card className="vv-surface-elevated rounded-xl border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Price Summary</h3>
                </div>

                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {travelers.map((t, i) => (
                    <div key={t.id} className="flex justify-between items-center">
                      <span className="text-xs text-vvisa-text-secondary">
                        Traveler {i + 1}
                        {t.firstName ? ` - ${t.firstName} ${t.lastName}` : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="vv-tabular text-sm text-foreground">{formatINR(pricePerTraveler)}</span>
                        <PriceBreakdownPopover
                          amount={pricePerTraveler}
                          currency={activeVisaType?.currency}
                          pricingResult={singleTravelerPricingResult}
                        />
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="bg-vvisa-border my-3" />

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-semibold text-foreground">Total ({travelers.length} traveler{travelers.length > 1 ? 's' : ''})</span>
                  <span className="flex items-center gap-1.5">
                    <span className="vv-tabular text-lg font-bold text-foreground">{formatMoneyMinor(pricingResult.visibleTotalMinor, pricingResult.currency)}</span>
                    <PriceBreakdownPopover
                      amount={total}
                      currency={activeVisaType?.currency}
                      quantity={travelers.length}
                      pricingResult={pricingResult}
                    />
                  </span>
                </div>

                <Separator className="bg-vvisa-border my-3" />

                {blockingValidationIssues.length > 0 && (
                  <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-100">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div className="space-y-1">
                        {blockingValidationIssues.map((issue) => (
                          <p key={`${issue.travelerId}-${issue.message}`}>{issue.message}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mb-5">
                  <span className="text-xs text-vvisa-text-muted">Current Wallet Balance</span>
                  <span className="vv-tabular text-sm text-primary">{formatINR(walletBalance)}</span>
                </div>

                <div className="flex justify-between items-center mb-5">
                  <span className="text-xs text-vvisa-text-muted">After Payment</span>
                  <span className={`vv-tabular text-sm ${walletBalance - total >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatINR(walletBalance - total)}
                  </span>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
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
              className="w-full max-w-md rounded-2xl border border-vvisa-border-subtle bg-vvisa-surface p-6 shadow-[var(--vvisa-shadow-lg)]"
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
                  <h3 className="text-lg font-semibold text-foreground text-center mb-1">
                    Application Submitted
                  </h3>
                  <p className="text-xs text-vvisa-text-muted text-center mb-5">
                    Your application has been saved. Track status in Applications.
                  </p>

                  {/* Transaction ID */}
                  <div className="bg-vvisa-bg border border-vvisa-border rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="text-xs text-vvisa-text-secondary font-medium">Unique Transaction ID</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="vv-tabular break-all text-sm text-foreground">{submitResult.txnId}</code>
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
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Destination</p>
                      <p className="text-foreground font-medium mt-0.5">{activeVisaType?.destination}</p>
                    </div>
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Amount Payable</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <p className="vv-tabular font-medium text-foreground">{formatMoneyMinor(pricingResult.visibleTotalMinor, pricingResult.currency)}</p>
                        <PriceBreakdownPopover
                          amount={total}
                          currency={activeVisaType?.currency}
                          quantity={travelers.length}
                          pricingResult={pricingResult}
                        />
                      </div>
                    </div>
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Travelers</p>
                      <p className="text-foreground font-medium mt-0.5">{travelers.length}</p>
                    </div>
                    <div className="bg-vvisa-bg rounded-lg p-3">
                      <p className="text-vvisa-text-muted">Remaining Balance</p>
                      <p className="vv-tabular mt-0.5 font-medium text-emerald-500">{formatINR(walletBalance - total)}</p>
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
