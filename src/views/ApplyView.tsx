'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockVisaTypes } from '@/lib/mock-data';
import { fetchPortalApplications } from '@/lib/application-api';
import { useVisaCatalogue } from '@/lib/use-visa-catalogue';
import { isDemoMode } from '@/lib/app-mode';
import { getRequiredAdditionalDocs as resolveRequiredAdditionalDocs } from '@/lib/checklist';
import { resolveVisaJurisdiction } from '@/lib/jurisdiction';
import { formatMoneyMinor, resolveVisaPricing } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { PriceBreakdownPopover } from '@/components/pricing/PriceBreakdownPopover';
import { VisaAttributeBadges } from '@/components/visa/VisaAttributeBadges';
import { calculateAge, evaluatePassportValidity } from '@/lib/date/calculate-age';
import { normalizePassportAutofillValue, resolvePassportAutofillField } from '@/lib/ocr/passport-fields';
import {
  Upload, AlertTriangle, Plus, ArrowRight, Check, Circle, Scan,
  Loader2, X, FileCheck, ChevronDown, ChevronUp, Image as ImageIcon,
  Trash2, FileText, Copy, CheckCircle2, Receipt, Clock, Eye, RefreshCw, Sparkles,
} from 'lucide-react';
import type { Traveler, VisaDocumentRequirement, VisaPricingLineItem, VisaStickerRoute, VisaType } from '@/types';
import { resolveIndianPassportLocation } from '@/lib/ocr/passport-location-resolver';
import { getStandardStickerRoutesForVisa, resolveStickerSubmissionRoute } from '@/lib/sticker-routing';

