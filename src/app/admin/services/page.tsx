import { db } from '@/lib/db';
import { Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Services' };

export default async function AdminServicesPage() {
  const [options, courierRules] = await Promise.all([
    db.visaProcessingOption.findMany({
      orderBy: { id: 'desc' },
      include: { visaProduct: { select: { publicTitle: true, name: true, destination: true } } },
      take: 100,
    }).catch(() => []),
    db.visaCourierRule.findMany({
      orderBy: { id: 'desc' },
      include: { visaProduct: { select: { publicTitle: true, name: true, destination: true } } },
      take: 100,
    }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Services</h2>
        <p className="text-sm text-slate-500 mt-1">Processing options and courier/delivery services configured per visa product.</p>
      </div>

      {/* Processing options */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Wrench className="size-4 text-slate-400" />
          <h3 className="font-bold text-slate-900">Processing Options</h3>
          <span className="ml-auto text-xs font-semibold text-slate-400">{options.length} entries</span>
        </div>
        {options.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No processing options configured. Add them via the Visa Product editor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Product', 'Processing Type', 'Centre', 'Status'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {options.map(opt => (
                  <tr key={opt.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                      {opt.visaProduct?.publicTitle ?? opt.visaProduct?.name ?? '—'}
                      <span className="text-slate-400 font-normal ml-1">· {opt.visaProduct?.destination}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{opt.processingType ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">{opt.processingCentreCity}</td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {opt.processingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Courier rules */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Wrench className="size-4 text-slate-400" />
          <h3 className="font-bold text-slate-900">Courier & Delivery Rules</h3>
          <span className="ml-auto text-xs font-semibold text-slate-400">{courierRules.length} entries</span>
        </div>
        {courierRules.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No courier rules configured.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Product', 'Courier Required', 'Direction', 'Passport Collection', 'Inbound Fee', 'Outbound Fee'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {courierRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                      {rule.visaProduct?.publicTitle ?? rule.visaProduct?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rule.courierRequired ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {rule.courierRequired ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{rule.courierDirection ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rule.passportCollectionAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {rule.passportCollectionAvailable ? 'Available' : 'No'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                      {rule.outboundCourierFeeMinor ? `₹${(rule.outboundCourierFeeMinor / 100).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-slate-900">
                      {rule.returnCourierFeeMinor ? `₹${(rule.returnCourierFeeMinor / 100).toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
