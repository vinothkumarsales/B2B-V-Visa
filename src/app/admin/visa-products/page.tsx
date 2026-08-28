import { db } from '@/lib/db';
import Link from 'next/link';
import { BookOpen, Search, Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Visa Products' };

const CAT_ORDER = ['Tourist', 'Business', 'Study', 'Work', 'Job Seeker', 'Digital Nomad', 'Transit', 'Dependent', 'Family Visit', 'PR', 'Immigration', 'Medical', 'Other'];

export default async function AdminVisaProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; country?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const catFilter = params.cat;
  const countryFilter = params.country;
  const statusFilter = params.status;

  const where = {
    ...(q ? { OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { destination: { contains: q, mode: 'insensitive' as const } },
      { publicTitle: { contains: q, mode: 'insensitive' as const } },
    ]} : {}),
    ...(catFilter ? { category: catFilter } : {}),
    ...(countryFilter ? { destination: { contains: countryFilter, mode: 'insensitive' as const } } : {}),
    ...(statusFilter === 'active' ? { isActive: true } : statusFilter === 'inactive' ? { isActive: false } : {}),
  };

  const [products, allCategories, totalCount] = await Promise.all([
    db.visaProduct.findMany({
      where,
      orderBy: [{ destination: 'asc' }, { category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, publicTitle: true, destination: true,
        category: true, entry: true, validity: true, duration: true,
        processingTime: true, isActive: true, amountMinor: true, currency: true,
        prices: { where: { isActive: true }, take: 1, select: { totalAmountMinor: true } },
        documentRules: { select: { id: true } },
      },
    }).catch(() => []),
    db.visaProduct.groupBy({ by: ['category'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }).catch(() => []),
    db.visaProduct.count({ where }).catch(() => 0),
  ]);

  // Group by category for display
  type ProductItem = (typeof products)[number];
  const byCategory = new Map<string, ProductItem[]>();
  for (const p of products) {
    const cat = p.category ?? 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  // Sort categories in canonical order
  const sortedCats = [...byCategory.keys()].sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // All distinct countries for filter
  const allCountries = await db.visaProduct.findMany({
    distinct: ['destination'], select: { destination: true }, orderBy: { destination: 'asc' },
  }).then(r => r.map(x => x.destination)).catch(() => []);

  const activeFilters = [q, catFilter, countryFilter, statusFilter].filter(Boolean).length;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { q, cat: catFilter, country: countryFilter, status: statusFilter, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/visa-products?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Visa Products</h2>
          <p className="text-sm text-slate-500 mt-1">{totalCount} products · {allCategories.length} categories · {allCountries.length} countries</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <form method="GET" className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search products, countries…"
              className="w-full pl-10 pr-4 h-9 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>

          <select name="cat" defaultValue={catFilter ?? ''} className="h-9 text-sm rounded-xl border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Categories</option>
            {allCategories.map(c => <option key={c.category} value={c.category}>{c.category} ({c._count.id})</option>)}
          </select>

          <select name="country" defaultValue={countryFilter ?? ''} className="h-9 text-sm rounded-xl border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Countries</option>
            {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select name="status" defaultValue={statusFilter ?? ''} className="h-9 text-sm rounded-xl border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button type="submit" className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">Search</button>
          {activeFilters > 0 && (
            <Link href="/admin/visa-products" className="h-9 px-4 flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-slate-50">
              Clear ({activeFilters})
            </Link>
          )}
        </form>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Link href={buildUrl({ cat: undefined })} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${!catFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            All ({totalCount})
          </Link>
          {allCategories.map(c => (
            <Link key={c.category} href={buildUrl({ cat: c.category })}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${catFilter === c.category ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {c.category} ({c._count.id})
            </Link>
          ))}
        </div>
      </div>

      {/* Category-wise product list */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm py-24 flex flex-col items-center text-center">
          <BookOpen className="size-12 text-slate-200 mb-3" />
          <p className="font-semibold text-slate-900">No products found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCats.map(cat => {
            const catProducts = byCategory.get(cat)!;
            // Group by country within category
            const byCountry = new Map<string, ProductItem[]>();
            for (const p of catProducts) {
              if (!byCountry.has(p.destination)) byCountry.set(p.destination, []);
              byCountry.get(p.destination)!.push(p);
            }

            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white">{cat}</span>
                  <span className="text-sm font-semibold text-slate-700">{catProducts.length} products · {byCountry.size} countries</span>
                </div>

                <div className="divide-y divide-slate-50">
                  {[...byCountry.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([country, cProducts]) => (
                    <div key={country}>
                      <div className="px-5 py-2 bg-slate-50/30 flex items-center gap-2">
                        <Globe className="size-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{country}</span>
                        <span className="text-xs text-slate-400">· {cProducts.length}</span>
                      </div>
                      {cProducts.map(p => {
                        const price = p.prices[0]?.totalAmountMinor ?? p.amountMinor;
                        return (
                          <div key={p.id} className="px-5 py-3 flex items-center gap-4 hover:bg-blue-50/30 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-900 truncate">{p.publicTitle ?? p.name}</p>
                                {!p.isActive && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Inactive</span>}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {p.entry} Entry · {p.validity} validity · {p.duration} stay · {p.processingTime?.replace('Estimated processing time: ', '')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-slate-900">
                                {price ? `₹${(price / 100).toLocaleString('en-IN')}` : '—'}
                              </p>
                              <p className="text-[10px] text-slate-400">{p.documentRules.length} docs</p>
                            </div>
                            <Link
                              href={`/admin/visa-products/${p.id}`}
                              className="text-xs font-semibold text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              Edit →
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
