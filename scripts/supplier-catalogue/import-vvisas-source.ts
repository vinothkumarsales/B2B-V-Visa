import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PrismaClient, type Prisma } from '@prisma/client';

const defaultDb = new PrismaClient();
const REPO_SNAPSHOT_PATH = resolve('data/supplier-imports/approved/vvisas-source-products.json');

type SourceVisa = {
  id?: string;
  title?: string;
  name?: string;
  governmentFee?: number;
  serviceFee?: number;
  fastTrackFee?: number;
  type?: string;
  processing?: string;
  fastProcessing?: string;
  lengthOfStay?: string;
  stayDuration?: string;
  validity?: string;
  entry?: string;
  entries?: string;
  requirements?: string[];
};

type SourceCountry = {
  id: string;
  name: string;
  shortName?: string;
  region?: string;
  visas: Record<string, SourceVisa>;
};

type ImportOptions = {
  sourceDir?: string;
  sourceFile?: string;
  publish: boolean;
  updateExisting: boolean;
  limit?: number;
  country?: string;
};

type ImportSummary = {
  source: string;
  mode: 'published' | 'draft';
  updateExisting: boolean;
  countries: number;
  sourceProducts: number;
  importedProducts: number;
  created: number;
  updated: number;
  skipped: number;
  prices: number;
  documents: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  tourist: 'Tourist',
  business: 'Business',
  transit: 'Transit',
  'study-visa': 'Study',
  pr: 'PR',
  'work-visa': 'Work',
  'job-seeker': 'Job Seeker',
};

export async function importVVisasProducts(options: Partial<ImportOptions> = {}, db: PrismaClient = defaultDb): Promise<ImportSummary> {
  const resolvedOptions: ImportOptions = {
    sourceDir: options.sourceDir,
    sourceFile: options.sourceFile,
    publish: options.publish ?? false,
    updateExisting: options.updateExisting ?? false,
    limit: options.limit,
    country: options.country,
  };
  const { source, countries } = await loadSourceCountries(resolvedOptions);
  const selected = countries.filter((country) => {
    if (!resolvedOptions.country) return true;
    const needle = resolvedOptions.country.toLowerCase();
    return country.name.toLowerCase().includes(needle) || country.id.toLowerCase() === needle;
  });
  const products = selected.flatMap((country) => normalizeCountryProducts(country));
  const limited = resolvedOptions.limit ? products.slice(0, resolvedOptions.limit) : products;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let documents = 0;
  let prices = 0;

  for (const [index, product] of limited.entries()) {
    const result = await importProduct(product, {
      displayOrder: index + 5000,
      publish: resolvedOptions.publish,
      updateExisting: resolvedOptions.updateExisting,
    }, db);
    created += result.created ? 1 : 0;
    updated += result.updated ? 1 : 0;
    skipped += result.skipped ? 1 : 0;
    documents += result.documents;
    prices += result.price ? 1 : 0;
  }

  return {
    source,
    mode: resolvedOptions.publish ? 'published' : 'draft',
    updateExisting: resolvedOptions.updateExisting,
    countries: selected.length,
    sourceProducts: products.length,
    importedProducts: limited.length,
    created,
    updated,
    skipped,
    prices,
    documents,
  };
}

async function main() {
  const summary = await importVVisasProducts(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(summary, null, 2));
}

function normalizeCountryProducts(country: SourceCountry) {
  return Object.entries(country.visas ?? {}).map(([categoryKey, visa]) => {
    const category = CATEGORY_LABELS[categoryKey] ?? titleCase(categoryKey);
    const governmentFeeMinor = rupeesToMinor(visa.governmentFee);
    const serviceFeeMinor = rupeesToMinor(visa.serviceFee);
    const fastTrackFeeMinor = rupeesToMinor(visa.fastTrackFee);
    const totalAmountMinor = governmentFeeMinor + serviceFeeMinor;
    const id = `vvisas-${slug(country.id || country.name)}-${slug(visa.id || categoryKey)}`;
    const entry = visa.entry ?? visa.entries ?? 'Single';
    const visaKind = normalizeVisaKind(visa.type);

    return {
      id,
      countryCode: country.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
      destination: country.name,
      destinationCode: country.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
      name: visa.title ?? visa.name ?? `${country.name} ${category} Visa`,
      category,
      subcategory: country.region ?? null,
      entry,
      entryType: normalizeEntryType(entry),
      visaKind,
      validity: visa.validity ?? 'Review required',
      duration: visa.lengthOfStay ?? visa.stayDuration ?? 'Review required',
      processingTime: visa.processing ?? 'Estimated processing time review required',
      expressProcessingTime: visa.fastProcessing ?? null,
      currency: 'INR',
      amountMinor: totalAmountMinor,
      documents: visa.requirements ?? [],
      pricing: {
        visaFeeMinor: governmentFeeMinor,
        vvisaServiceFeeMinor: serviceFeeMinor,
        convenienceFeeMinor: fastTrackFeeMinor,
        gstMinor: 0,
        totalAmountMinor,
        currency: 'INR',
      },
      shortDescription: `${category} visa support for ${country.name}.`,
      importantNotes: 'Imported from V-VISAS source. Review country rules, pricing, and document classification before publishing.',
    };
  });
}

