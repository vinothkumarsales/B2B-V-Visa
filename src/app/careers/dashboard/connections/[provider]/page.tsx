'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GlassPanel } from '@/components/connections/GlassPanel';
import { type ConnectionProviderId, type ConnectionStatusSummary } from '@/lib/connections';

async function fetchProvider(provider: string) {
  const res = await fetch(`/api/careers/connections/${provider}`, { cache: 'no-store' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message ?? 'Failed to load connection.');
  return data.data as ConnectionStatusSummary;
}

export default function ConnectionDetailPage({ params }: { params: { provider: string } }) {
  const provider = params.provider as ConnectionProviderId;
  const [data, setData] = useState<ConnectionStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProvider(provider)
      .then((item) => {
        if (!cancelled) {
          setData(item);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Unable to load provider detail.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const title = provider === 'mail' ? 'Mail' : 'LinkedIn';
  const description =
    provider === 'mail'
      ? 'Manage mail access, review connected state, and disconnect/reconnect.'
      : 'Manage LinkedIn access, review permission scopes, and disconnect/reconnect.';

  return (
    <main className="relative min-h-screen bg-[linear-gradient(155deg,#f8fbff_0%,#ffffff_44%,#f4f8fb_100%)] px-5 py-8 text-foreground lg:py-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/careers/dashboard/connections" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" />
          Connections
        </Link>

        <div className="mx-auto mt-8 max-w-4xl">
          <GlassPanel className="p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-2 text-sm text-slate-500">{description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={data?.status ?? 'idle'} />
              </div>
            </div>
          </GlassPanel>
        </div>

        <div className="mx-auto mt-6 max-w-4xl space-y-6">
          {loading ? (
            <GlassPanel className="p-8 text-center text-sm text-slate-600">Loading provider...</GlassPanel>
          ) : error ? (
            <GlassPanel className="p-8 text-center text-sm text-rose-700">{error}</GlassPanel>
          ) : (
            <>
              <GlassPanel className="p-6">
                <div className="grid gap-4">
                  <SectionRow title="Status" value={data?.status ?? 'idle'} />
                  <SectionRow title="Connected" value={data?.connected ? 'Yes' : 'No'} />
                  <SectionRow title="Last sync" value={data?.lastSync ?? 'Never'} />
                  <SectionRow title="Profile preview" value={data?.meta?.handle ?? data?.meta?.headline ?? 'Not available'} />
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Granted scopes</p>
                  <p className="text-sm text-slate-500">No scopes are available in the current fixture-safe implementation.</p>
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Danger zone</p>
                    <p className="text-sm text-slate-500">Disconnect removes UI state; revoke invalidates stored access.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/careers/connections/${provider}`, { method: 'DELETE' }).then(() =>
                          setData((current) => (current ? { ...current, connected: false, status: 'idle' } : current)),
                        );
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                    >
                      Disconnect
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/careers/connections/${provider}`, { method: 'POST' }).then(() =>
                          setData((current) => (current ? { ...current, status: 'idle' } : current)),
                        );
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Revoke access
                    </button>
                  </div>
                </div>
              </GlassPanel>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: ConnectionStatusSummary['status'] }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium backdrop-blur">
      <span className={`inline-flex size-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : status === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

function SectionRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/60 bg-white/70 p-4 text-sm backdrop-blur md:flex-row md:items-center md:justify-between">
      <span className="font-medium text-slate-900">{title}</span>
      <span className="text-slate-600">{value}</span>
    </div>
  );
}
