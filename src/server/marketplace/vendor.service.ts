import { db } from '@/lib/db';
import type { VendorProfile, VendorKycStatus, VendorStatus } from '@prisma/client';

export interface VendorKycStatusSummary {
  hasProfile: boolean;
  kycStatus: VendorKycStatus;
  vendorStatus: VendorStatus;
  isKycCompleted: boolean;
  profile: VendorProfile | null;
  agencyUid?: string | null;
}

/**
 * Retrieves the vendor profile for an agency.
 */
export async function getVendorProfile(agencyId: string): Promise<VendorProfile | null> {
  return db.vendorProfile.findUnique({
    where: { agencyId },
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          vvisaUid: true,
          city: true,
          state: true,
          gstNumber: true,
          panCard: true,
        },
      },
      agreements: {
        orderBy: { acceptedAt: 'desc' },
        take: 1,
      },
    },
  });
}

/**
 * Gets the current KYC & Vendor status for an agency.
 */
export async function getVendorKycStatus(agencyId: string): Promise<VendorKycStatusSummary> {
  const profile = await db.vendorProfile.findUnique({
    where: { agencyId },
    include: {
      agency: {
        select: {
          vvisaUid: true,
        },
      },
    },
  });

  if (!profile) {
    return {
      hasProfile: false,
      kycStatus: 'NOT_STARTED',
      vendorStatus: 'DRAFT',
      isKycCompleted: false,
      profile: null,
    };
  }

  return {
    hasProfile: true,
    kycStatus: profile.kycStatus,
    vendorStatus: profile.vendorStatus,
    isKycCompleted: profile.kycStatus === 'COMPLETED',
    profile,
    agencyUid: profile.agency?.vvisaUid,
  };
}

/**
 * Updates vendor profile details.
 */
export async function updateVendorProfile(
  agencyId: string,
  input: {
    businessName?: string;
    businessType?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstNumber?: string;
    panCard?: string;
    categories?: string[];
  },
): Promise<VendorProfile> {
  return db.vendorProfile.update({
    where: { agencyId },
    data: {
      ...(input.businessName ? { businessName: input.businessName } : {}),
      ...(input.businessType ? { businessType: input.businessType } : {}),
      ...(input.contactPerson ? { contactPerson: input.contactPerson } : {}),
      ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
      ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.pincode !== undefined ? { pincode: input.pincode } : {}),
      ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber } : {}),
      ...(input.panCard !== undefined ? { panCard: input.panCard } : {}),
      ...(input.categories ? { categories: input.categories } : {}),
    },
  });
}
