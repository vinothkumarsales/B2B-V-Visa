import { createHash } from "node:crypto";
import type {
  DocumentStatus,
  EntryType,
  ImportMode,
  NormalizedSupplierProduct,
  SupplierDocument,
  SupplierImportSource,
  SupplierPriceLine,
  SupplierProductInput,
  VisaKind,
} from "./types.ts";

const COUNTRY_ALIASES: Record<string, string> = {
  uae: "United Arab Emirates",
  dubai: "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
};

const DOCUMENT_STATUS_VALUES = new Set<DocumentStatus>([
  "MANDATORY",
  "CONDITIONAL",
  "OPTIONAL",
  "INFORMATIONAL",
  "REVIEW_REQUIRED",
]);

export function normalizeProducts(
  source: SupplierImportSource,
  mode: ImportMode,
): NormalizedSupplierProduct[] {
  return source.products.map((product, index) =>
    normalizeProduct(product, source, mode, index),
  );
}

export function normalizeCountry(value?: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return "Unknown";
  return COUNTRY_ALIASES[normalized.toLowerCase()] ?? normalized;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProduct(
  product: SupplierProductInput,
  source: SupplierImportSource,
  mode: ImportMode,
  index: number,
): NormalizedSupplierProduct {
  const destinationCountry = normalizeCountry(product.destinationCountry);
  const destinationIsoCode = normalizeNullableText(product.destinationIsoCode);
  const visaType = normalizeText(product.visaType) || "Unknown";
  const classificationEvidence = normalizeClassificationEvidence(product.classificationEvidence);
  const visaKind = normalizeVisaKind(visaType, product, classificationEvidence);
  const title = normalizeText(product.title) || `${destinationCountry} ${visaType}`;
  const supplierProductId =
    normalizeText(product.supplierProductId) ||
    `${source.supplier.id}-${slugify(title)}-${index + 1}`;
  const destinationSlug = slugify(destinationCountry);
  const visaTypeSlug = slugify(visaType);
  const entryType = normalizeEntryType(product.entryType);
  const validityDays = normalizeNumber(product.validityDays);
  const stayDays = normalizeNumber(product.stayDays);
  const durationLabel = buildDurationLabel(validityDays, stayDays);
  const processingTime = normalizeNullableText(product.processingTime);
  const processingWindow = parseProcessingWindow(
    processingTime,
    normalizeNumber(product.processingTimeMinDays),
    normalizeNumber(product.processingTimeMaxDays),
  );
  const documents = normalizeDocuments(product.documents);
  const priceLines = normalizePriceLines(product.priceLines, product.currency);
  const submissionCity = normalizeNullableText(product.submissionCity);
  const collectionCity = normalizeNullableText(product.collectionCity);
  const routeCities = normalizeRouteCities(product.routeCities);
  const routingSummary = buildRoutingSummary(submissionCity, collectionCity, routeCities);
  const currency = normalizeCurrency(product.currency);
  const netPrice = normalizeMoney(product.netPrice);
  const visaFeeMinor = normalizeMinor(product.visaFeeMinor);
  const vfsFeeMinor = normalizeMinor(product.vfsFeeMinor);
  const supplierServiceFeeMinor = normalizeMinor(product.supplierServiceFeeMinor);
  const courierFeeMinor = normalizeMinor(product.courierFeeMinor);
  const otherFeeMinor = normalizeMinor(product.otherFeeMinor);
  const gstMinor = normalizeMinor(product.gstMinor);
  const finalDisplayedTotalMinor = normalizeMinor(product.finalDisplayedTotalMinor) ||
    normalizePriceTotalMinor(priceLines) ||
    minorFromMajor(netPrice);
  const available = normalizeBoolean(product.available);
  const normalizedProductKey = [
    source.supplier.id,
    supplierProductId,
    destinationIsoCode ?? destinationSlug,
    slugify(normalizeText(product.visaCategory)),
    visaKind,
    entryType,
    validityDays ?? "validity-unknown",
    stayDays ?? "stay-unknown",
    processingWindow.min ?? "processing-unknown",
  ].join(":");
  const identityPayload = {
    supplierId: source.supplier.id,
    supplierProductId,
    destinationSlug,
    visaTypeSlug,
    entryType,
    stayDays,
  };
  const commercialPayload = {
    currency,
    netPrice,
    visaFeeMinor,
    vfsFeeMinor,
    supplierServiceFeeMinor,
    courierFeeMinor,
    otherFeeMinor,
    gstMinor,
    finalDisplayedTotalMinor,
    priceLines,
  };
  const documentsPayload = documents.map((document) => ({
    name: document.name,
    status: document.status,
    condition: document.condition,
    note: document.note,
    acceptedFormats: document.acceptedFormats,
  }));
  const processingPayload = {
    validityDays,
    visaValidityLabel: normalizeNullableText(product.visaValidityLabel),
    stayDays,
    maximumStayLabel: normalizeNullableText(product.maximumStayLabel),
    durationLabel,
    processingTime,
    processingDaysMin: processingWindow.min,
    processingDaysMax: processingWindow.max,
    minimumPassportValidityMonths: normalizeNumber(product.minimumPassportValidityMonths),
    passportValidityBasis: normalizePassportValidityBasis(product.passportValidityBasis),
    rawPassportValidityRule: normalizeNullableText(product.rawPassportValidityRule),
    passportValidityReviewRequired: Boolean(product.passportValidityReviewRequired),
  };
  const stickerRoutes = normalizeStickerRoutes(product.stickerRoutes, supplierProductId, routeCities);
  const routingPayload = {
    stickerRequired: normalizeBoolean(product.stickerRequired),
    courierRequired: normalizeBoolean(product.courierRequired),
    submissionCity,
    collectionCity,
    routeCities,
    stickerRoutes,
    routingSummary,
  };
  const contentPayload = {
    title,
    destinationCountry,
    visaType,
    visaKind,
    entryType,
    available,
    commercialPayload,
    documentsPayload,
    processingPayload,
    routingPayload,
  };

  return {
    catalogueKey: [
      source.supplier.id,
      destinationSlug,
      visaTypeSlug,
      stayDays ?? "stay-unknown",
      entryType,
    ].join(":"),
    normalizedProductKey,
    identityHash: stableHash(identityPayload),
    contentHash: stableHash(contentPayload),
    commercialHash: stableHash(commercialPayload),
    documentsHash: stableHash(documentsPayload),
    processingHash: stableHash(processingPayload),
    routingHash: stableHash(routingPayload),
    supplierId: source.supplier.id,
    supplierName: source.supplier.name,
    supplierProductId,
    sourceReference: normalizeNullableText(product.sourceReference),
    destinationCountry,
    destinationIsoCode,
    destinationSlug,
    travelPurpose: normalizeNullableText(product.travelPurpose),
    visaType,
    visaKind,
    visaCategory: normalizeNullableText(product.visaCategory),
    visaTypeSlug,
    title,
    entryType,
    validityDays,
    visaValidityLabel: normalizeNullableText(product.visaValidityLabel),
    stayDays,
    maximumStayLabel: normalizeNullableText(product.maximumStayLabel),
    durationLabel,
    processingTime,
    processingDaysMin: processingWindow.min,
    processingDaysMax: processingWindow.max,
    minimumPassportValidityMonths: normalizeNumber(product.minimumPassportValidityMonths),
    passportValidityBasis: normalizePassportValidityBasis(product.passportValidityBasis),
    rawPassportValidityRule: normalizeNullableText(product.rawPassportValidityRule),
    passportValidityReviewRequired: Boolean(product.passportValidityReviewRequired),
    physicalSubmissionRequired: Boolean(product.physicalSubmissionRequired ?? product.stickerRequired),
    originalPassportRequired: Boolean(product.originalPassportRequired ?? product.stickerRequired),
    biometricRequired: Boolean(product.biometricRequired),
    appointmentRequired: Boolean(product.appointmentRequired),
    visaApplicationCentreRequired: Boolean(product.visaApplicationCentreRequired),
    passportCollectionAvailable: Boolean(product.passportCollectionAvailable),
    physicalSubmissionInstructions: normalizeNullableText(product.physicalSubmissionInstructions),
    currency,
    netPrice,
    visaFeeMinor,
    vfsFeeMinor,
    supplierServiceFeeMinor,
    courierFeeMinor,
    otherFeeMinor,
    gstMinor,
    finalDisplayedTotalMinor,
    pricingCapturedAt: source.capturedAt,
    available,
    classificationEvidence,
    documents,
    mandatoryDocuments: documents.filter((document) => document.status === "MANDATORY"),
    conditionalDocuments: documents.filter((document) => document.status === "CONDITIONAL"),
    optionalDocuments: documents.filter((document) => document.status === "OPTIONAL"),
    informationalDocuments: documents.filter((document) => document.status === "INFORMATIONAL"),
    reviewRequiredDocuments: documents.filter((document) => document.status === "REVIEW_REQUIRED"),
    stickerRequired: routingPayload.stickerRequired,
    courierRequired: routingPayload.courierRequired,
    submissionCity,
    collectionCity,
    routeCities,
    stickerRoutes,
    routingSummary,
    priceLines,
    sourceUrl: normalizeNullableText(product.sourceUrl),
    sourceCapturedAt: source.capturedAt,
    sourceLastCheckedAt: new Date().toISOString(),
    sourceMode: mode,
    importStatus: "NORMALIZED",
    reviewStatus: "NORMALIZED",
    changeDetectionStatus: "NEW_PRODUCT",
    reviewNotes: [],
  };
}

function normalizeVisaKind(
  value: string | undefined,
  product: SupplierProductInput,
  evidence: ReturnType<typeof normalizeClassificationEvidence>,
): VisaKind {
  const text = [
    value,
    product.title,
    product.physicalSubmissionInstructions,
    product.rawPassportValidityRule,
    ...evidence.map((item) => item.matchedText),
  ].map((entry) => normalizeText(entry).toLowerCase()).join(" ");

  if (
    product.originalPassportRequired ||
    product.physicalSubmissionRequired ||
    product.stickerRequired ||
    /\bsticker\b|original passport|passport submission|physical passport|courier passport|visa application centre/.test(text)
  ) {
    return "STICKER_VISA";
  }
  if (/\beta\b/.test(text)) return "ETA";
  if (/visa on arrival|arrival visa/.test(text)) return "VISA_ON_ARRIVAL";
  if (/e-visa|evisa|electronic visa|entri/.test(text)) return "E_VISA";
  if (text.trim()) return "OTHER";
  return "REVIEW_REQUIRED";
}

function normalizeEntryType(value?: string): EntryType {
  const text = normalizeText(value).toLowerCase();
  if (text.includes("single")) return "SINGLE";
  if (text.includes("double")) return "DOUBLE";
  if (text.includes("multiple")) return "MULTIPLE";
  return "NOT_SPECIFIED";
}

function normalizeCurrency(value?: string): string {
  return (normalizeText(value) || "INR").toUpperCase();
}

function normalizeDocuments(value?: SupplierProductInput["documents"]): SupplierDocument[] {
  if (!Array.isArray(value)) return [];
  const byName = new Map<string, SupplierDocument>();

  for (const item of value) {
    const document = typeof item === "string"
      ? {
          name: normalizeText(item),
          status: "MANDATORY" as DocumentStatus,
          mandatory: true,
          condition: null,
          note: null,
          acceptedFormats: [],
        }
      : normalizeDocumentObject(item);

    if (document.name) byName.set(document.name.toLowerCase(), document);
  }

  return Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeDocumentObject(item: Exclude<SupplierProductInput["documents"], undefined>[number]): SupplierDocument {
  if (typeof item === "string") {
    return {
      name: normalizeText(item),
      status: "MANDATORY",
      mandatory: true,
      condition: null,
      note: null,
      acceptedFormats: [],
    };
  }

  const condition = normalizeNullableText(item.condition);
  const status = normalizeDocumentStatus(item.status, item.mandatory, condition);

  return {
    name: normalizeText(item.name),
    status,
    mandatory: status === "MANDATORY",
    condition,
    note: normalizeNullableText(item.note),
    description: normalizeNullableText(item.description),
    sourceGroup: normalizeNullableText(item.sourceGroup),
    sourceText: normalizeNullableText(item.sourceText),
    uploadRequired: item.uploadRequired !== false && status !== "INFORMATIONAL",
    originalRequired: Boolean(item.originalRequired),
    carryToAppointment: Boolean(item.carryToAppointment),
    courierRequired: Boolean(item.courierRequired),
    biometricRelated: Boolean(item.biometricRelated),
    acceptedFormats: normalizeStringList(item.acceptedFormats),
  };
}

function normalizeDocumentStatus(
  status: string | undefined,
  mandatory: boolean | undefined,
  condition: string | null,
): DocumentStatus {
  const normalized = normalizeText(status).toUpperCase().replace(/[\s-]+/g, "_");
  if (DOCUMENT_STATUS_VALUES.has(normalized as DocumentStatus)) return normalized as DocumentStatus;
  if (mandatory === true) return condition ? "CONDITIONAL" : "MANDATORY";
  if (mandatory === false) return condition ? "CONDITIONAL" : "OPTIONAL";
  return condition ? "CONDITIONAL" : "REVIEW_REQUIRED";
}

function normalizePriceLines(
  value?: SupplierProductInput["priceLines"],
  fallbackCurrency?: string,
): SupplierPriceLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((line, index) => ({
    code: normalizePriceLineCode(line.code),
    label: normalizeText(line.label) || `Price line ${index + 1}`,
    amount: normalizeMoney(line.amount),
    currency: normalizeCurrency(line.currency ?? fallbackCurrency),
    included: line.included !== false,
    taxable: Boolean(line.taxable),
    perApplicant: line.perApplicant !== false,
  })).sort((left, right) => left.label.localeCompare(right.label));
}

function normalizePriceLineCode(value?: string): SupplierPriceLine["code"] {
  const normalized = normalizeText(value).toUpperCase().replace(/[\s-]+/g, "_");
  const allowed = new Set<SupplierPriceLine["code"]>([
    "VISA_FEE",
    "VFS_FEE",
    "SERVICE_FEE",
    "COURIER_FEE",
    "ROUTE_SERVICE_ADJUSTMENT",
    "OTHER_FEE",
    "DISCOUNT",
    "GST",
  ]);
  return allowed.has(normalized as SupplierPriceLine["code"])
    ? normalized as SupplierPriceLine["code"]
    : "OTHER_FEE";
}

function normalizeRouteCities(value?: string[]): string[] {
  return normalizeStringList(value);
}

function normalizeStringList(value?: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeText).filter(Boolean))).sort();
}

