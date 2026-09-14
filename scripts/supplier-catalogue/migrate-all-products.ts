/**
 * V-VISA — Complete Product Migration
 * Sources:
 *   1. catalogue-v1-proof.published.json (7 products — portal-approved, with full pricing/docs)
 *   2. vvisas-source-products.json (87 countries, 89+ visa types — B2C catalogue)
 *   3. DB already has 155 products from previous vvisas import — SKIP those with existing IDs
 *
 * Idempotent via upsert({ where: { id } }).
 * Run with --dry-run to preview. Run without to execute.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const db = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const cwd = process.cwd();

// ── Category normalizer ────────────────────────────────────────────────────────
const CAT_MAP: Record<string, string> = {
  tourist: 'Tourist', tourism: 'Tourist', STANDARD: 'Tourist',
  LIGHTNING_FAST: 'Tourist', MULTI_ENTRY: 'Tourist',
  business: 'Business', BUSINESS: 'Business',
  'study-visa': 'Study', study: 'Study', STUDY: 'Study',
  'work-visa': 'Work', work: 'Work', WORK: 'Work',
  'job-seeker': 'Job Seeker', jobseeker: 'Job Seeker', JOB_SEEKER: 'Job Seeker',
  'digital-nomad': 'Digital Nomad', DIGITAL_NOMAD: 'Digital Nomad',
  transit: 'Transit', TRANSIT: 'Transit',
  dependent: 'Dependent', family: 'Family Visit',
  pr: 'PR', immigration: 'Immigration',
  medical: 'Medical',
};
function normCat(raw: string, name: string): string {
  if (CAT_MAP[raw]) return CAT_MAP[raw];
  const n = name.toLowerCase();
  if (n.includes('tourist') || n.includes('visit')) return 'Tourist';
  if (n.includes('business')) return 'Business';
  if (n.includes('study') || n.includes('student')) return 'Study';
  if (n.includes('work') || n.includes('employment')) return 'Work';
  if (n.includes('job seeker') || n.includes('job-seeker')) return 'Job Seeker';
  if (n.includes('digital nomad')) return 'Digital Nomad';
  if (n.includes('transit')) return 'Transit';
  if (n.includes('family') || n.includes('dependent')) return 'Dependent';
  if (n.includes('pr') || n.includes('permanent residence')) return 'PR';
  if (n.includes('medical')) return 'Medical';
  return 'Tourist';
}

// ── Country normalizer ─────────────────────────────────────────────────────────
const COUNTRY_MAP: Record<string, string> = {
  UAE: 'United Arab Emirates', UK: 'United Kingdom', USA: 'United States',
};
function normCountry(name: string): string {
  return COUNTRY_MAP[name.trim()] ?? name.trim();
}

// ── Source 1: catalogue-v1-proof.published.json ───────────────────────────────
interface CatalogueProduct {
  id: string; destination: string; destinationCode?: string; name: string;
  category: string; entry: string; entryType?: string; visaKind?: string;
  validity: string; duration: string; processingTime: string;
  price?: number; amountMinor?: number; currency?: string;
  documents?: string[];
  documentRequirements?: { mandatory?: DocItem[]; optional?: DocItem[]; conditional?: DocItem[] };
  pricing?: PricingData; badges?: string[]; shortDescription?: string; status?: string;
}
interface DocItem {
  id?: string; documentCode?: string; documentName?: string; label?: string;
  description?: string; requirement?: string; isMandatory?: boolean;
  isOptional?: boolean; uploadRequired?: boolean; sortOrder?: number;
}
interface PricingData {
  visaFeeMinor?: number; vvisaServiceFeeMinor?: number; gstMinor?: number;
  totalAmountMinor?: number; currency?: string; courierFeeMinor?: number;
  insuranceFeeMinor?: number; convenienceFeeMinor?: number; otherFeeMinor?: number; discountMinor?: number;
}

function loadCatalogueV1(): CatalogueProduct[] {
  try {
    const raw = readFileSync(join(cwd, 'data/supplier-imports/approved/catalogue-v1-proof.published.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : parsed.products ?? []) as CatalogueProduct[];
  } catch { return []; }
}

// ── Source 2: vvisas-source-products.json (nested: {countries:[], products:[], visas:{}}) ──
interface VvisasCountry { id: string; name: string; shortName?: string; region?: string; visas?: Record<string, VvisasVisa>; }
interface VvisasVisa {
  id: string; title: string; governmentFee?: number; serviceFee?: number;
  fastTrackFee?: number; type?: string; processing?: string;
  fastProcessing?: string; lengthOfStay?: string; validity?: string;
  entry?: string; requirements?: string[]; description?: string;
}

function loadVvisasSource(): CatalogueProduct[] {
  try {
    const raw = readFileSync(join(cwd, 'data/supplier-imports/approved/vvisas-source-products.json'), 'utf-8');
    const parsed = JSON.parse(raw);

    // Structure: { countries: VvisasCountry[], products: [...], visas: {...} }
    // OR: top-level keys are group names
    let countries: VvisasCountry[] = [];

    if (Array.isArray(parsed.countries)) {
      countries = parsed.countries;
    } else if (Array.isArray(parsed)) {
      countries = parsed;
    } else {
      // Check if it's keyed by group name with array values containing country objects
      for (const key of Object.keys(parsed)) {
        const val = parsed[key];
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
              countries.push(item as VvisasCountry);
            }
          }
        }
      }
    }

    const products: CatalogueProduct[] = [];
    for (const country of countries) {
      if (!country.visas) continue;
      for (const [visaKey, visa] of Object.entries(country.visas)) {
        if (!visa || !visa.id) continue;
        const govFee = (visa.governmentFee ?? 0) * 100; // rupees → minor
        const svcFee = (visa.serviceFee ?? 0) * 100;
        const totalMinor = govFee + svcFee;
        const gstMinor = Math.round(svcFee * 0.18); // 18% GST on service fee
        products.push({
          id: `vvisas-src-${visa.id}`,
          destination: normCountry(country.name),
          destinationCode: country.id?.toUpperCase().slice(0, 6),
          name: visa.title,
          category: visaKey,
          entry: visa.entry ?? 'Single',
          visaKind: visa.type?.toLowerCase().includes('e-visa') ? 'E_VISA' : visa.type?.toLowerCase().includes('sticker') ? 'STICKER_VISA' : undefined,
          validity: visa.validity ?? visa.lengthOfStay ?? '',
          duration: visa.lengthOfStay ?? visa.validity ?? '',
          processingTime: visa.processing ?? '',
          price: (visa.governmentFee ?? 0) + (visa.serviceFee ?? 0),
          amountMinor: totalMinor,
          currency: 'INR',
          documents: visa.requirements ?? [],
          documentRequirements: visa.requirements?.length ? {
            mandatory: visa.requirements.map((doc, i) => ({
              id: `doc-${i}`,
              documentCode: doc.toUpperCase().replace(/\s+/g, '_').slice(0, 30),
              documentName: doc,
              requirement: 'MANDATORY',
              isMandatory: true,
              isOptional: false,
              uploadRequired: true,
            })),
          } : undefined,
          pricing: {
            visaFeeMinor: govFee,
            vvisaServiceFeeMinor: svcFee,
            gstMinor,
            totalAmountMinor: totalMinor + gstMinor,
            currency: 'INR',
          },
        });
      }
    }
    return products;
  } catch (e) {
    console.warn('  vvisas-source load error:', (e as Error).message?.slice(0, 80));
    return [];
  }
}

// ── Country cache ──────────────────────────────────────────────────────────────
const countryCache = new Map<string, string>();
async function getOrCreateCountry(name: string, code: string): Promise<string> {
  if (countryCache.has(name)) return countryCache.get(name)!;
  const existing = await db.country.findFirst({ where: { OR: [{ name }, { code }] } });
  const id = existing?.id ?? (await db.country.create({ data: { code, name, isActive: true } })).id;
  countryCache.set(name, id);
  return id;
}

// ── Upsert single product ─────────────────────────────────────────────────────
async function upsertProduct(p: CatalogueProduct, order: number, stats: { ok: number; err: number; skip: number }) {
  try {
    const destination = normCountry(p.destination ?? 'Unknown');
    const category = normCat(p.category ?? '', p.name ?? '');
    const amountMinor = p.amountMinor ?? Math.round((p.price ?? 0) * 100);
    const countryCode = (p.destinationCode ?? destination.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6));
    const countryId = await getOrCreateCountry(destination, countryCode);

    const shared = {
      countryId, destination, destinationCode: p.destinationCode ?? null,
      name: p.name, publicTitle: p.name, category,
      entry: p.entry ?? 'Single', entryType: p.entryType ?? null,
      visaKind: p.visaKind ?? null, purpose: null,
      validity: p.validity ?? '', duration: p.duration ?? '',
      processingTime: p.processingTime ?? '',
      currency: p.currency ?? 'INR', amountMinor,
      documents: p.documents ?? [],
      badges: p.badges ? (p.badges as any) : undefined,
      shortDescription: p.shortDescription ?? null,
      displayOrder: order,
      pricingVersion: 'migration-v2',
      isActive: p.status !== 'INACTIVE',
    };

    await db.visaProduct.upsert({ where: { id: p.id }, update: shared, create: { id: p.id, ...shared } });

    // Pricing
    const pr = p.pricing;
    const priceId = `${p.id}-price`;
    const priceData = {
      visaProductId: p.id,
      currency: pr?.currency ?? 'INR',
      visaFeeMinor: pr?.visaFeeMinor ?? 0,
      vvisaServiceFeeMinor: pr?.vvisaServiceFeeMinor ?? 0,
      courierFeeMinor: pr?.courierFeeMinor ?? 0,
      insuranceFeeMinor: pr?.insuranceFeeMinor ?? 0,
      convenienceFeeMinor: pr?.convenienceFeeMinor ?? 0,
      otherFeeMinor: pr?.otherFeeMinor ?? 0,
      discountMinor: pr?.discountMinor ?? 0,
      gstMinor: pr?.gstMinor ?? 0,
      totalAmountMinor: pr?.totalAmountMinor ?? amountMinor,
      isActive: true,
    };
    await db.visaPrice.upsert({ where: { id: priceId }, update: priceData, create: { id: priceId, ...priceData } });

    // Documents
    const allDocs = [
      ...(p.documentRequirements?.mandatory ?? []).map(d => ({ ...d, kind: 'required' as const })),
      ...(p.documentRequirements?.conditional ?? []).map(d => ({ ...d, kind: 'conditional' as const })),
      ...(p.documentRequirements?.optional ?? []).map(d => ({ ...d, kind: 'optional' as const })),
    ];
    for (const [i, doc] of allDocs.entries()) {
      const docId = `${p.id}-${doc.id ?? doc.documentCode ?? `d${i}`}`;
      const docData = {
        visaProductId: p.id,
        documentCode: (doc.documentCode ?? `DOC_${i}`).slice(0, 50),
        documentName: (doc.documentName ?? doc.label ?? `Document ${i + 1}`).slice(0, 200),
        description: doc.description ?? null,
        isMandatory: doc.kind === 'required',
        isOptional: doc.kind === 'optional',
        uploadRequired: doc.uploadRequired ?? true,
        requirementStatus: 'PUBLISHED' as const,
        requirementType: doc.kind,
        displayOrder: doc.sortOrder ?? i,
      };
      await db.visaDocumentRequirement.upsert({ where: { id: docId }, update: docData, create: { id: docId, ...docData } });
    }

    stats.ok++;
  } catch (e) {
    stats.err++;
    console.error(`  ERR [${p.id}]: ${(e as Error).message?.slice(0, 100)}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`  V-VISA Product Migration${DRY_RUN ? ' [DRY RUN — no writes]' : ''}`);
  console.log('══════════════════════════════════════════════════════════\n');

  // DB baseline
  const [dbTotal, dbActive, dbCountries] = await Promise.all([
    db.visaProduct.count(), db.visaProduct.count({ where: { isActive: true } }), db.country.count(),
  ]);
  console.log(`Current DB:  ${dbTotal} products (${dbActive} active), ${dbCountries} countries\n`);

  // Collect existing IDs to detect what's new vs. already imported
  const existingIds = new Set((await db.visaProduct.findMany({ select: { id: true } })).map(p => p.id));

  // Load sources
  console.log('Loading sources...');
  const catalogueV1 = loadCatalogueV1();
  console.log(`  catalogue-v1-proof:     ${catalogueV1.length} products`);
  const vvisasSrc = loadVvisasSource();
  console.log(`  vvisas-source:          ${vvisasSrc.length} products`);

  const allSources = [...catalogueV1, ...vvisasSrc];
  console.log(`  Total raw:              ${allSources.length}\n`);

  // Dedup by ID first, then by country+name
  const seen = new Map<string, CatalogueProduct>();
  const seenByKey = new Map<string, CatalogueProduct>();
  let dupeCount = 0;
  for (const p of allSources) {
    if (!p.id) continue;
    if (seen.has(p.id)) { dupeCount++; continue; }
    const key = `${normCountry(p.destination ?? '')}::${p.name?.toLowerCase().trim()}`;
    if (seenByKey.has(key)) { dupeCount++; continue; }
    seen.set(p.id, p);
    seenByKey.set(key, p);
  }
  const unique = Array.from(seen.values());
  const newProducts = unique.filter(p => !existingIds.has(p.id));
  const existingMatch = unique.filter(p => existingIds.has(p.id));

  // Category summary
  const catDist = new Map<string, number>();
  const countryDist = new Map<string, number>();
  for (const p of unique) {
    const cat = normCat(p.category ?? '', p.name ?? '');
    catDist.set(cat, (catDist.get(cat) ?? 0) + 1);
    const country = normCountry(p.destination ?? 'Unknown');
    countryDist.set(country, (countryDist.get(country) ?? 0) + 1);
  }

  console.log('══ INVENTORY REPORT ══════════════════════════════════════');
  console.log(`  Raw products loaded:    ${allSources.length}`);
  console.log(`  After deduplication:   ${unique.length}`);
  console.log(`  Already in DB:         ${existingMatch.length}`);
  console.log(`  New (to be imported):  ${newProducts.length}`);
  console.log(`  Duplicates removed:    ${dupeCount}`);
  console.log(`  Countries in sources:  ${countryDist.size}`);
  console.log('');
  console.log('  Category distribution:');
  for (const [cat, n] of [...catDist.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(22)} ${n}`);
  }
  console.log('');
  console.log('  Countries (new products only):');
  const newCountryDist = new Map<string, number>();
  for (const p of newProducts) {
    const c = normCountry(p.destination ?? 'Unknown');
    newCountryDist.set(c, (newCountryDist.get(c) ?? 0) + 1);
  }
  for (const [c, n] of [...newCountryDist.entries()].sort()) {
    console.log(`    ${c.padEnd(30)} ${n}`);
  }

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] No changes written.\n');
    await db.$disconnect();
    return;
  }

  // Warm country cache from DB
  const dbCountryList = await db.country.findMany({ select: { id: true, name: true, code: true } });
  for (const c of dbCountryList) countryCache.set(c.name, c.id);

  // Import only NEW products (don't overwrite existing — they may have manual edits)
  console.log(`\nImporting ${newProducts.length} new products...`);
  const stats = { ok: 0, err: 0, skip: 0 };
  for (const [i, p] of newProducts.entries()) {
    await upsertProduct(p, 10000 + i, stats); // high displayOrder so they don't override existing
    if ((i + 1) % 10 === 0) process.stdout.write(`  ${i + 1}/${newProducts.length} done...\r`);
  }

  // Also update existing products that we have full pricing data for
  const existingWithPricing = existingMatch.filter(p => p.pricing?.totalAmountMinor);
  if (existingWithPricing.length > 0) {
    console.log(`\nUpdating pricing for ${existingWithPricing.length} existing products...`);
    for (const p of existingWithPricing) {
      try {
        const priceId = `${p.id}-price`;
        const existing = await db.visaPrice.findFirst({ where: { visaProductId: p.id, isActive: true } });
        if (!existing) {
          await db.visaPrice.upsert({
            where: { id: priceId },
            update: { isActive: true, totalAmountMinor: p.pricing!.totalAmountMinor! },
            create: {
              id: priceId, visaProductId: p.id, currency: 'INR',
              visaFeeMinor: p.pricing?.visaFeeMinor ?? 0,
              vvisaServiceFeeMinor: p.pricing?.vvisaServiceFeeMinor ?? 0,
              gstMinor: p.pricing?.gstMinor ?? 0,
              totalAmountMinor: p.pricing!.totalAmountMinor!,
              isActive: true,
            },
          });
        }
      } catch { /* pricing update is optional */ }
    }
  }

  // Final DB state
  const [finalTotal, finalActive, finalCountries, finalPrices] = await Promise.all([
    db.visaProduct.count(), db.visaProduct.count({ where: { isActive: true } }),
    db.country.count(), db.visaPrice.count({ where: { isActive: true } }),
  ]);

  console.log('\n══ MIGRATION COMPLETE ════════════════════════════════════');
  console.log(`  Imported:     ${stats.ok}`);
  console.log(`  Errors:       ${stats.err}`);
  console.log(`  DB before:    ${dbTotal} products`);
  console.log(`  DB after:     ${finalTotal} products (${finalActive} active)`);
  console.log(`  Countries:    ${finalCountries}`);
  console.log(`  Active prices: ${finalPrices}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await db.$disconnect();
}

main().catch(async e => { console.error(e); await db.$disconnect(); process.exit(1); });
