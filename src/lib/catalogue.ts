import type { ApprovedVisaProduct, VisaDocumentRequirement, VisaType } from '@/types';

function requirementLabel(requirement: VisaDocumentRequirement): string {
  return requirement.documentName || requirement.label;
}

export function buildCatalogueFromApprovedProducts(
  products: ApprovedVisaProduct[],
  fallbackCatalogue: VisaType[] = []
): VisaType[] {
  const approved = products
    .filter((product) => product.status === 'APPROVED')
    .map((product): VisaType => {
      const documentNames =
        product.documents ??
        [
          ...(product.documentRequirements?.mandatory ?? []),
          ...(product.documentRequirements?.conditional ?? []),
          ...(product.documentRequirements?.optional ?? []),
        ].map(requirementLabel);

      return {
        id: product.id,
        destination: product.destination,
        destinationCode: product.destinationCode,
        name: product.name,
        category: product.category ?? 'STANDARD',
        entry: product.entry ?? product.entryType ?? 'Single',
        entryType: product.entryType,
        visaKind: product.visaKind,
        purpose: product.purpose,
        validity: product.validity ?? 'Manual review',
        duration: product.duration ?? 'Manual review',
        processingTime: product.processingTime ?? 'Manual review',
        price: product.price ?? Math.round((product.priceMinor ?? 0) / 100),
        currency: product.currency ?? product.pricing?.currency ?? 'INR',
        documents: documentNames.length > 0 ? documentNames : ['Passport', 'Photo'],
        documentRequirements: product.documentRequirements,
        pricingLineItems: product.pricingLineItems,
        pricing: product.pricing?.lines?.length ? product.pricing : undefined,
        stickerRoutes: product.stickerRoutes,
        courierRules: product.courierRules,
        passportValidityRule: product.passportValidityRule,
        cutoffTime: product.cutoffTime,
      };
    });

  if (approved.length === 0) return fallbackCatalogue;

  const approvedIds = new Set(approved.map((product) => product.id));
  return [...approved, ...fallbackCatalogue.filter((visa) => !approvedIds.has(visa.id))];
}
