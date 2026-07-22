import React from 'react';
import { GlassPanel } from '@/components/connections/GlassPanel';
import { type ConnectionStatusSummary, type ConnectionStatus } from '@/lib/connections';
import { cn } from '@/lib/utils';

type Status = ConnectionStatus;

const STATUS_STYLES: Record<Status, string> = {
  idle: 'border-white/60 bg-white/70 text-slate-700',
  connecting: 'border-white/60 bg-white/80 text-slate-700 animate-pulse',
  connected: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
  limited: 'border-amber-200 bg-amber-50/80 text-amber-700',
  error: 'border-rose-200 bg-rose-50/80 text-rose-700',
  revoked: 'border-slate-200 bg-slate-50/80 text-slate-600',
};

const ICONS: Record<Status, React.ReactNode> = {
  idle: null,
  connecting: <span className="inline-flex size-2.5 rounded-full bg-sky-500" />,
  connected: <span className="inline-flex size-2.5 rounded-full bg-emerald-500" />,
  limited: <span className="inline-flex size-2.5 rounded-full bg-amber-500" />,
  error: <span className="inline-flex size-2.5 rounded-full bg-rose-500" />,
  revoked: <span className="inline-flex size-2.5 rounded-full bg-slate-400" />,
};

export function ConnectionStatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur', STATUS_STYLES[status])}>
      {ICONS[status]}
      {status.replace('_', ' ')}
    </span>
  );
}

function ProviderIcon({ provider }: { provider: ConnectionSummary['id'] }) {
  if (provider === 'mail') {
    return (
      <div className="flex size-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-sky-600 backdrop-blur">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 009.84 3.165l-7.59 5.25a2.25 2.25 0 01-2.07-1.227L1.545 5.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75H2.25" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex size-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-[#0A66C2] backdrop-blur">
      <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    </div>
  );
}

type ConnectionSummary = Pick<ConnectionStatusSummary, 'id' | 'name' | 'description' | 'status' | 'connected' | 'meta'>;

export function ConnectionCard({ provider, href, onConnect }: { provider: ConnectionSummary; href: string; onConnect?: () => void }) {
  const isActionPrimary = provider.status === 'idle' || provider.status === 'error' || provider.status === 'revoked';

  const primaryLabel =
    provider.status === 'idle' ? `Connect ${provider.name}` :
    provider.status === 'connecting' ? 'Connecting...' :
    provider.status === 'connected' || provider.status === 'limited' ? 'Manage' :
    provider.status === 'error' ? 'Retry' :
    'Reconnect';

  return (
    <GlassPanel className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ProviderIcon provider={provider.id} />
          <div>
            <p className="text-base font-semibold text-slate-900">{provider.name}</p>
            <p className="text-sm text-slate-500">{provider.description}</p>
          </div>
        </div>
        <ConnectionStatusBadge status={provider.status} />
      </div>

      <div className="grid gap-3 rounded-xl border border-white/60 bg-white/70 p-4 text-sm text-slate-600 backdrop-blur">
        {provider.meta?.handle && <div><span className="font-medium">Connected as </span>{provider.meta.handle}</div>}
        {provider.meta?.headline && <div><span className="font-medium">Headline:</span> {provider.meta.headline}</div>}
        {provider.status === 'limited' && provider.meta?.missingScopes?.length ? (
          <div>
            <p className="font-medium text-amber-700">Limited access</p>
            <p className="mt-1 text-amber-700/90">Missing: {provider.meta.missingScopes.join(', ')}</p>
          </div>
        ) : null}
        {provider.status === 'error' ? (
          <div>
            <p className="font-medium text-rose-700">Connection failed</p>
            <p className="mt-1 text-rose-700/90">Check permissions or retry in a moment.</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {provider.connected ? 'Connected and ready for governed use.' : 'No active connection.'}
        </p>
        {isActionPrimary ? (
          <button
            type="button"
            onClick={onConnect}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {primaryLabel}
          </button>
        ) : (
          <a
            href={href}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {primaryLabel}
          </a>
        )}
      </div>
    </GlassPanel>
  );
}
