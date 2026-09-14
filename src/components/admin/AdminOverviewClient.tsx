'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Archive, BadgeIndianRupee, BookUser, Briefcase,
  CalendarCheck, ChevronDown, ClipboardList,
  Download, Edit2, FileWarning, Globe, HandshakeIcon, HeartHandshake,
  MessageSquare, Phone, RefreshCw, Settings2, Target,
  TrendingUp, Users, WalletCards, X, Check, AlertCircle
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
type Overview = {
  totalPartners: number | null;
  activePartners: number | null;
  newPartnersToday: number | null;
  pendingPartnerApprovals: number | null;
  totalApplications: number | null;
  applicationsSubmittedToday: number | null;
  pendingPayments: number | null;
  underProcessing: number | null;
  walletBalanceTotalMinor: number | null;
  pendingApplicationDrafts: number | null;
  approvedThisMonth: number | null;
  rejectedThisMonth: number | null;
  countriesPublished: number | null;
  visaProductsPublished: number | null;
  draftChanges: number | null;
  failedIntegrations: number | null;
  applicationsRequiringAttention: number | null;
  recentApplications: Array<{
    id: string;
    destination: string;
    visaType: string;
    status: string;
    createdAt: Date | string;
    agency: { name: string };
  }>;

};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null, prefix = '') {
  if (n === null) return '—';
  return prefix + n.toLocaleString('en-IN');
}

