import { PrismaClient } from '@prisma/client';
import { stampMyVisaApprovedProducts } from '../../src/lib/stampmyvisa-approved-products.ts';
import { productionApprovedProducts } from '../../src/lib/production-approved-products.ts';

const db = new PrismaClient();

function allRequirements(product: (typeof products)[number]) {
  const groups = product.documentRequirements;
  return [
    ...(groups?.mandatory ?? []),
    ...(groups?.conditional ?? []),
    ...(groups?.optional ?? []),
    ...(groups?.informational ?? []),
  ];
}

const products = [...stampMyVisaApprovedProducts, ...productionApprovedProducts]
  .filter((product) => product.status === 'APPROVED');

async function main() {
  for (const [displayOrder, source] of products.entries()) {
    const country = await db.country.upsert({
      where: { code: source.destinationCode ?? source.destination.slice(0, 2).toUpperCase() },
      update: { name: source.destination, isActive: true },
      create: {
        code: source.destinationCode ?? source.destination.slice(0, 2).toUpperCase(),
        name: source.destination,
        isActive: true,
      },
    });
    const amountMinor = source.priceMinor ?? Math.round((source.price ?? 0) * 100);
    const product = await db.visaProduct.upsert({
      where: { id: source.id },
      update: {
        countryId: country.id,
        destination: source.destination,
        destinationCode: source.destinationCode,
        name: source.name,
        publicTitle: source.name,
        category: source.category ?? 'STANDARD',
        entry: source.entry ?? source.entryType ?? 'Single',
        entryType: source.entryType,
        visaKind: source.visaKind,
        purpose: source.purpose,
        validity: source.validity ?? 'Manual review',
        duration: source.duration ?? 'Manual review',
        processingTime: source.processingTime ?? 'Manual review',
        currency: source.currency ?? 'INR',
        amountMinor,
        documents: source.documents ?? allRequirements(source).map((item) => item.documentName ?? item.label),
        displayOrder,
        pricingVersion: source.publicationVersion ?? 'approved-bootstrap-v1',
        isActive: true,
      },
      create: {
        id: source.id,
        countryId: country.id,
        destination: source.destination,
        destinationCode: source.destinationCode,
        name: source.name,
        publicTitle: source.name,
        category: source.category ?? 'STANDARD',
        entry: source.entry ?? source.entryType ?? 'Single',
        entryType: source.entryType,
        visaKind: source.visaKind,
        purpose: source.purpose,
        validity: source.validity ?? 'Manual review',
        duration: source.duration ?? 'Manual review',
        processingTime: source.processingTime ?? 'Manual review',
        currency: source.currency ?? 'INR',
        amountMinor,
        documents: source.documents ?? allRequirements(source).map((item) => item.documentName ?? item.label),
        displayOrder,
        pricingVersion: source.publicationVersion ?? 'approved-bootstrap-v1',
        isActive: true,
      },
    });

    const pricing = source.pricing;
    await db.visaPrice.upsert({
      where: { id: `${source.id}-approved-price` },
      update: {
        currency: pricing?.currency ?? source.currency ?? 'INR',
        visaFeeMinor: pricing?.visaFeeMinor ?? 0,
        vvisaServiceFeeMinor: pricing?.vvisaServiceFeeMinor ?? 0,
        courierFeeMinor: pricing?.courierFeeMinor ?? 0,
        insuranceFeeMinor: pricing?.insuranceFeeMinor ?? 0,
        convenienceFeeMinor: pricing?.convenienceFeeMinor ?? 0,
        otherFeeMinor: pricing?.otherFeeMinor ?? 0,
        discountMinor: pricing?.discountMinor ?? 0,
        gstMinor: pricing?.gstMinor ?? 0,
        totalAmountMinor: pricing?.totalAmountMinor ?? amountMinor,
        isActive: true,
      },
      create: {
        id: `${source.id}-approved-price`,
        visaProductId: product.id,
        currency: pricing?.currency ?? source.currency ?? 'INR',
        visaFeeMinor: pricing?.visaFeeMinor ?? 0,
        vvisaServiceFeeMinor: pricing?.vvisaServiceFeeMinor ?? 0,
        courierFeeMinor: pricing?.courierFeeMinor ?? 0,
        insuranceFeeMinor: pricing?.insuranceFeeMinor ?? 0,
        convenienceFeeMinor: pricing?.convenienceFeeMinor ?? 0,
        otherFeeMinor: pricing?.otherFeeMinor ?? 0,
        discountMinor: pricing?.discountMinor ?? 0,
        gstMinor: pricing?.gstMinor ?? 0,
        totalAmountMinor: pricing?.totalAmountMinor ?? amountMinor,
        isActive: true,
      },
    });

    for (const [order, requirement] of allRequirements(source).entries()) {
      const requirementType = requirement.requirement === 'OPTIONAL'
        ? 'optional'
        : requirement.requirement === 'CONDITIONAL'
          ? 'conditional'
          : requirement.requirement === 'MANDATORY'
            ? 'required'
            : 'informational';
      await db.visaDocumentRequirement.upsert({
        where: { id: `${source.id}-${requirement.id}` },
        update: {
          documentCode: requirement.documentCode ?? requirement.id.toUpperCase(),
          documentName: requirement.documentName ?? requirement.label,
          description: requirement.description,
          isMandatory: requirementType === 'required',
          isOptional: requirementType === 'optional',
          uploadRequired: requirement.uploadRequired ?? requirementType !== 'informational',
          requirementStatus: 'PUBLISHED',
          requirementType,
          displayOrder: order,
        },
        create: {
          id: `${source.id}-${requirement.id}`,
          visaProductId: product.id,
          documentCode: requirement.documentCode ?? requirement.id.toUpperCase(),
          documentName: requirement.documentName ?? requirement.label,
          description: requirement.description,
          isMandatory: requirementType === 'required',
          isOptional: requirementType === 'optional',
          uploadRequired: requirement.uploadRequired ?? requirementType !== 'informational',
          requirementStatus: 'PUBLISHED',
          requirementType,
          displayOrder: order,
        },
      });
    }
  }

  const [countries, visaProducts, prices, documents] = await Promise.all([
    db.country.count(),
    db.visaProduct.count(),
    db.visaPrice.count(),
    db.visaDocumentRequirement.count(),
  ]);
  console.log(JSON.stringify({ countries, products: visaProducts, prices, documents }));
}

main().finally(() => db.$disconnect());
