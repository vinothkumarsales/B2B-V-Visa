import { db } from '@/lib/db';
import { getAdminSession } from '@/server/admin/auth';
import { WalletCards, TrendingUp, TrendingDown, AlertCircle, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wallets' };

export default async function AdminWalletsPage() {
  const [admin, agencies, ledgerSum] = await Promise.all([
    getAdminSession(),
    db.agency.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
      },
    }).catch(() => []),
    db.walletLedgerEntry.aggregate({ _sum: { amountMinor: true } }).catch(() => ({ _sum: { amountMinor: 0 } })),
  ]);

  const totalBalance = (ledgerSum._sum?.amountMinor ?? 0) / 100;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Wallets</h2>
          <p className="text-sm text-slate-500 mt-1">Manage agent wallet balances and ledger entries.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors">
          <Plus className="size-4" /> Credit Wallet
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <WalletCards className="size-5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-slate-500">Total Balance</span>
          </div>
          <p className="text-3xl font-black text-slate-900">₹{totalBalance.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">Across all agent wallets</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="size-5 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-500">Active Agents</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{agencies.length}</p>
          <p className="text-xs text-slate-400 mt-1">With wallet accounts</p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertCircle className="size-5 text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-slate-500">Low Balance</span>
          </div>
          <p className="text-3xl font-black text-slate-900">—</p>
          <p className="text-xs text-slate-400 mt-1">Agents below ₹500</p>
        </div>
      </div>

      {/* Agent List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Agent Wallets</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {agencies.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <WalletCards className="size-12 mx-auto mb-3 text-slate-200" />
              <p className="font-medium">No agents found</p>
            </div>
          ) : (
            agencies.map(agency => (
              <div key={agency.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {agency.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{agency.name}</p>
                    <p className="text-xs text-slate-500">{agency._count.applications} applications</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">₹—</p>
                    <p className="text-[11px] text-slate-400">Balance</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    agency.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {agency.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