function normalizeBoolean(value?: boolean): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeMoney(value?: number | string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toFixed(2));
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function normalizeMinor(value?: number | string): number {
  const parsed = normalizeMoney(value);
  return parsed === null ? 0 : Math.round(parsed);
}

function minorFromMajor(value: number | null): number {
  return value === null ? 0 : Math.round(value * 100);
}

function normalizePriceTotalMinor(lines: SupplierPriceLine[]): number {
  return lines.reduce((sum, line) => sum + (line.included && line.amount ? Math.round(line.amount) : 0), 0);
}

function normalizeNumber(value?: number | string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function normalizeNullableText(value?: string): string | null {
  return normalizeText(value) || null;
}

function normalizeText(value?: string): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildDurationLabel(validityDays: number | null, stayDays: number | null): string | null {
  if (validityDays === null && stayDays === null) return null;
  if (validityDays === null) return `${stayDays} day stay`;
  if (stayDays === null) return `${validityDays} day validity`;
  return `${stayDays} day stay / ${validityDays} day validity`;
}

function parseProcessingWindow(
  value: string | null,
  explicitMin: number | null = null,
  explicitMax: number | null = null,
): { min: number | null; max: number | null } {
  if (explicitMin !== null || explicitMax !== null) {
    return { min: explicitMin, max: explicitMax ?? explicitMin };
  }
  if (!value) return { min: null, max: null };
  const numbers = Array.from(value.matchAll(/\d+/g)).map((match) => Number(match[0]));
  if (numbers.length === 0) return { min: null, max: null };
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function normalizePassportValidityBasis(value?: string): import("./types.ts").PassportValidityBasis {
  const normalized = normalizeText(value).toUpperCase().replace(/[\s-]+/g, "_");
  const allowed = new Set<import("./types.ts").PassportValidityBasis>([
    "FROM_APPLICATION_DATE",
    "FROM_TRAVEL_DATE",
    "FROM_ARRIVAL_DATE",
    "FROM_RETURN_DATE",
    "FROM_DESTINATION_DEPARTURE",
    "UNKNOWN",
  ]);
  return allowed.has(normalized as import("./types.ts").PassportValidityBasis)
    ? normalized as import("./types.ts").PassportValidityBasis
    : "UNKNOWN";
}

function normalizeClassificationEvidence(
  value?: SupplierProductInput["classificationEvidence"],
): import("./types.ts").ClassificationEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    matchedText: normalizeText(item.matchedText),
    sourceSection: normalizeText(item.sourceSection) || "unknown",
    confidence: item.confidence === "HIGH" || item.confidence === "MEDIUM" || item.confidence === "LOW"
      ? item.confidence
      : "LOW",
  })).filter((item) => item.matchedText);
}

