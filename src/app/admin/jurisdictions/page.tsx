import { db } from '@/lib/db';
import { Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Countries' };

export default async function AdminCountriesPage() {
  const countries = await db.country.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { visaProducts: true } } },
  }).catch(() => []);

  const active = countries.filter(c => c.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Countries</h2>
          <p className="text-sm text-slate-500 mt-1">{countries.length} countries · {active} active</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Countries', value: countries.length },
          { label: 'Active', value: active },
          { label: 'With Products', value: countries.filter(c => c._count.visaProducts > 0).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 text-center">
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Globe className="size-4 text-slate-400" />
          <h3 className="font-bold text-slate-900">All Countries</h3>
        </div>
        {countries.length === 0 ? (
          <div className="py-16 text-center text-slate-400">No countries configured. Run the product import to populate countries.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Code', 'Country', 'Visa Products', 'Status'].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {countries.map(country => (
                  <tr key={country.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{country.code.toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900 text-sm">{country.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{country._count.visaProducts}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${country.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {country.isActive ? 'Active' : 'Inactive'}
                      </span>
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
