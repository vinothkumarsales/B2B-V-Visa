import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import type { MarketplaceOrderStatus } from '@prisma/client';

export interface CreateOrderInput {
  productId: string;
  quantity?: number;
  travellerDetails?: {
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone: string;
    travelDate?: string;
    travellerCount?: number;
    specialRequests?: string;
  };
  notes?: string;
}

/**
 * Creates a new B2B marketplace order for a product.
 */
export async function createMarketplaceOrder(params: {
  buyerAgencyId: string;
  buyerUserId: string;
  input: CreateOrderInput;
}) {
  const { buyerAgencyId, buyerUserId, input } = params;

  const product = await db.marketplaceProduct.findUnique({
    where: { id: input.productId },
    include: { vendorProfile: true },
  });

  if (!product || !product.isAvailable || product.status !== 'PUBLISHED') {
    throw new Error('Product is unavailable for booking');
  }

  const quantity = Math.max(1, Math.min(input.quantity || 1, product.maxQuantity));
  const basePriceMinor = product.basePriceMinor * quantity;
  const platformFeeMinor = product.platformFeeMinor * quantity;
  const gstMinor = product.gstMinor * quantity;
  const totalAmountMinor = product.sellingPriceMinor * quantity;

  const orderNumber = `VORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;

  const order = await db.marketplaceOrder.create({
    data: {
      orderNumber,
      productId: product.id,
      vendorProfileId: product.vendorProfileId,
      buyerAgencyId,
      buyerUserId,
      status: 'CONFIRMED', // Instant B2B confirmation
      quantity,
      basePriceMinor,
      platformFeeMinor,
      gstMinor,
      totalAmountMinor,
      travellerDetails: input.travellerDetails ? (input.travellerDetails as any) : undefined,
      notes: input.notes?.trim() || null,
    },
  });

  // Increment product booking count
  await db.marketplaceProduct.update({
    where: { id: product.id },
    data: { bookingCount: { increment: 1 } },
  });

  return order;
}

/**
 * Retrieves orders for a given agency (as buyer or vendor).
 */
export async function listMarketplaceOrders(agencyId: string, role: 'BUYER' | 'VENDOR') {
  if (role === 'BUYER') {
    return db.marketplaceOrder.findMany({
      where: { buyerAgencyId: agencyId },
      include: {
        product: true,
        vendorProfile: {
          select: {
            businessName: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  const vendorProfile = await db.vendorProfile.findUnique({
    where: { agencyId },
  });

  if (!vendorProfile) return [];

  return db.marketplaceOrder.findMany({
    where: { vendorProfileId: vendorProfile.id },
    include: {
      product: true,
      buyerAgency: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          vvisaUid: true,
        },
      },
      rating: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Updates an order status (e.g. In Progress, Completed, Cancelled).
 */
export async function updateOrderStatus(params: {
  orderId: string;
  agencyId: string;
  status: MarketplaceOrderStatus;
  cancellationReason?: string;
}) {
  const { orderId, agencyId, status, cancellationReason } = params;

  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { vendorProfile: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Verify permission: Must be the vendor or the buyer agency
  const isVendor = order.vendorProfile?.agencyId === agencyId;
  const isBuyer = order.buyerAgencyId === agencyId;

  if (!isVendor && !isBuyer) {
    throw new Error('Unauthorized to modify this order');
  }

  const updatedOrder = await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      status,
      ...(status === 'COMPLETED' ? { fulfilledAt: new Date() } : {}),
      ...(status === 'CANCELLED' ? { cancelledAt: new Date(), cancellationReason: cancellationReason || 'Cancelled by partner' } : {}),
    },
  });

  // If order is completed and has a vendor profile, update vendor stats
  if (status === 'COMPLETED' && order.vendorProfileId) {
    await db.vendorProfile.update({
      where: { id: order.vendorProfileId },
      data: {
        totalOrdersFulfilled: { increment: 1 },
      },
    });
  }

  return updatedOrder;
}

/**
 * Submits a verified transaction rating for a completed order.
 */
export async function submitVendorRating(params: {
  orderId: string;
  authorAgencyId: string;
  serviceQualityRating: number;
  responseTimeRating: number;
  accuracyRating: number;
  reviewText?: string;
}) {
  const { orderId, authorAgencyId, serviceQualityRating, responseTimeRating, accuracyRating, reviewText } = params;

  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { vendorProfile: true, rating: true },
  });

  if (!order) throw new Error('Order not found');
  if (order.buyerAgencyId !== authorAgencyId) throw new Error('Only the purchasing agency can rate this order');
  if (!order.vendorProfileId) throw new Error('Platform products do not accept vendor ratings');
  if (order.rating) throw new Error('A rating has already been submitted for this order');

  const sq = Math.max(1, Math.min(5, Math.round(serviceQualityRating)));
  const rt = Math.max(1, Math.min(5, Math.round(responseTimeRating)));
  const ac = Math.max(1, Math.min(5, Math.round(accuracyRating)));
  const overall = Number(((sq + rt + ac) / 3).toFixed(1));

  const rating = await db.vendorRating.create({
    data: {
      vendorProfileId: order.vendorProfileId,
      orderId: order.id,
      authorAgencyId,
      serviceQualityRating: sq,
      responseTimeRating: rt,
      accuracyRating: ac,
      overallRating: overall,
      reviewText: reviewText?.trim() || null,
    },
  });

  // Recalculate vendor profile average rating and reputation score
  const allRatings = await db.vendorRating.findMany({
    where: { vendorProfileId: order.vendorProfileId },
    select: { overallRating: true },
  });

  const avgRating = Number(
    (allRatings.reduce((sum, r) => sum + r.overallRating, 0) / allRatings.length).toFixed(2)
  );

  // Reputation score: Base 100 + (rating - 3) * 15 + (fulfilledOrders * 2)
  const repScore = Math.min(1000, Math.max(50, Math.round(100 + (avgRating - 3) * 15)));

  await db.vendorProfile.update({
    where: { id: order.vendorProfileId },
    data: {
      averageRating: avgRating,
      totalReviews: allRatings.length,
      reputationScore: repScore,
    },
  });

  return rating;
}
