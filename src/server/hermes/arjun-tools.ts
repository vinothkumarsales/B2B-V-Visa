import { db } from '@/lib/db';

export interface VisaProductSummary {
  id: string;
  destination: string;
  name: string;
  publicTitle?: string | null;
  category: string;
  entry: string;
  validity: string;
  duration: string;
  processingTime: string;
  amountInr: number;
  shortDescription?: string | null;
}

export interface DocumentRequirementSummary {
  documentName: string;
  isMandatory: boolean;
  isOptional: boolean;
  notes?: string | null;
  appliesToAdult: boolean;
  appliesToMinor: boolean;
  physicalOriginalRequired: boolean;
}

export interface VisaPricingBreakdown {
  productName: string;
  destination: string;
  currency: string;
  totalAmountInr: number;
  visaFeeInr: number;
  vvisaServiceFeeInr: number;
  gstInr: number;
  courierFeeInr?: number;
}

export interface ApplicationStatusSummary {
  applicationId: string;
  internalId?: string | null;
  destination: string;
  visaType: string;
  statusCode: string;
  statusLabel: string;
  statusDescription?: string | null;
  progressPercent: number;
  submittedAt?: string | null;
  applicants: string[];
}

/**
 * 1. Read-only search across the 260 active VisaProducts in V-Visa catalogue.
 */
export async function searchVisaCatalogue(query: {
  destination?: string;
  category?: string;
  entry?: string;
  limit?: number;
}): Promise<VisaProductSummary[]> {
  try {
    const whereClause: Record<string, unknown> = { isActive: true };

    if (query.destination?.trim()) {
      whereClause.destination = {
        contains: query.destination.trim(),
        mode: 'insensitive',
      };
    }

    if (query.category?.trim()) {
      whereClause.category = {
        contains: query.category.trim(),
        mode: 'insensitive',
      };
    }

    if (query.entry?.trim()) {
      whereClause.entry = {
        contains: query.entry.trim(),
        mode: 'insensitive',
      };
    }

    const products = await db.visaProduct.findMany({
      where: whereClause,
      take: query.limit || 5,
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        destination: true,
        name: true,
        publicTitle: true,
        category: true,
        entry: true,
        validity: true,
        duration: true,
        processingTime: true,
        amountMinor: true,
        shortDescription: true,
      },
    });

    return products.map((p) => ({
      id: p.id,
      destination: p.destination,
      name: p.publicTitle || p.name,
      category: p.category,
      entry: p.entry,
      validity: p.validity,
      duration: p.duration,
      processingTime: p.processingTime,
      amountInr: Math.round(p.amountMinor / 100),
      shortDescription: p.shortDescription,
    }));
  } catch (error) {
    console.error('[ARJUN TOOLS] Error querying visa catalogue:', error);
    return [];
  }
}

/**
 * 2. Document requirement verification tool.
 */
export async function getVisaDocumentRequirements(
  productIdOrDestination: string
): Promise<{ productName: string; destination: string; documents: DocumentRequirementSummary[] } | null> {
  try {
    const trimmed = productIdOrDestination.trim();
    const product = await db.visaProduct.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: trimmed },
          { internalCode: trimmed },
          { destination: { equals: trimmed, mode: 'insensitive' } },
          { destination: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      include: {
        documentRules: {
          orderBy: { displayOrder: 'asc' },
          select: {
            documentName: true,
            isMandatory: true,
            isOptional: true,
            notes: true,
            appliesToAdult: true,
            appliesToMinor: true,
            physicalOriginalRequired: true,
          },
        },
      },
    });

    if (!product) return null;

    return {
      productName: product.publicTitle || product.name,
      destination: product.destination,
      documents: product.documentRules.map((d) => ({
        documentName: d.documentName,
        isMandatory: d.isMandatory,
        isOptional: d.isOptional,
        notes: d.notes,
        appliesToAdult: d.appliesToAdult,
        appliesToMinor: d.appliesToMinor,
        physicalOriginalRequired: d.physicalOriginalRequired,
      })),
    };
  } catch (error) {
    console.error('[ARJUN TOOLS] Error fetching document requirements:', error);
    return null;
  }
}

/**
 * 3. Exact pricing verification tool.
 */
export async function getVisaPricingDetails(
  productIdOrDestination: string
): Promise<VisaPricingBreakdown | null> {
  try {
    const trimmed = productIdOrDestination.trim();
    const product = await db.visaProduct.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: trimmed },
          { destination: { equals: trimmed, mode: 'insensitive' } },
          { destination: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      include: {
        prices: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!product) return null;

    const activePrice = product.prices[0];
    if (activePrice) {
      return {
        productName: product.publicTitle || product.name,
        destination: product.destination,
        currency: activePrice.currency || 'INR',
        totalAmountInr: Math.round(activePrice.totalAmountMinor / 100),
        visaFeeInr: Math.round(activePrice.visaFeeMinor / 100),
        vvisaServiceFeeInr: Math.round(activePrice.vvisaServiceFeeMinor / 100),
        gstInr: Math.round(activePrice.gstMinor / 100),
        courierFeeInr: Math.round((activePrice.courierFeeMinor || 0) / 100),
      };
    }

    return {
      productName: product.publicTitle || product.name,
      destination: product.destination,
      currency: product.currency || 'INR',
      totalAmountInr: Math.round(product.amountMinor / 100),
      visaFeeInr: Math.round((product.amountMinor * 0.7) / 100),
      vvisaServiceFeeInr: Math.round((product.amountMinor * 0.25) / 100),
      gstInr: Math.round((product.amountMinor * 0.05) / 100),
    };
  } catch (error) {
    console.error('[ARJUN TOOLS] Error fetching pricing details:', error);
    return null;
  }
}

/**
 * 4. Partner-scoped visa application status lookup tool.
 */
export async function lookupApplicationStatus(params: {
  identifier?: string;
  agencyId: string;
}): Promise<ApplicationStatusSummary | null> {
  try {
    const { identifier, agencyId } = params;
    if (!agencyId) return null;

    const whereClause: Record<string, unknown> = { agencyId };

    if (identifier?.trim()) {
      const cleanId = identifier.trim();
      whereClause.OR = [
        { id: cleanId },
        { internalId: cleanId },
        { destination: { contains: cleanId, mode: 'insensitive' } },
        { zohoRecordId: cleanId },
      ];
    }

    const application = await db.visaApplication.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        applicants: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!application) return null;

    // Fetch partner-visible status config
    const statusConfig = await db.applicationStatusConfig.findUnique({
      where: { code: application.status },
    });

    return {
      applicationId: application.id,
      internalId: application.internalId,
      destination: application.destination,
      visaType: application.visaType,
      statusCode: application.status,
      statusLabel: statusConfig?.partnerLabel || application.status.replace(/_/g, ' '),
      statusDescription: statusConfig?.partnerDescription,
      progressPercent: statusConfig?.progressPercent ?? 20,
      submittedAt: application.submittedAt?.toLocaleDateString('en-IN') || null,
      applicants: application.applicants.map((a) => `${a.firstName} ${a.lastName}`.trim()),
    };
  } catch (error) {
    console.error('[ARJUN TOOLS] Error looking up application status:', error);
    return null;
  }
}
