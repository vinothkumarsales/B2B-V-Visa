import { db } from '@/lib/db';
import { ShieldCheck, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audit Log' };

function actionColor(action: string) {
  if (action.includes('CREATE') || action.includes('IMPORT')) return 'bg-emerald-100 text-emerald-700';
  if (action.includes('DELETE') || action.includes('REJECT')) return 'bg-red-100 text-red-700';
  if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-700';
  if (action.includes('LOGIN') || action.includes('AUTH')) return 'bg-violet-100 text-violet-700';
  return 'bg-slate-100 text-slate-600';
}

export default async function AdminAuditLogsPage() {
  const auditLogs = await db.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { actorUser: true, agency: true },
  }).catch(() => []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
          <p className="text-sm text-slate-500 mt-1">
            Complete immutable history of all admin and portal actions. Last {auditLogs.length} events shown.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100">
          <ShieldCheck className="size-4" />
          <span className="text-sm font-bold">All writes audited</span>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: auditLogs.length, color: 'text-slate-900' },
          { label: 'Today', value: auditLogs.filter(l => new Date(l.createdAt) > new Date(new Date().setHours(0,0,0,0))).length, color: 'text-blue-600' },
          { label: 'Unique Actors', value: new Set(auditLogs.map(l => l.actorUserId).filter(Boolean)).size, color: 'text-violet-600' },
          { label: 'Action Types', value: new Set(auditLogs.map(l => l.action)).size, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100">
          <Activity className="size-5 text-slate-400" />
          <h3 className="font-bold text-slate-900">Recent Events</h3>
        </div>

        <div className="overflow-x-auto">
          {auditLogs.length === 0 ? (
            <div className="py-20 text-center">
              <Activity className="size-12 mx-auto mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">No audit events recorded yet.</p>
              <p className="text-sm text-slate-400 mt-1">Events will appear here as admins take actions.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-6 py-3">Time</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 py-3">Action</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 py-3">Actor</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 py-3">Resource</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-4 py-3">Partner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditLogs.map(event => (
                  <tr key={event.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap font-medium">
                      {new Date(event.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${actionColor(event.action)}`}>
                        {event.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                      {event.actorUser?.email ?? 'system'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{event.resourceType}</span>
                      {event.resourceId ? <span className="text-slate-400 ml-1">· {event.resourceId.slice(0, 12)}…</span> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {event.agency?.name ?? <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
