import { db } from '@/lib/db';
import Link from 'next/link';
import { BarChart2, Globe, TrendingDown, TrendingUp, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analytics' };

// ── helpers ──────────────────────────────────────────────────────────────────
function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-300',
  DOCUMENTS_PENDING: 'bg-amber-400',
  READY_FOR_REVIEW: 'bg-blue-400',
  UNDER_INTERNAL_REVIEW: 'bg-blue-500',
  PAYMENT_PENDING: 'bg-orange-400',
  PAID: 'bg-emerald-300',
  SUBMISSION_PENDING: 'bg-cyan-400',
  SUBMITTED: 'bg-cyan-500',
  PROCESSING: 'bg-violet-400',
  ADDITIONAL_DOCUMENTS_REQUIRED: 'bg-amber-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  CANCELLED: 'bg-slate-400',
};

// ── page ─────────────────────────────────────────────────────────────────────
export default async function AdminAnalyticsPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // All queries in parallel
  const [
    applicationsByStatus,
    appsByCountry,
    appsByProduct,
    partnerStatusBreakdown,
    approvedMonth,
    rejectedMonth,
    totalAppsMonth,
    dailyApps,
  ] = await Promise.all([
    // Applications grouped by status
    db.visaApplication.groupBy({ by: ['status'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }).catch(() => []),

    // Top countries
    db.visaApplication.groupBy({
      by: ['destination'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }).catch(() => []),

    // Top visa products
    db.visaApplication.groupBy({
      by: ['visaProductId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }).catch(() => []),

    // Partner status breakdown
    db.agency.groupBy({ by: ['status'], _count: { id: true } }).catch(() => []),

    // Approved this month
    db.visaApplication.count({ where: { status: 'APPROVED', updatedAt: { gte: monthStart } } }).catch(() => 0),

    // Rejected this month
    db.visaApplication.count({ where: { status: 'REJECTED', updatedAt: { gte: monthStart } } }).catch(() => 0),

    // Total apps this month
    db.visaApplication.count({ where: { createdAt: { gte: monthStart } } }).catch(() => 0),

    // Daily apps last 30 days
    db.visaApplication.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }).catch(() => []),
  ]);

  // Build daily count map
  const dailyCountMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyCountMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const app of dailyApps) {
    const key = new Date(app.createdAt).toISOString().slice(0, 10);
    if (key in dailyCountMap) dailyCountMap[key]++;
  }
  const dailyEntries = Object.entries(dailyCountMap);
  const maxDaily = Math.max(...Object.values(dailyCountMap), 1);

  // Product name lookup
  const productIds = appsByProduct.map(a => a.visaProductId);
  const products = productIds.length
    ? await db.visaProduct.findMany({ where: { id: { in: productIds } }, select: { id: true, publicTitle: true, name: true, destination: true } })
    : [];
  const productMap = new Map(products.map(p => [p.id, p.publicTitle ?? p.name]));

  const totalApps = applicationsByStatus.reduce((s, r) => s + r._count.id, 0);
  const totalPartners = partnerStatusBreakdown.reduce((s, r) => s + r._count.id, 0);
  const approvalRate = (approvedMonth + rejectedMonth) > 0
    ? Math.round((approvedMonth / (approvedMonth + rejectedMonth)) * 100)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-sm text-slate-500 mt-1">Real-time data from your database. No fabricated metrics.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: totalApps, icon: BarChart2, color: 'bg-blue-50 text-blue-600' },
          { label: 'This Month', value: totalAppsMonth, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Approval Rate', value: approvalRate !== null ? `${approvalRate}%` : '—', icon: TrendingUp, color: 'bg-violet-50 text-violet-600' },
          { label: 'Total Partners', value: totalPartners, icon: Users, color: 'bg-amber-50 text-amber-600' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
              <div className={`size-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <Icon className="size-4" />
              </div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Daily activity chart (last 30 days) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="font-bold text-slate-900 mb-1">Applications — Last 30 Days</h3>
        <p className="text-xs text-slate-500 mb-6">Daily submission count from {thirtyDaysAgo.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to today</p>
        {totalApps === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No application data yet.</div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {dailyEntries.map(([date, count]) => {
              const h = maxDaily > 0 ? Math.round((count / maxDaily) * 100) : 0;
              const d = new Date(date);
              const isToday = date === new Date().toISOString().slice(0, 10);
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${count}`}>
                  <div
                    className={`w-full rounded-t transition-all ${isToday ? 'bg-blue-600' : 'bg-blue-200 group-hover:bg-blue-400'}`}
                    style={{ height: `${Math.max(h, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-slate-400">{thirtyDaysAgo.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          <span className="text-[10px] text-slate-400">Today</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications by status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="font-bold text-slate-900 mb-5">Applications by Status</h3>
          {applicationsByStatus.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {applicationsByStatus.map(r => {
                const barPct = pct(r._count.id, totalApps);
                return (
                  <div key={r.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{r.status.replaceAll('_', ' ')}</span>
                      <span className="text-xs font-bold text-slate-900">{r._count.id} <span className="text-slate-400 font-normal">({barPct}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div
                        className={`h-2 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-slate-400'}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Partner status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="font-bold text-slate-900 mb-5">Partner Distribution</h3>
          {partnerStatusBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No partners yet.</p>
          ) : (
            <div className="space-y-3">
              {partnerStatusBreakdown.map(r => {
                const barPct = pct(r._count.id, totalPartners);
                const color = r.status === 'APPROVED' ? 'bg-emerald-500' : r.status === 'SUSPENDED' ? 'bg-red-500' : r.status === 'UNDER_REVIEW' ? 'bg-blue-500' : 'bg-amber-400';
                return (
                  <div key={r.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{r.status.replaceAll('_', ' ')}</span>
                      <span className="text-xs font-bold text-slate-900">{r._count.id} <span className="text-slate-400 font-normal">({barPct}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top countries */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="font-bold text-slate-900 mb-5">Top Destinations</h3>
          {appsByCountry.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {appsByCountry.map((r, i) => {
                const maxCount = appsByCountry[0]._count.id;
                return (
                  <div key={r.destination} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 truncate">{r.destination}</span>
                        <span className="text-xs font-bold text-slate-900 ml-2 shrink-0">{r._count.id}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct(r._count.id, maxCount)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="font-bold text-slate-900 mb-5">Most-Used Visa Products</h3>
          {appsByProduct.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {appsByProduct.map((r, i) => {
                const name = productMap.get(r.visaProductId) ?? r.visaProductId.slice(0, 16) + '…';
                const maxCount = appsByProduct[0]._count.id;
                return (
                  <div key={r.visaProductId} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Link href={`/admin/visa-products/${r.visaProductId}`} className="text-xs font-semibold text-slate-700 truncate hover:text-blue-600 transition-colors">
                          {name}
                        </Link>
                        <span className="text-xs font-bold text-slate-900 ml-2 shrink-0">{r._count.id}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${pct(r._count.id, maxCount)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* This month summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
        <h3 className="font-bold text-slate-900 mb-5">This Month Summary</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-black text-emerald-600">{approvedMonth}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Approved</p>
          </div>
          <div>
            <p className="text-3xl font-black text-red-500">{rejectedMonth}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Rejected</p>
          </div>
          <div>
            <p className="text-3xl font-black text-blue-600">{approvalRate !== null ? `${approvalRate}%` : '—'}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Approval Rate</p>
          </div>
        </div>
        {(approvedMonth + rejectedMonth) === 0 && (
          <p className="text-center text-xs text-slate-400 mt-4">No completed applications this month yet.</p>
        )}
      </div>
    </div>
  );
}
