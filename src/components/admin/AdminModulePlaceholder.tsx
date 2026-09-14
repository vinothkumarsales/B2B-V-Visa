import { Settings2 } from 'lucide-react';

export async function AdminModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">This section is being set up. Full functionality coming soon.</p>
      </div>
      <div className="bg-white rounded-3xl p-16 shadow-sm border border-slate-200/60 flex flex-col items-center justify-center text-center">
        <div className="size-16 rounded-3xl bg-blue-50 flex items-center justify-center mb-4">
          <Settings2 className="size-8 text-blue-400" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          This module is available. Full management interface will be displayed here.
        </p>
      </div>
    </div>
  );
}
