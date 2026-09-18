'use client';

import { useEffect, useState } from 'react';
import type { VisaType } from '@/types';

interface CatalogueState {
  visaTypes: VisaType[];
  categories: { name: string; count: number }[];
  timestamp: number;
}

let memoryCatalogue: CatalogueState | null = null;
let inFlightPromise: Promise<CatalogueState> | null = null;

export function useVisaCatalogue() {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>(() => memoryCatalogue?.visaTypes ?? []);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>(() => memoryCatalogue?.categories ?? []);
  const [loading, setLoading] = useState<boolean>(() => !memoryCatalogue || memoryCatalogue.visaTypes.length === 0);

  useEffect(() => {
    let active = true;

    async function load() {
      // If we have cached memory catalogue (< 2 minutes old), immediately render it
      if (memoryCatalogue && memoryCatalogue.visaTypes.length > 0) {
        if (active) {
          setVisaTypes(memoryCatalogue.visaTypes);
          setCategories(memoryCatalogue.categories);
          setLoading(false);
        }
        if (Date.now() - memoryCatalogue.timestamp < 120_000) {
          return; // Still fresh, skip background revalidation
        }
      }

      // Deduplicate in-flight fetch across multiple components
      if (!inFlightPromise) {
        inFlightPromise = fetch('/api/visa-types', { credentials: 'same-origin' })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to fetch catalogue'))))
          .then((body) => {
            const publishedProducts = Array.isArray(body.visaTypes) ? body.visaTypes : [];
            const cats = Array.isArray(body.categories) ? body.categories : [];
            const newState: CatalogueState = {
              visaTypes: publishedProducts,
              categories: cats,
              timestamp: Date.now(),
            };
            memoryCatalogue = newState;
            return newState;
          })
          .finally(() => {
            inFlightPromise = null;
          });
      }

      try {
        const result = await inFlightPromise;
        if (active) {
          setVisaTypes(result.visaTypes);
          setCategories(result.categories);
          setLoading(false);
        }
      } catch {
        if (active && (!memoryCatalogue || memoryCatalogue.visaTypes.length === 0)) {
          setVisaTypes([]);
          setCategories([]);
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return { visaTypes, categories, loading };
}
