'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Edit2, Globe, Building2, UserCircle2, Settings } from 'lucide-react';
import { PageEditorDetailView } from './PageEditorDetailView';
import type { ApprovedVisaProduct } from '@/types';

// Assuming data comes from getCataloguePageData
type PageEditorData = {
  products: ApprovedVisaProduct[];
  countries: any[];
};

export function PageEditorView({ data }: { data: PageEditorData }) {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<ApprovedVisaProduct | null>(null);

  const tabs = ['All', 'Tourist Visas', 'Business Visas', 'Other'];

  const filteredProducts = data.products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === 'Tourist Visas' && p.category !== 'STANDARD') return false;
    if (activeTab === 'Business Visas' && p.category !== 'MULTI_ENTRY') return false; // assuming mapping
    return true;
  });

  if (editingProduct) {
    return (
      <PageEditorDetailView 
        product={editingProduct} 
        onBack={() => setEditingProduct(null)} 
        countries={data.countries}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Page Editor</h2>
          <p className="text-sm text-slate-500 mt-1">Edit service content, pricing, requirements and FAQs — same layout as the live service page.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm">
          <Plus className="size-4 mr-2" /> Add Service
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 min-h-[70vh]">
        <div className="relative max-w-xl mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="Search for a service..." 
            className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'All' && <Globe className="size-4" />}
              {tab === 'Tourist Visas' && <UserCircle2 className="size-4" />}
              {tab === 'Business Visas' && <Building2 className="size-4" />}
              {tab === 'Other' && <Settings className="size-4" />}
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="group relative rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              {/* Blue Header Section */}
              <div className="relative h-40 bg-gradient-to-br from-blue-500 to-blue-700 p-4">
                <span className="absolute top-4 right-4 text-xs font-semibold text-white/90 uppercase tracking-wide">
                  {product.category || 'Visa'}
                </span>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-16 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <Globe className="size-8 text-white" />
                  </div>
                </div>

                {/* Edit Button Overlay */}
                <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button 
                    variant="secondary" 
                    className="bg-white hover:bg-white text-blue-700 rounded-xl px-6 font-semibold shadow-lg"
                    onClick={() => setEditingProduct(product)}
                  >
                    <Edit2 className="size-4 mr-2" /> Edit
                  </Button>
                </div>
              </div>

              {/* White Content Section */}
              <div className="p-5">
                <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{product.processingTime || '8-10 days'}</p>
                
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">Starting from</p>
                    <p className="text-xl font-bold text-blue-600">₹{(product.priceMinor || 0) / 100}</p>
                  </div>
                  <Edit2 className="size-4 text-blue-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
