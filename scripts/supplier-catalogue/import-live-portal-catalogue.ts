import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const sourceUrl = process.env.CATALOGUE_SOURCE_URL ?? 'https://business.vvisa.in/api/visa-types';

type PortalRequirement = { id?: string; documentCode?: string; documentName?: string; label?: string; description?: string; requirement?: string; isMandatory?: boolean; isOptional?: boolean; sortOrder?: number };
type PortalProduct = { id: string; destination: string; destinationCode?: string; name: string; category: string; entry: string; entryType?: string; visaKind?: string; validity: string; duration: string; processingTime: string; price: number; amountMinor?: number; currency?: string; documents?: string[]; documentRequirements?: { mandatory?: PortalRequirement[]; optional?: PortalRequirement[]; conditional?: PortalRequirement[] }; pricing?: { visaFeeMinor?: number; vvisaServiceFeeMinor?: number; courierFeeMinor?: number; insuranceFeeMinor?: number; convenienceFeeMinor?: number; otherFeeMinor?: number; discountMinor?: number; gstMinor?: number; totalAmountMinor?: number; currency?: string } };

function countryCode(product: PortalProduct) {
  return product.destinationCode ?? `PORTAL-${product.destination.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 24)}`;
}

async function importProduct(source: PortalProduct, displayOrder: number) {
  const existingCountry = await db.country.findFirst({ where: { name: source.destination } });
  const country = existingCountry ?? await db.country.create({ data: { code: countryCode(source), name: source.destination } });
  const amountMinor = source.amountMinor ?? Math.round(source.price * 100);
  const product = await db.visaProduct.upsert({
    where: { id: source.id },
    update: { countryId: country.id, destination: source.destination, destinationCode: source.destinationCode, name: source.name, publicTitle: source.name, category: source.category, entry: source.entry, entryType: source.entryType, visaKind: source.visaKind, validity: source.validity, duration: source.duration, processingTime: source.processingTime, currency: source.currency ?? 'INR', amountMinor, documents: source.documents ?? [], displayOrder, pricingVersion: 'portal-import-v1', isActive: true },
    create: { id: source.id, countryId: country.id, destination: source.destination, destinationCode: source.destinationCode, name: source.name, publicTitle: source.name, category: source.category, entry: source.entry, entryType: source.entryType, visaKind: source.visaKind, validity: source.validity, duration: source.duration, processingTime: source.processingTime, currency: source.currency ?? 'INR', amountMinor, documents: source.documents ?? [], displayOrder, pricingVersion: 'portal-import-v1', isActive: true },
  });
  const pricing = source.pricing;
  await db.visaPrice.updateMany({
    where: { visaProductId: product.id, id: { not: `${source.id}-portal-price` } },
    data: { isActive: false },
  });
  await db.visaPrice.upsert({
    where: { id: `${source.id}-portal-price` },
    update: { currency: pricing?.currency ?? source.currency ?? 'INR', visaFeeMinor: pricing?.visaFeeMinor ?? 0, vvisaServiceFeeMinor: pricing?.vvisaServiceFeeMinor ?? 0, courierFeeMinor: pricing?.courierFeeMinor ?? 0, insuranceFeeMinor: pricing?.insuranceFeeMinor ?? 0, convenienceFeeMinor: pricing?.convenienceFeeMinor ?? 0, otherFeeMinor: pricing?.otherFeeMinor ?? 0, discountMinor: pricing?.discountMinor ?? 0, gstMinor: pricing?.gstMinor ?? 0, totalAmountMinor: pricing?.totalAmountMinor ?? amountMinor, isActive: true },
    create: { id: `${source.id}-portal-price`, visaProductId: product.id, currency: pricing?.currency ?? source.currency ?? 'INR', visaFeeMinor: pricing?.visaFeeMinor ?? 0, vvisaServiceFeeMinor: pricing?.vvisaServiceFeeMinor ?? 0, courierFeeMinor: pricing?.courierFeeMinor ?? 0, insuranceFeeMinor: pricing?.insuranceFeeMinor ?? 0, convenienceFeeMinor: pricing?.convenienceFeeMinor ?? 0, otherFeeMinor: pricing?.otherFeeMinor ?? 0, discountMinor: pricing?.discountMinor ?? 0, gstMinor: pricing?.gstMinor ?? 0, totalAmountMinor: pricing?.totalAmountMinor ?? amountMinor, isActive: true },
  });
  const groups = source.documentRequirements;
  const requirements = [...(groups?.mandatory ?? []), ...(groups?.conditional ?? []), ...(groups?.optional ?? [])];
  for (const [order, requirement] of requirements.entries()) {
    const kind = requirement.requirement === 'OPTIONAL' ? 'optional' : requirement.requirement === 'CONDITIONAL' ? 'conditional' : 'required';
    const id = `${source.id}-${requirement.id ?? requirement.documentCode ?? order}`;
    const data = { documentCode: requirement.documentCode ?? `DOC_${order}`, documentName: requirement.documentName ?? requirement.label ?? `Document ${order + 1}`, description: requirement.description, isMandatory: kind === 'required', isOptional: kind === 'optional', uploadRequired: true, requirementStatus: 'PUBLISHED' as const, requirementType: kind, displayOrder: requirement.sortOrder ?? order };
    await db.visaDocumentRequirement.upsert({ where: { id }, update: data, create: { id, visaProductId: product.id, ...data } });
  }
}

async function main() {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Catalogue source returned ${response.status}`);
  const payload = await response.json() as { visaTypes?: PortalProduct[] };
  const products = payload.visaTypes ?? [];
  for (const [index, product] of products.entries()) await importProduct(product, index);
  const [countries, visaProducts, prices, documents] = await Promise.all([db.country.count(), db.visaProduct.count(), db.visaPrice.count(), db.visaDocumentRequirement.count()]);
  console.log(JSON.stringify({ sourceProducts: products.length, countries, products: visaProducts, prices, documents }));
}

main().finally(() => db.$disconnect());