async function importProduct(source: ReturnType<typeof normalizeCountryProducts>[number], input: {
  displayOrder: number;
  publish: boolean;
  updateExisting: boolean;
}, db: PrismaClient) {
  const country = await db.country.upsert({
    where: { code: source.countryCode },
    update: { name: source.destination, isActive: true },
    create: { code: source.countryCode, name: source.destination, isActive: true },
  });
  const existing = await db.visaProduct.findUnique({ where: { id: source.id } });
  if (existing && !input.updateExisting) {
    return { created: false, updated: false, skipped: true, documents: 0, price: false };
  }

  const productData = {
    countryId: country.id,
    destination: source.destination,
    destinationCode: source.destinationCode,
    name: source.name,
    publicTitle: source.name,
    internalCode: source.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 80),
    category: source.category,
    subcategory: source.subcategory,
    entry: source.entry,
    entryType: source.entryType,
    visaKind: source.visaKind,
    validity: source.validity,
    duration: source.duration,
    processingTime: source.processingTime,
    expressProcessingTime: source.expressProcessingTime,
    currency: source.currency,
    amountMinor: source.amountMinor,
    documents: source.documents as Prisma.InputJsonValue,
    badges: ['V-VISAS import'] as Prisma.InputJsonValue,
    shortDescription: source.shortDescription,
    importantNotes: source.importantNotes,
    displayOrder: input.displayOrder,
    pricingVersion: input.publish ? 'vvisas-import-published-v1' : 'vvisas-import-draft-v1',
    isActive: input.publish,
    isFeatured: false,
  };

  const product = existing
    ? await db.visaProduct.update({ where: { id: source.id }, data: productData })
    : await db.visaProduct.create({ data: { id: source.id, ...productData } });

  const latest = await db.visaProductVersion.findFirst({
    where: { visaProductId: product.id },
    orderBy: { version: 'desc' },
  });
  await db.visaProductVersion.create({
    data: {
      visaProductId: product.id,
      version: (latest?.version ?? 0) + 1,
      snapshot: productData as Prisma.InputJsonValue,
      reviewStatus: input.publish ? 'PUBLISHED' : 'REVIEW_REQUIRED',
      approvedBy: 'vvisas-source-import',
      approvedAt: input.publish ? new Date() : null,
    },
  });

  await db.visaPrice.upsert({
    where: { id: `${source.id}-vvisas-price` },
    update: {
      currency: source.pricing.currency,
      visaFeeMinor: source.pricing.visaFeeMinor,
      vvisaServiceFeeMinor: source.pricing.vvisaServiceFeeMinor,
      convenienceFeeMinor: source.pricing.convenienceFeeMinor,
      gstMinor: source.pricing.gstMinor,
      totalAmountMinor: source.pricing.totalAmountMinor,
      isActive: input.publish,
    },
    create: {
      id: `${source.id}-vvisas-price`,
      visaProductId: product.id,
      currency: source.pricing.currency,
      visaFeeMinor: source.pricing.visaFeeMinor,
      vvisaServiceFeeMinor: source.pricing.vvisaServiceFeeMinor,
      convenienceFeeMinor: source.pricing.convenienceFeeMinor,
      gstMinor: source.pricing.gstMinor,
      totalAmountMinor: source.pricing.totalAmountMinor,
      isActive: input.publish,
    },
  });

  let documents = 0;
  for (const [order, documentName] of source.documents.entries()) {
    const documentCode = slug(documentName).toUpperCase().slice(0, 80) || `DOC_${order + 1}`;
    await db.visaDocumentRequirement.upsert({
      where: { id: `${source.id}-doc-${slug(documentName) || order}` },
      update: {
        documentCode,
        documentName,
        isMandatory: true,
        isOptional: false,
        uploadRequired: true,
        requirementStatus: input.publish ? 'PUBLISHED' : 'REVIEW_REQUIRED',
        requirementType: 'required',
        displayOrder: order,
      },
      create: {
        id: `${source.id}-doc-${slug(documentName) || order}`,
        visaProductId: product.id,
        documentCode,
        documentName,
        isMandatory: true,
        isOptional: false,
        uploadRequired: true,
        requirementStatus: input.publish ? 'PUBLISHED' : 'REVIEW_REQUIRED',
        requirementType: 'required',
        displayOrder: order,
      },
    });
    documents += 1;
  }

  return { created: !existing, updated: Boolean(existing), skipped: false, documents, price: true };
}