function statusColor(status: string) {
  if (['APPROVED', 'COMPLETED'].includes(status)) return 'bg-emerald-100 text-emerald-700';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'bg-red-100 text-red-700';
  if (['PAYMENT_PENDING', 'DRAFT'].includes(status)) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

// ── Report Section IDs ───────────────────────────────────────────────────────
type ReportSection = 'acquisition' | 'business' | 'relationship' | 'operations' | 'nextday';
type ReportPeriod = 'today' | 'week' | 'month';

const REPORT_DEFAULTS: Record<ReportSection, Array<{ key: string; label: string; icon: React.ElementType }>> = {
  acquisition: [
    { key: 'new_agents', label: 'New agents identified', icon: Users },
    { key: 'agents_contacted', label: 'Agents contacted', icon: Phone },
    { key: 'conversations', label: 'Meaningful conversations', icon: MessageSquare },
    { key: 'meetings', label: 'Meetings', icon: CalendarCheck },
    { key: 'registrations', label: 'Registrations', icon: BookUser },
  ],
  business: [
    { key: 'new_cases', label: 'New cases', icon: Archive },
    { key: 'active_cases', label: 'Active cases', icon: RefreshCw },
    { key: 'completed_cases', label: 'Completed cases', icon: Check },
    { key: 'revenue', label: 'Revenue (₹)', icon: BadgeIndianRupee },
    { key: 'collections', label: 'Collections (₹)', icon: WalletCards },
    { key: 'pending_payments', label: 'Pending payments', icon: AlertCircle },
  ],
  relationship: [
    { key: 'active_agents', label: 'Active agents', icon: HeartHandshake },
    { key: 'repeat_agents', label: 'Repeat agents', icon: HandshakeIcon },
    { key: 'dormant_recovered', label: 'Dormant agents recovered', icon: RefreshCw },
    { key: 'referrals', label: 'Referrals', icon: Users },
  ],
  operations: [
    { key: 'delayed_cases', label: 'Delayed cases', icon: AlertCircle },
    { key: 'escalations', label: 'Escalations', icon: ChevronDown },
    { key: 'complaints', label: 'Complaints', icon: FileWarning },
    { key: 'document_issues', label: 'Document issues', icon: ClipboardList },
  ],
  nextday: [
    { key: 'planned_meetings', label: 'Planned meetings', icon: CalendarCheck },
    { key: 'priority_agents', label: 'Priority agents', icon: Target },
    { key: 'expected_cases', label: 'Expected cases', icon: Briefcase },
    { key: 'key_actions', label: 'Key actions', icon: Settings2 },
  ],
};

const SECTION_META: Record<ReportSection, { label: string; color: string; icon: React.ElementType }> = {
  acquisition: { label: 'Agent Acquisition', color: 'border-blue-500', icon: Users },
  business: { label: 'Business', color: 'border-emerald-500', icon: Briefcase },
  relationship: { label: 'Relationship', color: 'border-violet-500', icon: HeartHandshake },
  operations: { label: 'Operations', color: 'border-amber-500', icon: Settings2 },
  nextday: { label: 'Next-Day Plan', color: 'border-rose-500', icon: CalendarCheck },
};

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminOverviewClient({ data }: { data: Overview }) {
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [reportValues, setReportValues] = useState<Record<string, Record<string, string>>>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_report_values');
      if (saved) setReportValues(JSON.parse(saved));
    } catch {}
  }, []);

  function saveValue(section: ReportSection, key: string, value: string) {
    setReportValues(prev => {
      const next = { ...prev, [section]: { ...(prev[section] ?? {}), [key]: value } };
      try { localStorage.setItem('admin_report_values', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function getValue(section: ReportSection, key: string) {
    return reportValues[section]?.[key] ?? '';
  }

  function exportReport() {
    const lines: string[] = [
      `=== V-VISA DAILY REPORT — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} ===`,
      '',
    ];
    (Object.entries(SECTION_META) as [ReportSection, typeof SECTION_META[ReportSection]][]).forEach(([sectionKey, meta]) => {
      lines.push(`## ${meta.label}`);
      REPORT_DEFAULTS[sectionKey].forEach(({ key, label }) => {
        const val = getValue(sectionKey, key) || '—';
        lines.push(`  ${label}: ${val}`);
      });
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vvisa-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Pie chart data
  const total = (data.totalPartners ?? 0);
  const active = Math.min(data.activePartners ?? 0, total);
  const pending = Math.min(data.pendingPartnerApprovals ?? 0, total - active);
  const newToday = Math.min(data.newPartnersToday ?? 0, total - active - pending);
  const safePct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  const pActive = safePct(active);
  const pPending = safePct(pending);
  const pNew = safePct(newToday);
  const pOther = 100 - pActive - pPending - pNew;
  const gradient = total > 0
    ? `conic-gradient(#2563eb 0% ${pActive}%, #f59e0b ${pActive}% ${pActive + pPending}%, #10b981 ${pActive + pPending}% ${pActive + pPending + pNew}%, #e2e8f0 ${pActive + pPending + pNew}% 100%)`
    : 'conic-gradient(#e2e8f0 0% 100%)';

  return (
    <div className="space-y-8 pb-16">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Live snapshot of your V-VISA B2B platform.</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Download className="size-4" /> Export Report
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Total Partners', icon: Users, value: fmt(data.totalPartners),
            sub: `${fmt(data.newPartnersToday)} new today`, color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Active Partners', icon: Globe, value: fmt(data.activePartners),
            sub: `${fmt(data.pendingPartnerApprovals)} pending approval`, color: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Total Applications', icon: Archive, value: fmt(data.totalApplications),
            sub: `${fmt(data.applicationsSubmittedToday)} submitted today`, color: 'bg-violet-50 text-violet-600',
          },
          {
            label: 'Wallet Balance', icon: WalletCards,
            value: data.walletBalanceTotalMinor !== null ? `₹${((data.walletBalanceTotalMinor ?? 0) / 100).toLocaleString('en-IN')}` : '—',
            sub: `${fmt(data.pendingPayments)} payments pending`, color: 'bg-amber-50 text-amber-600',
          },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
              <div className="flex items-center justify-between mb-4">
                <div className={`size-10 rounded-2xl flex items-center justify-center ${card.color}`}>
                  <Icon className="size-5" />
                </div>
                <TrendingUp className="size-4 text-slate-300" />
              </div>
              <p className="text-3xl font-black text-slate-900">{card.value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{card.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Middle Row: Pie + Applications ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pie Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
          <h3 className="font-bold text-slate-900 mb-1">Total Visitors & Partners</h3>
          <p className="text-xs text-slate-500 mb-6">Partner distribution overview</p>
          
          <div className="flex items-center gap-6">
            {/* Pie */}
            <div className="relative shrink-0">
              <div
                style={{ background: gradient }}
                className="size-36 rounded-full"
              />
              <div className="absolute inset-[18px] rounded-full bg-white flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-black text-slate-900">{fmt(data.totalPartners)}</p>
                  <p className="text-[10px] font-bold text-slate-400">TOTAL</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 flex-1">
              {[
                { label: 'Active', value: active, color: 'bg-blue-600', pct: pActive },
                { label: 'Pending', value: pending, color: 'bg-amber-500', pct: pPending },
                { label: 'New Today', value: newToday, color: 'bg-emerald-500', pct: pNew },
                { label: 'Other', value: Math.max(0, total - active - pending - newToday), color: 'bg-slate-200', pct: pOther },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`size-2.5 rounded-full shrink-0 ${item.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                      <span className="text-xs font-bold text-slate-900">{item.value}</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full mt-1">
                      <div className={`h-1 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Recent Applications</h3>
            <Link href="/admin/applications" className="text-xs font-bold text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {data.recentApplications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No applications yet.</p>
            ) : (
              data.recentApplications.map(app => (
                <div key={app.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 text-sm truncate">{app.destination} · {app.visaType}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{app.agency.name}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ml-4 shrink-0 ${statusColor(app.status)}`}>
                    {app.status.replaceAll('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Under Review', value: fmt(data.underProcessing), color: 'text-blue-600' },
          { label: 'Approved (Month)', value: fmt(data.approvedThisMonth), color: 'text-emerald-600' },
          { label: 'Rejected (Month)', value: fmt(data.rejectedThisMonth), color: 'text-red-600' },
          { label: 'Countries', value: fmt(data.countriesPublished), color: 'text-violet-600' },
          { label: 'Visa Products', value: fmt(data.visaProductsPublished), color: 'text-blue-600' },
          { label: 'Needs Attention', value: fmt(data.applicationsRequiringAttention), color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Daily Report ── */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-xl">Daily Business Report</h3>
            <p className="text-sm text-slate-500 mt-1">Fill in your daily metrics for management reporting.</p>
          </div>
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100 gap-1">
            {(['today', 'week', 'month'] as ReportPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${period === p ? 'bg-white shadow text-blue-700 border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(Object.entries(REPORT_DEFAULTS) as [ReportSection, typeof REPORT_DEFAULTS[ReportSection]][]).map(([sectionKey, items]) => {
            const meta = SECTION_META[sectionKey];
            const SectionIcon = meta.icon;
            return (
              <div key={sectionKey} className={`rounded-2xl border-l-4 ${meta.color} bg-slate-50/60 border border-slate-100 p-5`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="size-8 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                    <SectionIcon className="size-4 text-slate-600" />
                  </div>
                  <h4 className="font-bold text-slate-800">{meta.label}</h4>
                </div>
                <div className="space-y-2">
                  {items.map(({ key, label, icon: ItemIcon }) => {
                    const fullKey = `${period}_${sectionKey}_${key}`;
                    const isEditing = editingKey === fullKey;
                    const val = getValue(sectionKey, `${period}_${key}`);
                    return (
                      <div key={key} className="flex items-center justify-between py-1.5 border-b border-slate-100/80 last:border-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ItemIcon className="size-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-medium text-slate-600 truncate">{label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          {isEditing ? (
                            <>
                              <input
                                autoFocus
                                type="text"
                                defaultValue={val}
                                onBlur={e => { saveValue(sectionKey, `${period}_${key}`, e.target.value); setEditingKey(null); }}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingKey(null); }}
                                className="w-20 text-right text-xs font-bold bg-white border border-blue-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"
                              />
                              <button onClick={() => setEditingKey(null)} className="text-slate-400 hover:text-red-500">
                                <X className="size-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={`text-xs font-bold min-w-[28px] text-right ${val ? 'text-slate-900' : 'text-slate-300'}`}>
                                {val || '—'}
                              </span>
                              <button
                                onClick={() => setEditingKey(fullKey)}
                                className="text-slate-300 hover:text-blue-500 transition-colors"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
