'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Edit2, FileText, Globe, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Country = { id: string; code: string; name: string; _count?: { visaProducts: number } };
type Product = {
  id: string;
  countryId: string | null;
  destination: string;
  name: string;
  publicTitle: string | null;
  category: string;
  processingTime: string;
  isActive: boolean;
  isFeatured: boolean;
  prices: { isActive: boolean; amountMinor?: number }[];
  documentRules: { requirementStatus: string }[];
};

const CATEGORY_LABELS: Record<string, string> = {
  STANDARD: 'Tourist',
  MULTI_ENTRY: 'Multi-Entry',
  LIGHTNING_FAST: 'Express',
  EVISA: 'e-Visa',
  STICKER: 'Sticker',
};

export function VisaPageEditorWorkspace({ countries, products }: { countries: Country[]; products: Product[] }) {
  const [countryId, setCountryId] = useState('');
  const [query, setQuery] = useState('');

  const countriesWithProducts = useMemo(() => {
    const ids = new Set(products.map(p => p.countryId));
    return countries.filter(c => ids.has(c.id));
  }, [countries, products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (countryId && p.countryId !== countryId) return false;
      if (!query.trim()) return true;
      const hay = `${p.name} ${p.publicTitle ?? ''} ${p.destination} ${p.category}`.toLowerCase();
      return hay.includes(query.trim().toLowerCase());
    });
  }, [countryId, query, products]);

  const selectedCountry = countries.find(c => c.id === countryId);

  return (
    <div className="flex gap-6 min-h-[calc(100vh-80px)]">

      {/* ── LEFT: Country Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 gap-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-2">Countries</p>
        <button
          onClick={() => setCountryId('')}
          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
            !countryId ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Globe className="size-4 shrink-0" />
            All Countries
          </span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${!countryId ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {products.length}
          </span>
        </button>
        <div className="mt-1 space-y-0.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-hide">
          {countriesWithProducts.map(country => {
            const count = products.filter(p => p.countryId === country.id).length;
            const active = countryId === country.id;
            return (
              <button
                key={country.id}
                onClick={() => setCountryId(country.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${
                  active ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className={`size-6 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {country.code.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate">{country.name}</span>
                </span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── RIGHT: Products Grid ── */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-11 h-11 bg-white border-slate-200 rounded-2xl focus-visible:ring-blue-500"
            />
          </div>
          <p className="text-sm font-medium text-slate-500 shrink-0">
            {selectedCountry ? selectedCountry.name : 'All Countries'} · <span className="font-bold text-slate-900">{filtered.length}</span> products
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filtered.map(product => {
            const catLabel = CATEGORY_LABELS[product.category] ?? product.category;
            const price = product.prices?.[0];
            const priceStr = price?.amountMinor
              ? `₹${(price.amountMinor / 100).toLocaleString('en-IN')}`
              : '—';
            const docCount = product.documentRules.filter(d => d.requirementStatus === 'PUBLISHED').length;

            return (
              <div key={product.id} className="group flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden">

                {/* Blue Header */}
                <div className="relative bg-gradient-to-br from-blue-600 to-blue-500 h-36 flex items-center justify-center px-4">
                  <span className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {catLabel}
                  </span>
                  {product.isFeatured && (
                    <span className="absolute bottom-3 left-3 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      Most Popular
                    </span>
                  )}
                  <div className="size-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                    <Globe className="size-7 text-white" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mb-1">
                    {product.publicTitle ?? product.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">{product.destination}</p>

                  {/* Meta Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="flex items-center gap-1 text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-100 rounded-full px-2 py-0.5">
                      <Clock className="size-3 text-slate-400" />
                      {product.processingTime?.split(' ')[0] || '—'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-100 rounded-full px-2 py-0.5">
                      <FileText className="size-3 text-slate-400" />
                      {docCount} docs
                    </span>
                    <span className={`flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 ${
                      product.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {product.isActive
                        ? <CheckCircle2 className="size-3" />
                        : <XCircle className="size-3" />}
                      {product.isActive ? 'Live' : 'Draft'}
                    </span>
                  </div>

                  {/* Price + Edit */}
                  <div className="mt-auto flex items-end justify-between pt-3 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</p>
                      <p className="text-xl font-black text-slate-900">{priceStr}</p>
                    </div>
                    <Link
                      href={`/admin/visa-products/${product.id}`}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white text-xs font-bold px-3 py-2 rounded-xl transition-all border border-blue-100 hover:border-transparent hover:shadow-sm"
                    >
                      <Edit2 className="size-3.5" /> Edit
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
              <FileText className="size-14 mb-4 text-slate-200" />
              <p className="font-semibold text-slate-900 text-lg">No products found</p>
              <p className="text-sm text-slate-500 mt-1">Try searching with a different term or selecting another country.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
