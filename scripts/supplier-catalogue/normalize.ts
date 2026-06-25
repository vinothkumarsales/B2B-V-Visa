import type {
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
  const visaType = normalizeText(product.visaType) || "Unknown";
  const visaKind = normalizeVisaKind(visaType);
  const title = normalizeText(product.title) || `${destinationCountry} ${visaType}`;
  const supplierProductId =
    normalizeText(product.supplierProductId) ||
    `${source.supplier.id}-${slugify(title)}-${index + 1}`;
  const destinationSlug = slugify(destinationCountry);
  const visaTypeSlug = slugify(visaType);
  const entryType = normalizeEntryType(product.entryType);
  const documents = normalizeDocuments(product.documents);

  return {
    catalogueKey: [
      source.supplier.id,
      destinationSlug,
      visaTypeSlug,
      normalizeNumber(product.stayDays) ?? "stay-unknown",
      entryType,
    ].join(":"),
    supplierId: source.supplier.id,
    supplierName: source.supplier.name,
    supplierProductId,
    destinationCountry,
    destinationSlug,
    visaType,
    visaKind,
    visaTypeSlug,
    title,
    entryType,
    validityDays: normalizeNumber(product.validityDays),
    stayDays: normalizeNumber(product.stayDays),
    processingTime: normalizeNullableText(product.processingTime),
    currency: normalizeCurrency(product.currency),
    netPrice: normalizeMoney(product.netPrice),
    documents,
    mandatoryDocuments: documents.filter((document) => document.mandatory),
    optionalDocuments: documents.filter((document) => !document.mandatory),
    stickerRequired: normalizeBoolean(product.stickerRequired),
    courierRequired: normalizeBoolean(product.courierRequired),
    submissionCity: normalizeNullableText(product.submissionCity),
    collectionCity: normalizeNullableText(product.collectionCity),
    routeCities: normalizeRouteCities(product.routeCities),
    priceLines: normalizePriceLines(product.priceLines, product.currency),
    sourceUrl: normalizeNullableText(product.sourceUrl),
    sourceCapturedAt: source.capturedAt,
    sourceMode: mode,
    importStatus: "ready_for_review",
    reviewStatus: "ready_for_review",
    changeDetectionStatus: "NEW_PRODUCT",
    reviewNotes: [],
  };
}

function normalizeVisaKind(value?: string): VisaKind {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "unknown";
  if (text.includes("business")) return "business";
  if (text.includes("transit")) return "transit";
  if (text.includes("student")) return "student";
  if (text.includes("work") || text.includes("employment")) return "work";
  if (text.includes("e-visa") || text.includes("evisa") || text.includes("entri")) return "evisa";
  if (text.includes("tourist") || text.includes("visit")) return "tourist";
  return "unknown";
}

function normalizeEntryType(value?: string): EntryType {
  const text = normalizeText(value).toLowerCase();
  if (text.includes("single")) return "single";
  if (text.includes("double")) return "double";
  if (text.includes("multiple")) return "multiple";
  return "unknown";
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
          mandatory: true,
          note: null,
          acceptedFormats: [],
        }
      : {
          name: normalizeText(item.name),
          mandatory: item.mandatory !== false,
          note: normalizeNullableText(item.note),
          acceptedFormats: normalizeStringList(item.acceptedFormats),
        };

    if (document.name) byName.set(document.name.toLowerCase(), document);
  }

  return Array.from(byName.values());
}

function normalizePriceLines(
  value?: SupplierProductInput["priceLines"],
  fallbackCurrency?: string,
): SupplierPriceLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((line, index) => ({
    label: normalizeText(line.label) || `Price line ${index + 1}`,
    amount: normalizeMoney(line.amount),
    currency: normalizeCurrency(line.currency ?? fallbackCurrency),
    included: line.included !== false,
  }));
}

function normalizeRouteCities(value?: string[]): string[] {
  return normalizeStringList(value);
}

function normalizeStringList(value?: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeText).filter(Boolean)));
}

function normalizeBoolean(value?: boolean): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeMoney(value?: number | string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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
