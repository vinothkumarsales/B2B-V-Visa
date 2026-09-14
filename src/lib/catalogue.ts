import type { ApprovedVisaProduct, VisaDocumentRequirement, VisaType } from '@/types';

function requirementLabel(requirement: VisaDocumentRequirement): string {
  return requirement.documentName || requirement.label;
}

function normalizeDestinationName(destination: string): string {
  const normalized = destination.trim().toLowerCase();
  if (normalized === 'uae' || normalized === 'u.a.e.') return 'United Arab Emirates';
  if (normalized === 'uk' || normalized === 'u.k.') return 'United Kingdom';
  if (normalized === 'usa' || normalized === 'u.s.a.') return 'United States';
  return destination;
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
        destination: normalizeDestinationName(product.destination),
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
        jurisdictions: product.jurisdictions,
        jurisdictionOverrides: product.jurisdictionOverrides,
        passportValidityRule: product.passportValidityRule,
        cutoffTime: product.cutoffTime,
        publicationVersion: product.publicationVersion,
        publicationHash: product.publicationHash,
        publishedAt: product.publishedAt,
      };
    });

  if (approved.length === 0) return fallbackCatalogue;

  const approvedKeys = new Set(
    approved.map((visa) => `${visa.destination.toLowerCase()}::${visa.name.toLowerCase()}`),
  );
  const approvedIds = new Set(approved.map((visa) => visa.id));
  const fallback = fallbackCatalogue
    .map((visa) => ({ ...visa, destination: normalizeDestinationName(visa.destination) }))
    .filter((visa) => {
      const key = `${visa.destination.toLowerCase()}::${visa.name.toLowerCase()}`;
      return !approvedIds.has(visa.id) && !approvedKeys.has(key);
    });

  return [...approved, ...fallback];
}
