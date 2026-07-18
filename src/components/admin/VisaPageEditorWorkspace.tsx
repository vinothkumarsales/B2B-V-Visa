'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Eye, FilePenLine, Globe2, Plus, Search, UploadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  prices: { isActive: boolean }[];
  documentRules: { requirementStatus: string }[];
};

export function VisaPageEditorWorkspace({ countries, products }: { countries: Country[]; products: Product[] }) {
  const [countryId, setCountryId] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const selectedCountry = countries.find((country) => country.id === countryId);
  const categories = useMemo(() => [...new Set(products.filter((product) => !countryId || product.countryId === countryId).map((product) => product.category))].sort(), [countryId, products]);
  const countryProducts = useMemo(() => products.filter((product) => {
    if (countryId && product.countryId !== countryId) return false;
    if (category && product.category !== category) return false;
    const value = `${product.name} ${product.publicTitle ?? ''} ${product.category}`.toLowerCase();
    return value.includes(query.trim().toLowerCase());
  }), [category, countryId, products, query]);

  async function createCountry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('');
    const response = await fetch('/api/admin/countries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: form.get('code'),
        name: form.get('name'),
        isActive: form.get('isActive') === 'true',
        reason: form.get('reason'),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error?.message ?? 'Country update failed.');
      return;
    }
    setMessage(`Country saved: ${body.country.name}. Refreshing editor...`);
    setTimeout(() => location.reload(), 700);
  }

  async function importVVisas(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage('');
    setIsImporting(true);
    const limit = String(form.get('limit') ?? '').trim();
    const country = String(form.get('country') ?? '').trim();
    const response = await fetch('/api/admin/import-vvisas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        publish: form.get('publish') === 'true',
        updateExisting: form.get('updateExisting') === 'true',
        limit: limit ? Number(limit) : undefined,
        country: country || undefined,
        reason: form.get('reason'),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setIsImporting(false);
    if (!response.ok) {
      setMessage(body.error?.message ?? 'V-VISAS import failed.');
      return;
    }
    const result = body.result;
    setMessage(`V-VISAS import complete: ${result.importedProducts} products, ${result.documents} documents, ${result.created} created, ${result.updated} updated.`);
    setTimeout(() => location.reload(), 900);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Visa Page Editor</h2>
          <p className="mt-1 text-sm text-vvisa-text-muted">Manage countries, categories, product cards, pricing and document rules shown in the B2B portal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/explore"><Eye className="size-4" />Preview portal</Link></Button>
          <Button asChild><a href="#country-editor"><Plus className="size-4" />Add country</a></Button>
        </div>
      </div>

      {message && <p className="rounded-md border border-vvisa-border-subtle bg-vvisa-surface p-3 text-sm">{message}</p>}

      <section className="border-y border-vvisa-border-subtle bg-vvisa-surface px-4 py-5 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><Globe2 className="size-4 text-primary" />Select country and category</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setCountryId(''); setCategory(''); }}
            className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${!countryId ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-vvisa-border-subtle bg-vvisa-surface hover:bg-vvisa-surface-2'}`}
          >
            All countries
            <span className="text-xs text-vvisa-text-muted">{products.length}</span>
          </button>
          {countries.map((country) => (
            <button
              key={country.id}
              type="button"
              onClick={() => { setCountryId(country.id); setCategory(''); }}
              className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${country.id === countryId ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-vvisa-border-subtle bg-vvisa-surface hover:bg-vvisa-surface-2'}`}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-vvisa-surface-2 text-[10px] font-bold">{country.code}</span>
              {country.name}
              <span className="text-xs text-vvisa-text-muted">{country._count?.visaProducts ?? products.filter((product) => product.countryId === country.id).length}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategory('')} className={`rounded-md border px-3 py-1.5 text-xs ${!category ? 'border-primary bg-primary/10 text-primary' : 'border-vvisa-border-subtle'}`}>All categories</button>
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-md border px-3 py-1.5 text-xs ${category === item ? 'border-primary bg-primary/10 text-primary' : 'border-vvisa-border-subtle'}`}>{item}</button>
          ))}
        </div>
        <div className="relative mt-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-vvisa-text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search visa products..." />
        </div>
      </section>

      <section id="country-editor" className="border-y border-vvisa-border-subtle bg-vvisa-surface px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Country editor</h3>
            <p className="text-xs text-vvisa-text-muted">Create or update a country shell before adding products. Writes are audited and feature-flag guarded.</p>
          </div>
          <Badge variant="outline">Audited</Badge>
        </div>
        <form onSubmit={createCountry} className="mt-4 grid gap-3 md:grid-cols-[120px_1fr_140px_1fr_auto]">
          <Input name="code" placeholder="Code" required minLength={2} maxLength={16} />
          <Input name="name" placeholder="Country name" required minLength={2} />
          <select name="isActive" defaultValue="true" className="h-10 rounded-md border border-vvisa-border-subtle bg-vvisa-surface px-3 text-sm">
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <Input name="reason" placeholder="Reason for country update" required minLength={8} />
          <Button type="submit">Save</Button>
        </form>
      </section>

      <section className="border-y border-vvisa-border-subtle bg-vvisa-surface px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">V-VISAS production import</h3>
            <p className="text-xs text-vvisa-text-muted">Import the approved in-repo catalogue snapshot into the active database. Default mode adds missing products and skips existing product details.</p>
          </div>
          <Badge variant="outline">148 products ready</Badge>
        </div>
        <form onSubmit={importVVisas} className="mt-4 grid gap-3 lg:grid-cols-[140px_150px_120px_1fr_1fr_auto]">
          <select name="publish" defaultValue="true" className="h-10 rounded-md border border-vvisa-border-subtle bg-vvisa-surface px-3 text-sm">
            <option value="true">Publish live</option>
            <option value="false">Draft only</option>
          </select>
          <select name="updateExisting" defaultValue="false" className="h-10 rounded-md border border-vvisa-border-subtle bg-vvisa-surface px-3 text-sm">
            <option value="false">Add missing only</option>
            <option value="true">Update existing</option>
          </select>
          <Input name="limit" inputMode="numeric" placeholder="Limit" />
          <Input name="country" placeholder="Country filter optional" />
          <Input name="reason" placeholder="Reason for production import" required minLength={8} />
          <Button type="submit" disabled={isImporting}>
            <UploadCloud className="size-4" />
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </form>
      </section>

      <section className="border-y border-vvisa-border-subtle bg-vvisa-surface px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Select visa product</h3>
            <p className="text-xs text-vvisa-text-muted">{selectedCountry?.name ?? 'All countries'} - {category || 'All categories'} - {countryProducts.length} products</p>
          </div>
          <Badge variant="outline">Draft / preview / publish</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {countryProducts.map((product) => (
            <Link
              key={product.id}
              href={`/admin/visa-products/${product.id}`}
              className="group min-h-32 rounded-md border border-vvisa-border-subtle bg-vvisa-surface p-4 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><FilePenLine className="size-4" /></div>
                <Badge variant={product.isActive ? 'default' : 'outline'}>{product.isActive ? 'Live' : 'Inactive'}</Badge>
              </div>
              <p className="mt-4 font-semibold group-hover:text-primary">{product.publicTitle ?? product.name}</p>
              <p className="mt-1 text-xs text-vvisa-text-muted">{product.category} · {product.processingTime}</p>
              <div className="mt-3 flex gap-3 text-[11px] text-vvisa-text-muted">
                <span>{product.prices.some((price) => price.isActive) ? 'Price active' : 'Price needed'}</span>
                <span>{product.documentRules.filter((rule) => rule.requirementStatus === 'PUBLISHED').length} documents</span>
              </div>
            </Link>
          ))}
          {countryProducts.length === 0 && (
            <div className="col-span-full border border-dashed border-vvisa-border-subtle p-8 text-center text-sm text-vvisa-text-muted">No visa products match this country, category, and search.</div>
          )}
        </div>
      </section>
    </div>
  );
}