async function findCountryDataBundle(sourceDir: string) {
  const assetsDir = join(sourceDir, 'assets');
  const files = await readdir(assetsDir);
  const countryData = files.find((file) => /^countryData-.*\.js$/.test(file));
  if (!countryData) throw new Error(`countryData bundle not found under ${assetsDir}`);
  return join(assetsDir, countryData);
}

async function loadSourceCountries(options: ImportOptions): Promise<{ source: string; countries: SourceCountry[] }> {
  if (options.sourceFile) {
    const sourceFile = resolve(options.sourceFile);
    return { source: sourceFile, countries: await readSnapshot(sourceFile) };
  }
  if (options.sourceDir) {
    const sourceFile = await findCountryDataBundle(resolve(options.sourceDir));
    return { source: sourceFile, countries: extractCountries(await readFile(sourceFile, 'utf8')) };
  }
  try {
    return { source: REPO_SNAPSHOT_PATH, countries: await readSnapshot(REPO_SNAPSHOT_PATH) };
  } catch {
    const sourceFile = await findCountryDataBundle(resolve('C:/vvisas-ai/_imports/V-VISAS'));
    return { source: sourceFile, countries: extractCountries(await readFile(sourceFile, 'utf8')) };
  }
}

async function readSnapshot(sourceFile: string): Promise<SourceCountry[]> {
  const parsed = JSON.parse(await readFile(sourceFile, 'utf8')) as { countries?: SourceCountry[] } | SourceCountry[];
  return Array.isArray(parsed) ? parsed : parsed.countries ?? [];
}

function extractCountries(bundle: string): SourceCountry[] {
  const marker = 'M=';
  const start = bundle.indexOf(marker);
  if (start === -1) throw new Error('Country data object marker M= not found');
  const objectStart = bundle.indexOf('{', start);
  if (objectStart === -1) throw new Error('Country data object start not found');
  const objectEnd = findMatchingBrace(bundle, objectStart);
  const objectText = bundle.slice(objectStart, objectEnd + 1);
  const countries = Function(`"use strict"; return (${objectText});`)() as Record<string, SourceCountry>;
  return Object.values(countries).filter((country) => country?.id && country?.name && country?.visas);
}

function findMatchingBrace(value: string, start: number) {
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('Country data object end not found');
}

function parseArgs(args: string[]): ImportOptions {
  const get = (name: string) => {
    const prefix = `--${name}=`;
    const inline = args.find((arg) => arg.startsWith(prefix));
    if (inline) return inline.slice(prefix.length);
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    sourceDir: get('source') ? resolve(get('source') as string) : undefined,
    sourceFile: get('source-file') ? resolve(get('source-file') as string) : undefined,
    publish: args.includes('--publish'),
    updateExisting: args.includes('--update-existing'),
    limit: get('limit') ? Number(get('limit')) : undefined,
    country: get('country'),
  };
}

function rupeesToMinor(value?: number) {
  return Math.max(0, Math.round(Number(value ?? 0) * 100));
}

function normalizeVisaKind(value?: string) {
  const text = value?.toLowerCase() ?? '';
  if (text.includes('sticker')) return 'STICKER_VISA';
  if (text.includes('arrival')) return 'VISA_ON_ARRIVAL';
  if (text.includes('eta')) return 'ETA';
  if (text.includes('e-visa') || text.includes('evisa')) return 'E_VISA';
  return value ?? 'OTHER';
}

function normalizeEntryType(value: string) {
  const text = value.toLowerCase();
  if (text.includes('multiple')) return 'MULTIPLE';
  if (text.includes('double')) return 'DOUBLE';
  if (text.includes('single')) return 'SINGLE';
  return 'NOT_SPECIFIED';
}

function titleCase(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().finally(() => defaultDb.$disconnect());
}
