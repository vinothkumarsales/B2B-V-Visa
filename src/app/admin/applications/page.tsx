import { db } from '@/lib/db';
import Link from 'next/link';
import { Search, Filter, ExternalLink } from 'lucide-react';
import type { ApplicationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Applications' };

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  DOCUMENTS_PENDING: 'bg-amber-100 text-amber-700',
  READY_FOR_REVIEW: 'bg-blue-100 text-blue-700',
  UNDER_INTERNAL_REVIEW: 'bg-blue-100 text-blue-700',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  SUBMISSION_PENDING: 'bg-cyan-100 text-cyan-700',
  SUBMITTED: 'bg-cyan-100 text-cyan-700',
  PROCESSING: 'bg-violet-100 text-violet-700',
  ADDITIONAL_DOCUMENTS_REQUIRED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const ALL_STATUSES: ApplicationStatus[] = [
  'DRAFT', 'DOCUMENTS_PENDING', 'READY_FOR_REVIEW', 'UNDER_INTERNAL_REVIEW',
  'PAYMENT_PENDING', 'PAID', 'SUBMISSION_PENDING', 'SUBMITTED', 'PROCESSING',
  'ADDITIONAL_DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELLED',
];

const PAGE_SIZE = 25;

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; partner?: string; page?: string; country?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim();
  const statusFilter = params.status as ApplicationStatus | undefined;
  const partnerFilter = params.partner;
  const countryFilter = params.country;
  const page = Math.max(1, parseInt(params.page ?? '1'));
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(partnerFilter ? { agencyId: partnerFilter } : {}),
    ...(countryFilter ? { destination: { contains: countryFilter, mode: 'insensitive' as const } } : {}),
    ...(query ? {
      OR: [
        { id: { contains: query, mode: 'insensitive' as const } },
        { internalId: { contains: query, mode: 'insensitive' as const } },
        { destination: { contains: query, mode: 'insensitive' as const } },
        { agency: { name: { contains: query, mode: 'insensitive' as const } } },
      ],
    } : {}),
  };

  const [applications, total, countries] = await Promise.all([
    db.visaApplication.findMany({
      where,
      take: PAGE_SIZE,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        agency: { select: { id: true, name: true } },
        visaProduct: { select: { publicTitle: true, name: true } },
        applicants: { select: { id: true }, take: 1 },
      },
    }).catch(() => []),
    db.visaApplication.count({ where }).catch(() => 0),
    db.visaApplication.findMany({ distinct: ['destination'], select: { destination: true }, orderBy: { destination: 'asc' } }).then(r => r.map(d => d.destination)).catch(() => []),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeFilters = [statusFilter, partnerFilter, countryFilter, query].filter(Boolean).length;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { q: query, status: statusFilter, partner: partnerFilter, country: countryFilter, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/admin/applications?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Applications</h2>
          <p className="text-sm text-slate-500 mt-1">{total.toLocaleString('en-IN')} total applications</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 space-y-3">
        <form method="GET" className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by ID, partner, destination…"
              className="w-full pl-10 pr-4 h-9 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>

          {/* Status filter */}
          <select
            name="status"
            defaultValue={statusFilter ?? ''}
            className="h-9 text-sm rounded-xl border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
            ))}
          </select>

          {/* Country filter */}
          <select
            name="country"
            defaultValue={countryFilter ?? ''}
            className="h-9 text-sm rounded-xl border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All Countries</option>
            {countries.slice(0, 60).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button type="submit" className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Search
          </button>
          {activeFilters > 0 && (
            <Link href="/admin/applications" className="h-9 px-4 flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              Clear ({activeFilters})
            </Link>
          )}
        </form>

        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div className="flex flex-wrap gap-2">
            {statusFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                Status: {statusFilter.replaceAll('_', ' ')}
                <Link href={buildUrl({ status: undefined, page: undefined })} className="hover:text-red-500 ml-1">×</Link>
              </span>
            )}
            {countryFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full">
                Country: {countryFilter}
                <Link href={buildUrl({ country: undefined, page: undefined })} className="hover:text-red-500 ml-1">×</Link>
              </span>
            )}
            {query && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full">
                Search: {query}
                <Link href={buildUrl({ q: undefined, page: undefined })} className="hover:text-red-500 ml-1">×</Link>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {applications.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <Filter className="size-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-900">No applications found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['ID', 'Partner', 'Destination', 'Product', 'Status', 'Amount', 'Created', ''].map(h => (
                      <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {applications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-600">{app.internalId ?? app.id.slice(0, 12)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/partners/${app.agencyId}`} className="text-xs font-semibold text-blue-600 hover:underline truncate max-w-[140px] block">
                          {app.agency.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">{app.destination}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px]">
                        <span className="truncate block">{app.visaProduct?.publicTitle ?? app.visaProduct?.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[app.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {app.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-900 whitespace-nowrap">
                        ₹{(app.totalAmountMinor / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/partners/${app.agencyId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink className="size-3" /> Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total.toLocaleString('en-IN')}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={buildUrl({ page: String(page - 1) })} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      ← Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={buildUrl({ page: String(page + 1) })} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
