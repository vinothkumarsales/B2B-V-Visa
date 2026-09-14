'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { GlassPanel } from '@/components/connections/GlassPanel';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { cn } from '@/lib/utils';
import type { ConnectionStatusSummary } from '@/lib/connections';

async function fetchConnections() {
  const res = await fetch('/api/careers/connections', { cache: 'no-store' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message ?? 'Failed to load connections');
  return data.data.providers as ConnectionStatusSummary[];
}

function toStatusSummary(provider: string): ConnectionStatusSummary {
  return {
    id: provider as ConnectionStatusSummary['id'],
    name: provider === 'mail' ? 'Mail' : 'LinkedIn',
    description: provider === 'mail' ? 'Mailbox connection for recruiter outreach and drafts.' : 'Professional profile connection for discovery and outreach.',
    status: 'idle',
    connected: false,
    lastSync: null,
    meta: {},
  };
}

export default function ConnectionsHubPage() {
  const [providers, setProviders] = useState<ConnectionStatusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetchConnections()
      .then((items) => {
        if (!cancelled) {
          setProviders(items);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Unable to load connections.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const connectedCount = useMemo(() => providers.filter((p) => p.connected).length, [providers]);

  async function initiateConnect(provider: string) {
    setConnecting((current) => ({ ...current, [provider]: true }));
    try {
      const res = await fetch('/api/careers/connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Unable to start connection.');

      setProviders((current) => current.map((item) => (item.id === provider ? { ...item, status: 'connecting' } : item)));
      setTimeout(() => {
        setProviders((current) =>
          current.map((item) =>
            item.id === provider ? { ...toStatusSummary(item.id), status: 'connected', connected: true, lastSync: new Date().toISOString() } : item,
          ),
        );
      }, 1400);
    } catch (err) {
      setProviders((current) =>
        current.map((item) => (item.id === provider ? { ...toStatusSummary(item.id), status: 'error' } : item)),
      );
    } finally {
      setConnecting((current) => ({ ...current, [provider]: false }));
    }
  }

  return (
    <main className="relative min-h-screen bg-[linear-gradient(155deg,#f8fbff_0%,#ffffff_44%,#f4f8fb_100%)] px-5 py-8 text-foreground lg:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Link href="/careers/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                <ArrowLeft className="size-4" />
                Dashboard
              </Link>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Connections</h1>
              <p className="mt-2 text-sm text-slate-500">Connect Mail and LinkedIn for governed, privacy-first outreach.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur md:block">
              {connectedCount}/2 connected
            </div>
            <Link
              href="/careers/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="size-4" />
              Add another
            </Link>
          </div>
        </header>

        <section className="mx-auto mt-8 max-w-6xl">
          {loading ? (
            <GlassPanel className="p-8 text-center text-sm text-slate-600">Loading connections...</GlassPanel>
          ) : error ? (
            <GlassPanel className="p-8 text-center text-sm text-rose-700">{error}</GlassPanel>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {providers.map((provider) => (
                <ConnectionCard
                  key={provider.id}
                  provider={provider}
                  href={`/careers/dashboard/connections/${provider.id}`}
                  onConnect={() => initiateConnect(provider.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto mt-10 max-w-6xl">
          <GlassPanel className="p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-900">Need another integration?</p>
                <p className="text-sm text-slate-500">You can connect additional services from account settings when available.</p>
              </div>
              <Link
                href="/careers/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back to dashboard
              </Link>
            </div>
          </GlassPanel>
        </section>
      </div>
    </main>
  );
}
