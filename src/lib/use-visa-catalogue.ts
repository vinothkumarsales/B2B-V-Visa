'use client';

import { useEffect, useState } from 'react';
import { mockVisaTypes } from '@/lib/mock-data';
import type { VisaType } from '@/types';

export function useVisaCatalogue() {
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/visa-types', { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => {
        if (!active) return;
        setVisaTypes(Array.isArray(body.visaTypes) && body.visaTypes.length ? body.visaTypes : mockVisaTypes);
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