type PassportPreviewState = {
  url: string;
  type: 'image' | 'pdf' | '';
  name: string;
  renderedUrl?: string;
  renderError?: string;
  pageCount?: number;
  currentPage?: number;
};

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export interface UploadedAdditionalDoc {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  documentType: string;
  dataUrl: string;
  pageCount?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  passportFileBase64: string;
  passportMimeType: string;
  ocrProviderRequestId: string;
  ocrConfidence: 'low' | 'medium' | 'high' | '';
  ocrStatus: 'idle' | 'scanning' | 'done' | 'error';
  ocrError: string;
  additionalDocs: { [key: string]: string | null };
  additionalDocDetails?: { [key: string]: UploadedAdditionalDoc | null };
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
    passportFileBase64: '',
    passportMimeType: '',
    ocrProviderRequestId: '',
    ocrConfidence: '',
    ocrStatus: 'idle',
    ocrError: '',
    additionalDocs: Object.fromEntries(requiredDocKeys.map((k) => [k, null])),
    additionalDocDetails: Object.fromEntries(requiredDocKeys.map((k) => [k, null])),
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

function buildPassportCrmFields(traveler: TravelerData) {
  return Object.fromEntries(
    Object.entries({
      documentName: 'Passport',
      passportNumber: traveler.passportNumber,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      nationality: traveler.nationality,
      sex: traveler.sex,
      dateOfBirth: traveler.dateOfBirth,
      dateOfExpiry: traveler.dateOfExpiry,
      placeOfBirth: traveler.placeOfBirth,
      placeOfIssue: traveler.placeOfIssue,
      maritalStatus: traveler.maritalStatus,
      dateOfIssue: traveler.dateOfIssue,
    }).filter(([, value]) => typeof value === 'string' && value.trim().length > 0),
  );
}

import { isTouristVisa, validateTravelDates } from '@/lib/visa-rules';
export { isTouristVisa, validateTravelDates };

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
  const raw = sessionStorage.getItem('V-VISA:selectedVisaType');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getApplySearchSessionId(visa?: VisaType) {
  if (typeof window === 'undefined') return undefined;
  const key = 'V-VISA:crmSearchSessionId';
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
  const activeTransactionRef = useRef<string>('');
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const [showAddDocs, setShowAddDocs] = useState(false);
  const [passportPreview, setPassportPreview] = useState<PassportPreviewState | null>(null);
  const [storedPdfFile, setStoredPdfFile] = useState<File | null>(null);
  const [renderingPage, setRenderingPage] = useState(false);
  const [lens, setLens] = useState({ visible: false, x: 0, y: 0, bgX: 0, bgY: 0, bgWidth: 0, bgHeight: 0 });
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    return () => {
      if (passportPreview?.url) URL.revokeObjectURL(passportPreview.url);
      if (passportPreview?.renderedUrl) URL.revokeObjectURL(passportPreview.renderedUrl);
    };
  }, [passportPreview?.url, passportPreview?.renderedUrl]);

  const changePdfPage = useCallback(
    async (newPage: number) => {
      if (!storedPdfFile) return;
      setRenderingPage(true);
      try {
        const { dataUrl, pageCount } = await renderPdfPage(storedPdfFile, newPage);
        setPassportPreview((current) =>
          current ? { ...current, renderedUrl: dataUrl, currentPage: newPage, pageCount } : current
        );
      } catch (err) {
        console.warn('[PDF] Page navigation error:', err);
      } finally {
        setRenderingPage(false);
      }
    },
    [storedPdfFile]
  );

  const handlePassportUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Always reset file input value so selecting the same file triggers onChange reliably
      e.target.value = '';

      // 1. Create a NEW unique transaction ID for each upload
      const transactionId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      activeTransactionRef.current = transactionId;
      console.log('[Digio] new transaction created: PRESENT');
      console.log('[Digio] active transaction:', transactionId);

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        onUpdate(traveler.id, 'ocrError', 'File size exceeds 5 MB limit');
        onUpdate(traveler.id, 'ocrStatus', 'error');
        return;
      }

      // 2. RESET STATE BEFORE STARTING NEW TRANSACTION
      onUpdate(traveler.id, 'ocrStatus', 'scanning');
      onUpdate(traveler.id, 'ocrError', '');
      onUpdate(traveler.id, 'ocrConfidence', '');
      onUpdate(traveler.id, 'ocrProviderRequestId', '');
      onUpdate(traveler.id, 'passportFileName', file.name);
      onUpdate(traveler.id, 'passportMimeType', file.type);
      // Cleanly reset previous passport details so Person A data does NOT bleed into Person B
      onUpdate(traveler.id, 'passportNumber', '');
      onUpdate(traveler.id, 'firstName', '');
      onUpdate(traveler.id, 'lastName', '');
      onUpdate(traveler.id, 'dateOfBirth', '');
      onUpdate(traveler.id, 'dateOfExpiry', '');
      onUpdate(traveler.id, 'dateOfIssue', '');
      onUpdate(traveler.id, 'placeOfBirth', '');
      onUpdate(traveler.id, 'placeOfIssue', '');
      onUpdate(traveler.id, 'sex', '');
      onUpdate(traveler.id, 'nationality', 'Indian');

      // 3. Reset preview state with page 1
      setPassportPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        if (current?.renderedUrl) URL.revokeObjectURL(current.renderedUrl);
        return {
          url: URL.createObjectURL(file),
          type: file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : '',
          name: file.name,
          currentPage: 1,
          pageCount: 1,
        };
      });
      setStoredPdfFile(file.type === 'application/pdf' ? file : null);
      setLens((prev) => ({ ...prev, visible: false }));

      try {
        let base64ForOcr: string;
        let mimeTypeForOcr = file.type;

        if (file.type === 'application/pdf') {
          try {
            const { dataUrl, pageCount } = await renderPdfPage(file, 1);
            if (activeTransactionRef.current === transactionId) {
              setPassportPreview((current) =>
                current?.name === file.name
                  ? { ...current, renderedUrl: dataUrl, pageCount, currentPage: 1 }
                  : current
              );
            }
            base64ForOcr = dataUrl;
            mimeTypeForOcr = 'image/png';
          } catch (renderErr) {
            console.warn('[OCR] PDF preview/render failed, falling back to raw file:', renderErr);
            if (activeTransactionRef.current === transactionId) {
              setPassportPreview((current) =>
                current?.name === file.name ? { ...current, renderError: 'PDF preview unavailable' } : current
              );
            }
            base64ForOcr = await fileToBase64(file);
          }
        } else {
          base64ForOcr = await fileToBase64(file);
        }

        // Guard: Out-of-order check before network call
        if (activeTransactionRef.current !== transactionId) {
          console.log('[Digio] transaction matches: FALSE - upload superseded');
          return;
        }

        onUpdate(traveler.id, 'passportFileBase64', base64ForOcr);
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64ForOcr,
            documentType: 'passport',
            mimeType: mimeTypeForOcr,
            transactionId,
          }),
        });
        const data = await res.json().catch(() => ({}));

        // Guard: Out-of-order result check
        const isCurrent = activeTransactionRef.current === transactionId;
        console.log('[Digio] result transaction:', data.transactionId || transactionId);
        console.log('[Digio] transaction matches:', isCurrent ? 'TRUE' : 'FALSE');

        if (!isCurrent) {
          console.warn('[Digio] Stale OCR result discarded for transaction:', transactionId);
          return;
        }

        if (data.success && Array.isArray(data.fields)) {
          const populatedCount = populatePassportFromOCR(traveler.id, data.fields, onUpdate);
          console.log('[Digio] OCR fields:', populatedCount);

          if (typeof data.providerRequestId === 'string') {
            onUpdate(traveler.id, 'ocrProviderRequestId', data.providerRequestId);
          }
          if (data.confidence === 'low' || data.confidence === 'medium' || data.confidence === 'high') {
            onUpdate(traveler.id, 'ocrConfidence', data.confidence);
          }

          if (populatedCount > 0) {
            onUpdate(traveler.id, 'ocrStatus', 'done');
            onUpdate(traveler.id, 'ocrError', '');
            onDocumentUploaded();
          } else {
            onUpdate(traveler.id, 'ocrStatus', 'error');
            onUpdate(
              traveler.id,
              'ocrError',
              'Could not extract passport details. Please verify the document image or enter details manually.'
            );
          }
        } else {
          onUpdate(
            traveler.id,
            'ocrError',
            getOcrErrorMessage(
              data,
              res.ok ? 'OCR failed. Please enter details manually.' : 'V-Visa AI scan is unavailable. Please enter details manually.'
            )
          );
          onUpdate(traveler.id, 'ocrStatus', 'error');
        }
      } catch (err) {
        if (activeTransactionRef.current === transactionId) {
          console.error('OCR upload error:', err);
          onUpdate(traveler.id, 'ocrError', 'Network error. Please try again.');
          onUpdate(traveler.id, 'ocrStatus', 'error');
        }
      }

      // Reset file input
      if (passportInputRef.current) passportInputRef.current.value = '';
    },
    [traveler.id, onUpdate, onDocumentUploaded]
  );

  const handlePreviewPointerMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const container = previewContainerRef.current;
    const img = previewImgRef.current;
    if (!container || !img) return;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const cursorX = event.clientX - containerRect.left;
    const cursorY = event.clientY - containerRect.top;

    const imgX = event.clientX - imgRect.left;
    const imgY = event.clientY - imgRect.top;

    const clampedX = Math.max(0, Math.min(imgRect.width, imgX));
    const clampedY = Math.max(0, Math.min(imgRect.height, imgY));

    const zoom = 2.4;
    const lensRadius = 64;

    setLens({
      visible: true,
      x: cursorX,
      y: cursorY,
      bgWidth: imgRect.width * zoom,
      bgHeight: imgRect.height * zoom,
      bgX: -(clampedX * zoom - lensRadius),
      bgY: -(clampedY * zoom - lensRadius),
    });
  }, []);

  const [uploadingDocKeys, setUploadingDocKeys] = useState<{ [key: string]: boolean }>({});
  const [docPreviewModal, setDocPreviewModal] = useState<UploadedAdditionalDoc | null>(null);
  const [docPreviewPage, setDocPreviewPage] = useState<number>(1);
  const [docPreviewRenderedUrl, setDocPreviewRenderedUrl] = useState<string>('');
  const [docPreviewTotalPages, setDocPreviewTotalPages] = useState<number>(1);
  const [storedDocPdfFiles, setStoredDocPdfFiles] = useState<{ [key: string]: File }>({});

  const handleDocUpload = useCallback(
    async (docKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Always reset file input value so selecting the same file triggers onChange reliably
      e.target.value = '';

      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10 MB limit');
        return;
      }

      setUploadingDocKeys((prev) => ({ ...prev, [docKey]: true }));

      try {
        let previewDataUrl: string;
        let pageCount = 1;

        if (file.type === 'application/pdf') {
          setStoredDocPdfFiles((prev) => ({ ...prev, [docKey]: file }));
          try {
            const rendered = await renderPdfPage(file, 1);
            previewDataUrl = rendered.dataUrl;
            pageCount = rendered.pageCount;
          } catch {
            previewDataUrl = await fileToBase64(file);
          }
        } else {
          previewDataUrl = await fileToBase64(file);
        }

        const docRecord: UploadedAdditionalDoc = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          documentType: docKey,
          dataUrl: previewDataUrl,
          pageCount,
        };

        onUpdate(traveler.id, 'additionalDocs', {
          ...traveler.additionalDocs,
          [docKey]: file.name,
        });

        const currentDetails = traveler.additionalDocDetails || {};
        onUpdate(traveler.id, 'additionalDocDetails', {
          ...currentDetails,
          [docKey]: docRecord,
        });

        onDocumentUploaded();
      } catch (err) {
        console.error('Failed to process additional document upload:', err);
      } finally {
        setUploadingDocKeys((prev) => ({ ...prev, [docKey]: false }));
      }
    },
    [traveler.id, traveler.additionalDocs, traveler.additionalDocDetails, onUpdate, onDocumentUploaded]
  );

  const handleRemoveDoc = useCallback(
    (docKey: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updatedDocs = { ...traveler.additionalDocs };
      delete updatedDocs[docKey];
      onUpdate(traveler.id, 'additionalDocs', updatedDocs);

      const updatedDetails = { ...(traveler.additionalDocDetails || {}) };
      delete updatedDetails[docKey];
      onUpdate(traveler.id, 'additionalDocDetails', updatedDetails);
    },
    [traveler.id, traveler.additionalDocs, traveler.additionalDocDetails, onUpdate]
  );

  const handleOpenDocPreview = useCallback(
    async (docRecord: UploadedAdditionalDoc, docKey: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDocPreviewModal(docRecord);
      setDocPreviewPage(1);
      setDocPreviewTotalPages(docRecord.pageCount || 1);
      setDocPreviewRenderedUrl(docRecord.dataUrl);

      const pdfFile = storedDocPdfFiles[docKey];
      if (pdfFile) {
        try {
          const rendered = await renderPdfPage(pdfFile, 1);
          setDocPreviewRenderedUrl(rendered.dataUrl);
          setDocPreviewTotalPages(rendered.pageCount);
        } catch {}
      }
    },
    [storedDocPdfFiles]
  );

  const handleDocPreviewPageChange = useCallback(
    async (delta: number) => {
      if (!docPreviewModal) return;
      const pdfFile = storedDocPdfFiles[docPreviewModal.documentType];
      if (!pdfFile) return;

      const nextPage = Math.max(1, Math.min(docPreviewTotalPages, docPreviewPage + delta));
      if (nextPage === docPreviewPage) return;

      try {
        const rendered = await renderPdfPage(pdfFile, nextPage);
        setDocPreviewPage(nextPage);
        setDocPreviewRenderedUrl(rendered.dataUrl);
      } catch (err) {
        console.error('Failed to change preview page:', err);
      }
    },
    [docPreviewModal, docPreviewPage, docPreviewTotalPages, storedDocPdfFiles]
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
  const passportPreviewImageUrl = passportPreview?.type === 'image'
    ? passportPreview.url
    : passportPreview?.renderedUrl;

  return (
    <Card id={`traveler-card-${traveler.id}`} className="vv-surface overflow-hidden rounded-xl border">
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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  Traveler {index + 1}
                  {traveler.firstName && (
                    <span className="text-vvisa-text-secondary font-normal"> - {traveler.firstName} {traveler.lastName}</span>
                  )}
                </h3>
                {travelers.length > 1 && index === 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    Lead Traveler / Primary
                  </span>
                )}
                {travelers.length > 1 && index > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-vvisa-surface-2 text-vvisa-text-secondary border border-vvisa-border">
                    Co-Traveler #{index + 1}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {traveler.ocrStatus === 'done' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                    <FileCheck className="h-3 w-3" /> OCR Complete
                  </span>
                )}
                {traveler.ocrStatus === 'scanning' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> Scanning with V-Visa AI...
                  </span>
                )}
                {traveler.ocrStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-700 dark:text-red-300">
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
                className="p-1.5 rounded-lg hover:bg-red-500/12 text-vvisa-text-muted hover:text-red-700 dark:hover:bg-red-400/15 dark:hover:text-red-300 transition-colors"
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

              {/* Informational AI Scan Note */}
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-vvisa-text-secondary">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  V-Visa AI automatically scans and fills traveler details from passport photos or PDFs. Please review all extracted details before submitting.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Upload Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[200px]
                    ${traveler.ocrStatus === 'scanning'
                      ? 'border-primary bg-primary/5 cursor-wait pointer-events-none'
                      : traveler.ocrStatus === 'done'
                        ? 'border-emerald-500/50 bg-emerald-500/8 dark:bg-emerald-400/10 cursor-pointer'
                        : 'border-vvisa-border hover:border-primary/50 cursor-pointer'
                    }`}
                  onClick={() => {
                    if (traveler.ocrStatus !== 'scanning') {
                      passportInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={passportInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    disabled={traveler.ocrStatus === 'scanning'}
                    onChange={handlePassportUpload}
                  />

                  {passportPreviewImageUrl && traveler.ocrStatus !== 'scanning' ? (
                    <div className="w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                      <div
                        ref={previewContainerRef}
                        className="relative w-full overflow-hidden rounded-xl border border-vvisa-border bg-slate-950/40 p-2 flex items-center justify-center cursor-crosshair select-none min-h-[260px] max-h-[420px]"
                        onMouseEnter={() => setLens((prev) => ({ ...prev, visible: true }))}
                        onMouseLeave={() => setLens((prev) => ({ ...prev, visible: false }))}
                        onMouseMove={handlePreviewPointerMove}
                      >
                        <img
                          ref={previewImgRef}
                          src={passportPreviewImageUrl}
                          alt={`${passportPreview?.name || 'Passport'} preview`}
                          className="w-full h-auto max-h-[390px] object-contain block mx-auto pointer-events-none rounded-lg"
                        />
                        {lens.visible && (
                          <div
                            className="pointer-events-none absolute h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/90 shadow-[0_10px_35px_rgba(0,0,0,0.6)] ring-4 ring-black/40"
                            style={{
                              left: `${lens.x}px`,
                              top: `${lens.y}px`,
                              backgroundImage: `url(${passportPreviewImageUrl})`,
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: `${lens.bgWidth}px ${lens.bgHeight}px`,
                              backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
                            }}
                            aria-hidden="true"
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary/80 ring-1 ring-white/70" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Multi-Page Navigation for PDF Documents */}
                      {(passportPreview?.pageCount ?? 1) > 1 && (
                        <div className="mt-2.5 flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-vvisa-surface-2 border border-vvisa-border text-xs text-vvisa-text-secondary">
                          <button
                            type="button"
                            disabled={renderingPage || (passportPreview?.currentPage ?? 1) <= 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              changePdfPage((passportPreview?.currentPage ?? 1) - 1);
                            }}
                            className="px-2.5 py-1 rounded hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent font-medium flex items-center gap-1 transition-colors"
                          >
                            ← Prev
                          </button>
                          <span className="font-medium text-foreground">
                            Page {passportPreview?.currentPage ?? 1} of {passportPreview?.pageCount}
                          </span>
                          <button
                            type="button"
                            disabled={renderingPage || (passportPreview?.currentPage ?? 1) >= (passportPreview?.pageCount ?? 1)}
                            onClick={(e) => {
                              e.stopPropagation();
                              changePdfPage((passportPreview?.currentPage ?? 1) + 1);
                            }}
                            className="px-2.5 py-1 rounded hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent font-medium flex items-center gap-1 transition-colors"
                          >
                            Next →
                          </button>
                        </div>
                      )}

                      <div className="mt-2.5 text-center w-full px-2">
                        <p className="max-w-full truncate text-xs font-medium text-foreground">{passportPreview?.name}</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                            🔍 2.4x Lens Active
                          </span>
                          <span className="text-[11px] text-vvisa-text-muted">·</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              passportInputRef.current?.click();
                            }}
                            className="text-[11px] text-primary hover:underline font-medium"
                          >
                            Replace Document
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : passportPreview?.url && passportPreview.type === 'pdf' && traveler.ocrStatus !== 'scanning' ? (
                    <div className="w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                      <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-xl border border-vvisa-border bg-vvisa-bg">
                        <FileText className="h-10 w-10 text-primary" />
                      </div>
                      <p className="max-w-full truncate text-sm font-medium text-foreground">{passportPreview?.name}</p>
                      <p className="text-xs text-vvisa-text-muted mb-2">{passportPreview.renderError ?? 'Preparing PDF preview...'}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          passportInputRef.current?.click();
                        }}
                      >
                        Replace Document
                      </Button>
                    </div>
                  ) : traveler.ocrStatus === 'scanning' ? (
                    <>
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-sm text-primary font-medium mb-1">Scanning with V-Visa AI...</p>
                      <p className="text-xs text-vvisa-text-muted">Extracting passport data</p>
                    </>
                  ) : traveler.ocrStatus === 'done' && traveler.passportFileName ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center mb-2">
                        <Check className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-1">Scan Complete</p>
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
                      <select
                        value={traveler.maritalStatus}
                        onChange={(e) => onUpdate(traveler.id, 'maritalStatus', e.target.value)}
                        className="w-full bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-9 text-sm mt-1 px-3"
                      >
                        <option value="">Select marital status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                      </select>
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
                      {passportValidity.blocksProgress ? (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[11px] leading-4 text-red-700 dark:text-red-300">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                          <span className="font-medium">{passportValidity.message}</span>
                        </div>
                      ) : passportValidity.message ? (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] leading-4 text-amber-700 dark:text-amber-200">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>{passportValidity.message}</span>
                        </div>
                      ) : traveler.dateOfExpiry ? (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Valid for travel date</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {isMinor && (!traveler.guardianApplicantId || !traveler.guardianRelationship) ? (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs leading-5 text-amber-700 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Action Required: Traveller is under 18. Please link a travelling parent or legal guardian below.</span>
                    </div>
                  ) : isMinor && traveler.guardianApplicantId && traveler.guardianRelationship ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Guardian linked for minor applicant ✓</span>
                    </div>
                  ) : null}
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
                          const docDetail = traveler.additionalDocDetails?.[doc.key];
                          const isUploading = Boolean(uploadingDocKeys[doc.key]);

                          return (
                            <div key={doc.key} className="space-y-1.5">
                              <Label className="text-sm text-foreground font-medium">{doc.title}</Label>
                              <p className="text-xs text-vvisa-text-muted">{doc.helper}</p>
                              <input
                                ref={(el) => { docInputRefs.current[doc.key] = el; }}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => handleDocUpload(doc.key, e)}
                              />
                              <div
                                className={`border rounded-lg p-3 flex flex-col justify-between transition-colors min-h-[92px]
                                  ${uploadedName
                                    ? 'border-emerald-500/50 bg-emerald-500/8 dark:bg-emerald-400/10'
                                    : 'border-dashed border-vvisa-border hover:border-primary/50 bg-vvisa-surface cursor-pointer'
                                  }`}
                                onClick={() => {
                                  if (!uploadedName && !isUploading) {
                                    docInputRefs.current[doc.key]?.click();
                                  }
                                }}
                              >
                                {isUploading ? (
                                  <div className="flex flex-col items-center justify-center h-full py-2">
                                    <Loader2 className="h-4 w-4 text-primary animate-spin mb-1" />
                                    <p className="text-xs text-primary font-medium">Uploading...</p>
                                  </div>
                                ) : uploadedName ? (
                                  <div className="flex flex-col justify-between h-full gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[200px]" title={uploadedName}>
                                            {uploadedName}
                                          </p>
                                          {docDetail?.fileSize && (
                                            <span className="text-[10px] text-vvisa-text-muted">
                                              {formatFileSize(docDetail.fileSize)} • Uploaded ✓
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => handleRemoveDoc(doc.key, e)}
                                        className="text-vvisa-text-muted hover:text-red-500 p-1 rounded transition-colors"
                                        title="Remove document"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20 text-xs">
                                      {docDetail?.dataUrl && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenDocPreview(docDetail, doc.key, e)}
                                          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                        >
                                          <Eye className="h-3 w-3" /> View Preview
                                        </button>
                                      )}
                                      <span className="text-vvisa-border text-[10px]">•</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          docInputRefs.current[doc.key]?.click();
                                        }}
                                        className="flex items-center gap-1 text-[11px] text-vvisa-text-secondary hover:text-foreground hover:underline"
                                      >
                                        <RefreshCw className="h-3 w-3" /> Replace
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full py-1">
                                    <Upload className="h-4 w-4 text-vvisa-text-muted mb-1" />
                                    <p className="text-xs text-vvisa-text-secondary font-medium">Click to upload document</p>
                                    <span className="text-[10px] text-vvisa-text-muted">PDF, JPG, PNG (Max 10MB)</span>
                                  </div>
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

      {/* Additional Document Preview Dialog */}
      <Dialog open={Boolean(docPreviewModal)} onOpenChange={(open) => { if (!open) setDocPreviewModal(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-vvisa-border-subtle bg-vvisa-surface shadow-[var(--vvisa-shadow-lg)] p-5">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center justify-between text-base">
              <span className="truncate max-w-[400px]">{docPreviewModal?.fileName}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 flex flex-col items-center">
            {docPreviewModal?.fileType === 'application/pdf' && docPreviewTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mb-3 bg-vvisa-surface-2 px-3 py-1.5 rounded-lg text-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={docPreviewPage <= 1}
                  onClick={() => handleDocPreviewPageChange(-1)}
                  className="h-7 px-2 text-xs"
                >
                  ← Prev
                </Button>
                <span className="text-foreground font-medium">
                  Page {docPreviewPage} of {docPreviewTotalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={docPreviewPage >= docPreviewTotalPages}
                  onClick={() => handleDocPreviewPageChange(1)}
                  className="h-7 px-2 text-xs"
                >
                  Next →
                </Button>
              </div>
            )}

            <div className="w-full flex items-center justify-center border border-vvisa-border rounded-xl bg-slate-950/40 p-2 overflow-hidden min-h-[300px] max-h-[500px]">
              {docPreviewRenderedUrl ? (
                <img
                  src={docPreviewRenderedUrl}
                  alt={docPreviewModal?.fileName || 'Document preview'}
                  className="w-full h-auto max-h-[480px] object-contain block mx-auto rounded-lg select-none"
                />
              ) : (
                <div className="py-12 text-center text-vvisa-text-muted text-sm">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Document preview unavailable</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* --- Helper: Convert File to Base64 --- */
function getOcrErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback;
  const payload = data as { error?: unknown; message?: unknown };
  if (typeof payload.error === 'string') return payload.error;
  if (payload.error && typeof payload.error === 'object') {
    const error = payload.error as { message?: unknown; code?: unknown };
    if (typeof error.message === 'string' && error.message.trim()) return error.message;
    if (typeof error.code === 'string' && error.code.trim()) return error.code;
  }
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  return fallback;
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to read file'));
        return;
      }
      const result = reader.result;
      // Remove the data URL prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) {
        reject(new Error('Unable to read file'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

async function renderPdfPage(file: File, pageNumber = 1): Promise<{ dataUrl: string; pageCount: number }> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageCount = pdf.numPages || 1;
  const safePage = Math.max(1, Math.min(pageNumber, pageCount));
  const page = await pdf.getPage(safePage);
  const viewport = page.getViewport({ scale: 1.7 });
  const canvas = window.document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PDF preview unavailable');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    pageCount,
  };
}

export function populatePassportFromOCR(
  travelerId: string,
  fields: Array<{ field?: unknown; value?: unknown }>,
  onUpdate: (id: string, field: keyof TravelerData, value: TravelerData[keyof TravelerData]) => void
): number {
  let count = 0;
  for (const f of fields) {
    if (!f || typeof f !== 'object') continue;
    const rawField = (f as { field?: unknown }).field;
    const rawValue = (f as { value?: unknown }).value;
    if (!rawValue) continue;

    const key = resolvePassportAutofillField(String(rawField));
    if (!key) continue;

    const value = normalizePassportAutofillValue(key, String(rawValue));
    if (!value) continue;

    onUpdate(travelerId, key as keyof TravelerData, value);
    count++;
  }
  return count;
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
  const { selectedVisaType, setSelectedVisaType, walletBalance, submitApplication, navigate, setApplications, setWalletBalance } = useAppStore();
  const { visaTypes } = useVisaCatalogue();
  const activeVisaType = selectedVisaType ?? readStoredVisaType() ?? visaTypes[0] ?? mockVisaTypes[0];
  const [appType, setAppType] = useState<'individual' | 'group'>('individual');
  const [internalId, setInternalId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    txnId: string;
    appId: string;
    paymentStatus?: 'PAYMENT_PENDING' | 'PAID';
    error?: string;
  } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [walletPaymentLoading, setWalletPaymentLoading] = useState(false);
  const [copiedTxn, setCopiedTxn] = useState(false);
  const [passportOriginCity, setPassportOriginCity] = useState('');
  const [userSelectedCityManually, setUserSelectedCityManually] = useState(false);
  const [residenceState, setResidenceState] = useState('');
  const [residenceCity, setResidenceCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const requiredDocs = useMemo(() => {
    if (!activeVisaType) return [];
    return resolveRequiredAdditionalDocs(activeVisaType);
  }, [activeVisaType]);

  const requiredDocKeys = useMemo(() => requiredDocs.map((d) => d.key), [requiredDocs]);
  const isStickerVisa = activeVisaType?.visaKind === 'STICKER_VISA';
  const stickerRoutes = useMemo(() => {
    if (!activeVisaType || !isStickerVisa) return [];
    return getStandardStickerRoutesForVisa(activeVisaType);
  }, [activeVisaType, isStickerVisa]);

  const [travelers, setTravelers] = useState<TravelerData[]>(() => [createEmptyTraveler(0, requiredDocKeys)]);

  // Individual -> Group: 1 traveler -> Individual, 2+ travelers -> automatically switch to Group
  // Removing travelers switches back to Individual when only 1 traveler remains
  useEffect(() => {
    if (travelers.length >= 2 && appType !== 'group') {
      setAppType('group');
    } else if (travelers.length <= 1 && appType !== 'individual') {
      setAppType('individual');
    }
  }, [travelers.length, appType]);

  // Route city to passport origin city extracted from OCR (Lead Traveler)
  useEffect(() => {
    const leadTravelerPlace = travelers[0]?.placeOfIssue;
    if (leadTravelerPlace && isStickerVisa && !userSelectedCityManually) {
      const resolved = resolveIndianPassportLocation(leadTravelerPlace);
      if (resolved?.normalizedCity) {
        setPassportOriginCity(resolved.normalizedCity);
      }
    }
  }, [travelers, isStickerVisa, userSelectedCityManually]);

  const resolvedPassportLoc = useMemo(
    () => resolveIndianPassportLocation(passportOriginCity || travelers[0]?.placeOfIssue),
    [passportOriginCity, travelers]
  );

  const resolvedStickerRoute = useMemo(() => {
    if (!activeVisaType || !isStickerVisa) return null;
    return resolveStickerSubmissionRoute(activeVisaType, {
      passportOriginCity: passportOriginCity || travelers[0]?.placeOfIssue || undefined,
      residenceCity,
      residenceState,
    });
  }, [activeVisaType, isStickerVisa, passportOriginCity, travelers, residenceCity, residenceState]);

  const jurisdictionRequired = Boolean(activeVisaType?.jurisdictions?.length);
  const jurisdictionResolution = useMemo(
    () => resolveVisaJurisdiction(activeVisaType, {
      residenceCountry: 'India',
      residenceState,
      residenceCity,
      postalCode,
      passportIssueCity: resolvedPassportLoc?.normalizedCity,
      passportIssueState: resolvedPassportLoc?.state,
    }),
    [activeVisaType, postalCode, residenceCity, residenceState, resolvedPassportLoc]
  );
  const jurisdictionBlocksSubmit = jurisdictionResolution.status === 'MANUAL_REVIEW';
  const selectedPassportOriginCity = passportOriginCity || resolvedPassportLoc?.normalizedCity || '';

  const pricingRouteKey = selectedPassportOriginCity || undefined;
  const pricingResult = useMemo(
    () => resolveVisaPricing(activeVisaType, { quantity: travelers.length, routeKey: pricingRouteKey }),
    [activeVisaType, pricingRouteKey, travelers.length]
  );
  const singleTravelerPricingResult = useMemo(
    () => resolveVisaPricing(activeVisaType, { quantity: 1, routeKey: pricingRouteKey }),
    [activeVisaType, pricingRouteKey]
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

  const isTourist = useMemo(() => isTouristVisa(activeVisaType), [activeVisaType]);
  const dateValidationIssues = useMemo(
    () => validateTravelDates(activeVisaType, travelDate, returnDate),
    [activeVisaType, travelDate, returnDate]
  );
  const applicantValidationIssues = useMemo(
    () => validateApplicants(travelers, travelDate),
    [travelers, travelDate]
  );
  const validationIssues = useMemo(
    () => [...dateValidationIssues, ...applicantValidationIssues],
    [dateValidationIssues, applicantValidationIssues]
  );
  const blockingValidationIssues = useMemo(
    () => validationIssues.filter((issue) => issue.blocksSubmit),
    [validationIssues]
  );
  const canSubmit = Boolean(activeVisaType) && blockingValidationIssues.length === 0 && !pricingResult.manualQuotationRequired && !jurisdictionBlocksSubmit;

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
    setTravelers((prev) => {
      const next = prev
        .filter((t) => t.id !== id)
        .map((t) => (t.guardianApplicantId === id ? { ...t, guardianApplicantId: '' } : t));
      if (next.length <= 1) {
        setAppType('individual');
      }
      return next;
    });
  }, []);

  const handleAddTraveler = () => {
    setTravelers((prev) => {
      const next = [...prev, createEmptyTraveler(prev.length, requiredDocKeys)];
      if (next.length >= 2) {
        setAppType('group');
      }
      return next;
    });
  };

  const handleDocumentUploaded = useCallback(() => {
    trackApplyProductIntent({ eventType: 'DOCUMENT_UPLOADED', visa: activeVisaType });
  }, [activeVisaType]);

  const handleSubmit = useCallback(async () => {
    if (!activeVisaType || submitting) return;
    if (blockingValidationIssues.length > 0) {
      const firstIssue = blockingValidationIssues[0];
      if (firstIssue) {
        const el = document.getElementById(`traveler-card-${firstIssue.travelerId}`) || document.getElementById('application-setup-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
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

    const localPayload = {
      internalId,
      groupName: appType === 'group' ? groupName : '',
      destination: activeVisaType.destination,
      visaType: activeVisaType.name,
      visaCategory: activeVisaType.category,
      travelDate,
      returnDate,
      totalPrice: total,
      travelers: travelersPayload,
    };

    if (appType === 'individual' && activeVisaType.id && travelers.length === 1) {
      try {
        const traveler = travelers[0];
        const passportDocument = traveler.passportFileBase64 && traveler.passportFileName && traveler.passportMimeType
          ? {
              fileName: traveler.passportFileName,
              mimeType: traveler.passportMimeType,
              contentBase64: traveler.passportFileBase64,
              providerRequestId: traveler.ocrProviderRequestId || undefined,
              confidence: traveler.ocrConfidence || undefined,
              normalizedExtraction: buildPassportCrmFields(traveler),
            }
          : undefined;
        const response = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visaProductId: activeVisaType.id,
            internalId: internalId || undefined,
            applicants: [{
              firstName: traveler.firstName,
              lastName: traveler.lastName,
              passportNumber: traveler.passportNumber,
              nationality: traveler.nationality || 'Indian',
              sex: traveler.sex || undefined,
              dateOfBirth: traveler.dateOfBirth || undefined,
              placeOfBirth: traveler.placeOfBirth || undefined,
              placeOfIssue: traveler.placeOfIssue || undefined,
              maritalStatus: traveler.maritalStatus || undefined,
              dateOfIssue: traveler.dateOfIssue || undefined,
              dateOfExpiry: traveler.dateOfExpiry || undefined,
              isChild: calculateAge(traveler.dateOfBirth, travelDate || new Date().toISOString().slice(0, 10)) !== null
                ? (calculateAge(traveler.dateOfBirth, travelDate || new Date().toISOString().slice(0, 10)) as number) < 18
                : false,
              passportDocument,
            }],
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.application?.id) {
          setSubmitResult({
            txnId: data.application.internalId || internalId || '',
            appId: data.application.id,
            paymentStatus: (data.application.status === 'PAID' ? 'PAID' : 'PAYMENT_PENDING'),
          });
          fetchPortalApplications().then(setApplications).catch(() => undefined);
          setSubmitting(false);
          return;
        }
        if (!isDemoMode()) {
          setSubmitResult({ txnId: '', appId: '', error: getOcrErrorMessage(data, 'Unable to save application. Please try again.') });
          setSubmitting(false);
          return;
        }
      } catch {
        if (!isDemoMode()) {
          setSubmitResult({ txnId: '', appId: '', error: 'Unable to save application. Please try again.' });
          setSubmitting(false);
          return;
        }
      }
    }

    const result = submitApplication(localPayload);

    if (result.success) {
      setSubmitResult({
        txnId: result.transactionId,
        appId: result.applicationId,
        paymentStatus: 'PAYMENT_PENDING',
      });
    } else {
      setSubmitResult({ txnId: '', appId: '', error: result.error });
    }
    setSubmitting(false);
  }, [activeVisaType, submitting, blockingValidationIssues, travelers, internalId, groupName, appType, total, travelDate, returnDate, submitApplication, setApplications]);

  const handlePayNow = useCallback(async () => {
    if (!submitResult?.appId || paymentLoading) return;
    setPaymentLoading(true);
    setSubmitResult((current) => current ? { ...current, error: undefined } : current);
    try {
      const response = await fetch('/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: submitResult.appId,
          idempotencyKey: `application-payment:${submitResult.appId}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      const checkoutUrl = data.paymentOrder?.providerSessionUrl;
      if (!response.ok || typeof checkoutUrl !== 'string') {
        throw new Error(getOcrErrorMessage(data, 'Unable to create payment session.'));
      }
      const popup = window.open(checkoutUrl, 'vvisa-zoho-payment', 'noopener,noreferrer,width=480,height=720');
      if (!popup) window.location.href = checkoutUrl;
    } catch (error) {
      setSubmitResult((current) => current ? { ...current, error: error instanceof Error ? error.message : 'Unable to create payment session.' } : current);
    } finally {
      setPaymentLoading(false);
    }
  }, [paymentLoading, submitResult?.appId]);

  const handlePayFromWallet = useCallback(async () => {
    if (!submitResult?.appId || walletPaymentLoading) return;
    setWalletPaymentLoading(true);
    setSubmitResult((current) => current ? { ...current, error: undefined } : current);
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: submitResult.appId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getOcrErrorMessage(data, 'Unable to pay from wallet.'));
      if (typeof data.balance === 'number') setWalletBalance(data.balance);
      fetchPortalApplications().then(setApplications).catch(() => undefined);
      setSubmitResult((current) =>
        current
          ? {
              ...current,
              txnId: data.paymentOrder?.id ?? current.txnId,
              paymentStatus: 'PAID',
            }
          : current
      );
    } catch (error) {
      setSubmitResult((current) => current ? { ...current, error: error instanceof Error ? error.message : 'Unable to pay from wallet.' } : current);
    } finally {
      setWalletPaymentLoading(false);
    }
  }, [setApplications, setWalletBalance, submitResult?.appId, walletPaymentLoading]);

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
      <Card id="application-setup-section" className="vv-surface-elevated rounded-xl border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-vvisa-text-secondary font-medium">Are You Applying For</Label>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {appType === 'group' ? `Group (${travelers.length} Travelers)` : 'Individual (1 Traveler)'}
                </span>
              </div>
              <ToggleGroup
                type="single"
                value={appType}
                onValueChange={(val) => {
                  if (val) setAppType(val as 'individual' | 'group');
                }}
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
                  Group {travelers.length > 1 ? `(${travelers.length})` : ''}
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
                  placeholder={`e.g. Tour Group (${travelers.length} Travelers)`}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-vvisa-text-secondary font-medium">
                  Travelling / Departure Date {isTourist && <span className="text-red-500 font-bold">*</span>}
                </Label>
                {!isTourist && (
                  <span className="text-[10px] text-vvisa-text-muted">Optional</span>
                )}
              </div>
              <Input
                type="date"
                value={travelDate}
                onChange={(e) => handleTravelDateChange(e.target.value)}
                className={`bg-vvisa-bg border rounded-lg text-foreground h-10 ${
                  isTourist && !travelDate ? 'border-amber-500/60 focus:border-amber-500' : 'border-vvisa-border focus:border-primary'
                }`}
              />
              {isTourist && !travelDate && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Mandatory for tourist visa</p>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-vvisa-text-secondary font-medium">
                  Return Date {isTourist && <span className="text-red-500 font-bold">*</span>}
                </Label>
                {!isTourist && (
                  <span className="text-[10px] text-vvisa-text-muted">Optional</span>
                )}
              </div>
              <Input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={travelDate || undefined}
                className={`bg-vvisa-bg border rounded-lg text-foreground h-10 ${
                  isTourist && !returnDate ? 'border-amber-500/60 focus:border-amber-500' : 'border-vvisa-border focus:border-primary'
                }`}
              />
              {isTourist && !returnDate && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Mandatory for tourist visa</p>
              )}
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
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    VAC
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Passport Origin City & Physical Submission Hub
                    </h4>
                    <p className="text-[11px] text-vvisa-text-secondary">
                      Sticker visas require physical passport submission and biometric appointment at the assigned centre.
                    </p>
                  </div>
                </div>
                {resolvedStickerRoute?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Route Verified ✓
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-foreground mb-1.5 block font-medium">
                    Passport Origin City (Place of Issue)
                  </Label>
                  <select
                    value={passportOriginCity}
                    onChange={(event) => {
                      setUserSelectedCityManually(true);
                      setPassportOriginCity(event.target.value);
                    }}
                    className="h-10 w-full rounded-lg border border-vvisa-border bg-vvisa-surface px-3 text-sm text-foreground shadow-[var(--vvisa-shadow-sm)] focus:border-primary focus:outline-none"
                  >
                    <option value="">Auto-detect from OCR / Choose city</option>
                    {stickerRoutes.map((route) => (
                      <option key={route.id} value={route.origin}>
                        {route.originCityLabel ?? route.origin}
                      </option>
                    ))}
                  </select>
                  {resolvedPassportLoc && (
                    <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3 inline" />
                      Detected from passport: {resolvedPassportLoc.normalizedCity}
                      {resolvedPassportLoc.state !== 'Other India' ? `, ${resolvedPassportLoc.state}` : ''}
                      {resolvedPassportLoc.rpo ? ` (RPO: ${resolvedPassportLoc.rpo})` : ''}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-vvisa-border bg-vvisa-surface/80 p-3 text-xs space-y-1.5">
                  {resolvedStickerRoute ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-vvisa-text-muted">Assigned Centre:</span>
                        <span className="font-semibold text-foreground text-right">{resolvedStickerRoute.submissionCentreName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-vvisa-text-muted">Submission City:</span>
                        <span className="font-medium text-foreground">{resolvedStickerRoute.submissionCity}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-vvisa-text-muted">Routing Policy:</span>
                        <span className="font-medium text-foreground capitalize">
                          {resolvedStickerRoute.routingBasis.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </div>
                      {resolvedStickerRoute.submissionCentreAddress && (
                        <p className="text-[11px] text-vvisa-text-secondary pt-1 border-t border-vvisa-border/60">
                          📍 {resolvedStickerRoute.submissionCentreAddress}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-vvisa-text-muted">Select an origin city or scan passport to preview assigned submission centre.</p>
                  )}
                </div>
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

          {blockingValidationIssues.length > 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-900 dark:text-amber-100">
              <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Action Required Before Review ({blockingValidationIssues.length})</span>
              </div>
              <ul className="space-y-1 pl-6 list-disc text-[11px] leading-relaxed">
                {blockingValidationIssues.map((issue) => (
                  <li key={`${issue.travelerId}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>All details verified & ready for review ✓</span>
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
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {appType === 'group' ? `Group (${travelers.length} Travelers)` : 'Individual'}
                  </span>
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

                {blockingValidationIssues.length > 0 ? (
                  <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-900 dark:text-amber-100">
                    <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Action Required ({blockingValidationIssues.length})</span>
                    </div>
                    <ul className="space-y-1 pl-5 list-disc text-[11px] leading-relaxed">
                      {blockingValidationIssues.map((issue) => (
                        <li key={`${issue.travelerId}-${issue.message}`}>{issue.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Application Ready ✓</span>
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

                {submitResult?.appId && !submitResult.error ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handlePayNow}
                      disabled={paymentLoading}
                      className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 flex items-center justify-center gap-2 text-sm"
                    >
                      {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {paymentLoading ? 'Opening Payment...' : 'Pay Now'} <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handlePayFromWallet}
                      disabled={walletPaymentLoading || walletBalance < total}
                      className="w-full bg-vvisa-surface-2 border border-vvisa-border hover:bg-vvisa-border disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-lg h-10 flex items-center justify-center gap-2 text-sm"
                    >
                      {walletPaymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Pay from Wallet
                    </Button>
                    {walletBalance < total && (
                      <p className="text-[11px] leading-4 text-amber-700 dark:text-amber-200">
                        Wallet balance is low. Use Pay Now or add funds.
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !canSubmit}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg h-10 flex items-center justify-center gap-2 text-sm"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {submitting ? 'Submitting...' : 'Review and Save'} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
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
                    <div className="w-14 h-14 rounded-full bg-red-500/14 dark:bg-red-400/15 flex items-center justify-center">
                      <X className="h-7 w-7 text-red-700 dark:text-red-300" />
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
                  {submitResult.paymentStatus === 'PAID' ? (
                    <>
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/14 dark:bg-emerald-400/15 flex items-center justify-center">
                          <CheckCircle2 className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground text-center mb-1">
                        Payment Completed — Application Submitted
                      </h3>
                      <p className="text-xs text-vvisa-text-muted text-center mb-5">
                        Payment confirmed. Your application is queued for visa processing.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-14 h-14 rounded-full bg-amber-500/14 dark:bg-amber-400/15 flex items-center justify-center">
                          <Clock className="h-7 w-7 text-amber-700 dark:text-amber-400" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground text-center mb-1">
                        Application Ready for Payment
                      </h3>
                      <p className="text-xs text-vvisa-text-muted text-center mb-5">
                        Application draft saved. Complete payment to submit for processing.
                      </p>
                    </>
                  )}

                  {/* Transaction / Reference ID */}
                  <div className="bg-vvisa-bg border border-vvisa-border rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="text-xs text-vvisa-text-secondary font-medium">Application Reference ID</span>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        submitResult.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {submitResult.paymentStatus === 'PAID' ? '✓ Paid' : '⏳ Payment Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="vv-tabular break-all text-sm text-foreground">{submitResult.txnId}</code>
                      <button
                        onClick={copyTxnId}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-vvisa-surface-2 transition-colors"
                        title="Copy Reference ID"
                      >
                        {copiedTxn ? (
                          <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
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
                      <p className="text-vvisa-text-muted">Wallet Balance</p>
                      <p className="vv-tabular mt-0.5 font-medium text-emerald-500">{formatINR(walletBalance)}</p>
                    </div>
                  </div>

                  {submitResult.paymentStatus !== 'PAID' && (
                    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        onClick={handlePayNow}
                        disabled={paymentLoading}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg h-10 text-sm"
                      >
                        {paymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {paymentLoading ? 'Opening...' : 'Pay with Zoho Payments'}
                      </Button>
                      <Button
                        onClick={handlePayFromWallet}
                        disabled={walletPaymentLoading || walletBalance < total}
                        className="bg-vvisa-surface-2 border border-vvisa-border hover:bg-vvisa-border disabled:opacity-50 text-foreground rounded-lg h-10 text-sm"
                        title={walletBalance < total ? 'Insufficient wallet balance' : 'Pay instantly from wallet'}
                      >
                        {walletPaymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {walletBalance < total ? 'Low Balance (Pay Online)' : 'Pay from Wallet'}
                      </Button>
                    </div>
                  )}

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
                      {submitResult.paymentStatus === 'PAID' ? 'Submit Another' : 'Close'}
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

