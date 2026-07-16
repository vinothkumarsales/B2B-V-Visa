'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Eye, FilePenLine, Globe2, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Country = { id: string; code: string; name: string };
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
  const [countryId, setCountryId] = useState(countries[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const selectedCountry = countries.find((country) => country.id === countryId);
  const countryProducts = useMemo(() => products.filter((product) => {
    if (countryId && product.countryId !== countryId) return false;
    const value = `${product.name} ${product.publicTitle ?? ''} ${product.category}`.toLowerCase();
    return value.includes(query.trim().toLowerCase());
  }), [countryId, products, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Visa Page Editor</h2>
          <p className="mt-1 text-sm text-vvisa-text-muted">Manage the product cards, pricing and document rules shown in the B2B portal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/explore"><Eye className="size-4" />Preview portal</Link></Button>
          <Button disabled title="Country creation requires a dedicated audited workflow"><Plus className="size-4" />Add country</Button>
        </div>
      </div>

      <section className="border-y border-vvisa-border-subtle bg-vvisa-surface px-4 py-5 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><Globe2 className="size-4 text-primary" />Select country</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {countries.map((country) => (
            <button
              key={country.id}
              type="button"
              onClick={() => setCountryId(country.id)}
              className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${country.id === countryId ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-vvisa-border-subtle bg-vvisa-surface hover:bg-vvisa-surface-2'}`}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-vvisa-surface-2 text-[10px] font-bold">{country.code}</span>
              {country.name}
            </button>
          ))}
        </div>
        <div className="relative mt-4 max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-vvisa-text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search visa products..." />
        </div>
      </section>

      <section className="border-y border-vvisa-border-subtle bg-vvisa-surface px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Select visa product</h3>
            <p className="text-xs text-vvisa-text-muted">{selectedCountry?.name ?? 'All countries'} · {countryProducts.length} products</p>
          </div>
          <Badge variant="outline">Published data source</Badge>
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
            <div className="col-span-full border border-dashed border-vvisa-border-subtle p-8 text-center text-sm text-vvisa-text-muted">No visa products match this country and search.</div>
          )}
        </div>
      </section>
    </div>
  );
}
