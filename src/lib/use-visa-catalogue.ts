'use client';

import { useEffect, useState } from 'react';
import type { VisaType } from '@/types';

export function useVisaCatalogue() {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/visa-types', { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => {
        if (!active) return;
        const publishedProducts = Array.isArray(body.visaTypes) ? body.visaTypes : [];
        const cats = Array.isArray(body.categories) ? body.categories : [];
        setVisaTypes(publishedProducts);
        setCategories(cats);
      })
      .catch(() => {
        if (active) {
          setVisaTypes([]);
          setCategories([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { visaTypes, categories, loading };
}

