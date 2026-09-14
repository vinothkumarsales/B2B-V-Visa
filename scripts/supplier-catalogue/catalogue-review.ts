import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { productionApprovedProducts } from "../../src/lib/production-approved-products.ts";
import { stampMyVisaApprovedProducts } from "../../src/lib/stampmyvisa-approved-products.ts";
import type { ApprovedVisaProduct } from "../../src/types/index.ts";

const generatedAt = new Date().toISOString();
const output = resolve("data", "supplier-imports", "review", "catalogue-v1-proof.review.json");
const products = [...stampMyVisaApprovedProducts, ...productionApprovedProducts];

const review = {
  metadata: {
    generatedAt,
    version: "catalogue-v1-proof",
    status: "REVIEW_REQUIRED",
    activeSuppliers: ["stampmyvisa", "visa2fly"],
    officialVerification: "required-before-final-filing",
  },
  summary: summarize(products),
  sourceReferences: [
    "StampMyVisa approved demo catalogue seed",
    "Visa2Fly public reference: https://visa2fly.com/",
    "Visa2Fly UK public reference: https://visa2fly.com/visa/united-kingdom/180-days-multiple-entry",
  ],
  newProducts: products.map((product) => ({
    id: product.id,
    destination: product.destination,
    name: product.name,
    visaKind: product.visaKind,
    entryType: product.entryType,
    status: product.status,
  })),
  changedProducts: [],
  removedOrUnavailableProducts: [],
  visaTypeChanges: [],
  priceChanges: [],
  documentChanges: products
    .filter((product) => countDocuments(product) > 0)
    .map((product) => ({
      id: product.id,
      mandatory: product.documentRequirements?.mandatory?.length ?? product.documents?.length ?? 0,
      conditional: product.documentRequirements?.conditional?.length ?? 0,
      optional: product.documentRequirements?.optional?.length ?? 0,
      informational: product.documentRequirements?.informational?.length ?? 0,
    })),
  courierAndRouteChanges: products
    .filter((product) => product.courierRules || product.stickerRoutes?.length || product.jurisdictions?.length)
    .map((product) => ({
      id: product.id,
      stickerRoutes: product.stickerRoutes?.length ?? product.courierRules?.routes?.length ?? 0,
      jurisdictions: product.jurisdictions?.length ?? 0,
      verificationRequired: product.jurisdictions?.some((rule) => rule.verificationStatus === "REVIEW_REQUIRED") ?? false,
    })),
  uncertainFields: products.flatMap((product) =>
    (product.jurisdictions ?? [])
      .filter((rule) => rule.verificationStatus === "REVIEW_REQUIRED")
      .map((rule) => ({
        productId: product.id,
        field: "jurisdiction",
        ruleId: rule.id,
        status: "REVIEW_REQUIRED",
        note: rule.sourceText,
      })),
  ),
  supplierConflicts: [],
  approvalGate: {
    extractedDataPublishesDirectly: false,
    approvedOnlyVisibleInCatalogue: true,
    status: "REVIEW_REQUIRED",
  },
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(review, null, 2)}\n`, "utf8");
console.log(`catalogue_review_created=true output=${output} products=${products.length}`);

function summarize(items: ApprovedVisaProduct[]) {
  return {
    totalProducts: items.length,
    destinations: Array.from(new Set(items.map((product) => product.destination))).sort(),
    stickerProducts: items.filter((product) => product.visaKind === "STICKER_VISA").length,
    eVisaProducts: items.filter((product) => product.visaKind === "E_VISA").length,
    mandatoryDocuments: items.reduce((sum, product) => sum + (product.documentRequirements?.mandatory?.length ?? product.documents?.length ?? 0), 0),
    conditionalDocuments: items.reduce((sum, product) => sum + (product.documentRequirements?.conditional?.length ?? 0), 0),
    optionalDocuments: items.reduce((sum, product) => sum + (product.documentRequirements?.optional?.length ?? 0), 0),
    informationalRules: items.reduce((sum, product) => sum + (product.documentRequirements?.informational?.length ?? 0), 0),
    jurisdictionRules: items.reduce((sum, product) => sum + (product.jurisdictions?.length ?? 0), 0),
  };
}

function countDocuments(product: ApprovedVisaProduct): number {
  return (
    (product.documentRequirements?.mandatory?.length ?? 0) +
    (product.documentRequirements?.conditional?.length ?? 0) +
    (product.documentRequirements?.optional?.length ?? 0) +
    (product.documentRequirements?.informational?.length ?? 0)
  );
}
