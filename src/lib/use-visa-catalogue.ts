'use client';

import { useEffect, useState } from 'react';
import { mockVisaTypes } from '@/lib/mock-data';
import type { VisaType } from '@/types';

function mergeCatalogueProducts(primary: VisaType[], bundled: VisaType[]) {
  const byId = new Map<string, VisaType>();
  for (const product of [...bundled, ...primary]) {
    byId.set(product.id, product);
  }
  return Array.from(byId.values());
}

export function useVisaCatalogue() {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>(mockVisaTypes);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/visa-types', { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => {
        if (!active) return;
        const publishedProducts = Array.isArray(body.visaTypes) ? body.visaTypes : [];
        setVisaTypes(mergeCatalogueProducts(publishedProducts, mockVisaTypes));
      })
      .catch(() => {
        if (active) setVisaTypes(mockVisaTypes);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { visaTypes, loading };
}