function normalizeStickerRoutes(
  routes: SupplierProductInput["stickerRoutes"],
  visaProductId: string,
  routeCities: string[],
): import("./types.ts").NormalizedStickerRoute[] {
  if (Array.isArray(routes) && routes.length > 0) {
    return routes.map((route, index) => {
      const code = normalizeCityCode(route.originCityCode ?? route.originCityLabel ?? `ROUTE_${index + 1}`);
      return {
        id: normalizeText(route.id) || `${visaProductId}-${code.toLowerCase()}`,
        visaProductId,
        originCityCode: code,
        originCityLabel: normalizeText(route.originCityLabel) || labelFromCode(code),
        processingCentreCity: normalizeText(route.processingCentreCity) || "Manual review",
        processingCentreAddress: normalizeNullableText(route.processingCentreAddress) ?? undefined,
        courierFeeMinor: normalizeMinor(route.courierFeeMinor),
        serviceFeeAdjustmentMinor: normalizeMinor(route.serviceFeeAdjustmentMinor),
        estimatedOutboundDays: normalizeNumber(route.estimatedOutboundDays) ?? undefined,
        estimatedReturnDays: normalizeNumber(route.estimatedReturnDays) ?? undefined,
        isActive: route.isActive !== false,
      };
    });
  }

  return routeCities.map((city) => {
    const code = normalizeCityCode(city);
    return {
      id: `${visaProductId}-${code.toLowerCase()}`,
      visaProductId,
      originCityCode: code,
      originCityLabel: labelFromCode(code),
      processingCentreCity: "Manual review",
      courierFeeMinor: 0,
      serviceFeeAdjustmentMinor: 0,
      isActive: true,
    };
  });
}

function normalizeCityCode(value: string): string {
  return normalizeText(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "OTHER_INDIA";
}

function labelFromCode(value: string): string {
  return value.split("_").map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`).join(" ");
}

function buildRoutingSummary(
  submissionCity: string | null,
  collectionCity: string | null,
  routeCities: string[],
): string | null {
  const parts = [
    submissionCity ? `submit:${submissionCity}` : null,
    collectionCity ? `collect:${collectionCity}` : null,
    routeCities.length > 0 ? `route:${routeCities.join(",")}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : null;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
