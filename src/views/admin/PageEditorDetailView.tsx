'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Save, Trash2, CheckCircle2, Clock, Landmark, Briefcase, Plus } from 'lucide-react';
import type { ApprovedVisaProduct } from '@/types';

export function PageEditorDetailView({ 
  product, 
  onBack,
  countries 
}: { 
  product: ApprovedVisaProduct; 
  onBack: () => void;
  countries: any[];
}) {
  const [saving, setSaving] = useState(false);
  
  // Basic states for form (in a real app, use react-hook-form)
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category || 'STANDARD');
  const [description, setDescription] = useState(product.purpose || '');
  
  // Pricing states (simplified for UI demonstration based on screenshot)
  const [processingTime, setProcessingTime] = useState(product.processingTime || '8-10 days');
  const govtFee = product.pricingLineItems?.find(l => l.type === 'CONSULAR_FEE')?.amountMinor || 0;
  const serviceFee = product.pricingLineItems?.find(l => l.type === 'VVISA_SERVICE_FEE')?.amountMinor || 0;
  const total = (product.priceMinor || 0) / 100;

  // Documents
  const [documents, setDocuments] = useState(product.documentRequirements?.mandatory || []);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    onBack();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full bg-white shadow-sm border border-slate-200">
            <ChevronLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{product.name}</h2>
            <p className="text-sm text-slate-500 mt-1">Editing live service page.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-6">
          <Save className="size-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-600" /> Basic Info — Editable
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Service Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-12 bg-slate-50 border-slate-200 rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value as any)}
                className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="STANDARD">Tourist Visas</option>
                <option value="MULTI_ENTRY">Business Visas</option>
                <option value="LIGHTNING_FAST">Express Visas</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
            <Textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="bg-slate-50 border-slate-200 rounded-xl min-h-[100px] resize-none"
              placeholder="Enter service description..."
            />
          </div>
        </div>

        {/* Pricing & Processing */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-600" /> Pricing & Processing — Editable
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50">
              <Clock className="size-5 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Processing Time</label>
              <Input value={processingTime} onChange={e => setProcessingTime(e.target.value)} className="h-9 text-center font-medium bg-white border-slate-200 rounded-lg max-w-[140px]" />
            </div>
            
            <div className="border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50">
              <Landmark className="size-5 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Govt Fee</label>
              <Input type="number" value={govtFee / 100} readOnly className="h-9 text-center font-medium bg-white border-slate-200 rounded-lg max-w-[140px]" />
            </div>
            
            <div className="border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50">
              <Briefcase className="size-5 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service Fee</label>
              <Input type="number" value={serviceFee / 100} readOnly className="h-9 text-center font-medium bg-white border-slate-200 rounded-lg max-w-[140px]" />
            </div>

            <div className="border-2 border-blue-100 bg-blue-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2">
              <div className="size-5 rounded-full border-2 border-blue-600 text-blue-600 flex items-center justify-center text-[10px] font-bold">₹</div>
              <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total</label>
              <div className="text-2xl font-bold text-blue-700">₹{total}</div>
            </div>
          </div>
        </div>

        {/* Required Documents */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-6 flex items-center gap-2">
            <div className="size-2 rounded-full bg-blue-600" /> Required Documents — Editable
          </h3>
          
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-900 mb-4">Required Documents</h4>
            
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No mandatory documents.</p>
            ) : (
              documents.map((doc, idx) => (
                <div key={doc.id || idx} className="flex items-center gap-3 bg-white p-2 pl-4 rounded-xl border border-slate-200 shadow-sm">
                  <CheckCircle2 className="size-5 text-blue-500 shrink-0" />
                  <Input 
                    value={doc.label} 
                    onChange={e => {
                      const newDocs = [...documents];
                      newDocs[idx].label = e.target.value;
                      setDocuments(newDocs);
                    }}
                    className="flex-1 h-10 border-transparent hover:border-slate-200 focus-visible:border-blue-500 focus-visible:ring-0 shadow-none bg-transparent"
                  />
                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
            
            <Button variant="outline" className="w-full mt-4 border-dashed border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-xl h-12">
              <Plus className="size-4 mr-2" /> Add Document
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
