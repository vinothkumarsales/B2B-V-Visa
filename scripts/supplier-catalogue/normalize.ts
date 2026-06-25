import type {
  EntryType,
  ImportMode,
  NormalizedSupplierProduct,
  SupplierImportSource,
  SupplierProductInput,
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
  const title = normalizeText(product.title) || `${destinationCountry} ${visaType}`;
  const supplierProductId =
    normalizeText(product.supplierProductId) ||
    `${source.supplier.id}-${slugify(title)}-${index + 1}`;
  const destinationSlug = slugify(destinationCountry);
  const visaTypeSlug = slugify(visaType);
  const entryType = normalizeEntryType(product.entryType);

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
    visaTypeSlug,
    title,
    entryType,
    validityDays: normalizeNumber(product.validityDays),
    stayDays: normalizeNumber(product.stayDays),
    processingTime: normalizeNullableText(product.processingTime),
    currency: normalizeCurrency(product.currency),
    netPrice: normalizeMoney(product.netPrice),
    documents: normalizeDocuments(product.documents),
    sourceUrl: normalizeNullableText(product.sourceUrl),
    sourceCapturedAt: source.capturedAt,
    sourceMode: mode,
    importStatus: "ready_for_review",
    reviewNotes: [],
  };
}

function normalizeEntryType(value?: string): EntryType {
  const text = normalizeText(value).toLowerCase();
  if (text.includes("single")) return "single";
  if (text.includes("multiple")) return "multiple";
  return "unknown";
}

function normalizeCurrency(value?: string): string {
  return (normalizeText(value) || "INR").toUpperCase();
}

function normalizeDocuments(value?: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeText).filter(Boolean)));
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
