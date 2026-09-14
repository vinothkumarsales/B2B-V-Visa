'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export type ImpersonationBannerProps = {
  targetAgencyName: string;
  targetVvisaUid: string;
  actorRole: string;
};

export function ImpersonationBanner({
  targetAgencyName,
  targetVvisaUid,
  actorRole,
}: ImpersonationBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleExit() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/impersonate/exit', { method: 'POST' });
        if (res.ok) {
          const data = (await res.json()) as { redirectUrl?: string };
          router.push(data.redirectUrl ?? '/admin/partners');
        }
      } catch {
        router.push('/admin/partners');
      }
    });
  }

  const roleLabel =
    actorRole === 'super_admin'
      ? 'SUPER ADMIN'
      : actorRole === 'operations_admin'
        ? 'ADMIN'
        : actorRole.replace(/_/g, ' ').toUpperCase();

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #7c2d12 0%, #991b1b 50%, #7c2d12 100%)',
        borderBottom: '2px solid #fca5a5',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <strong style={{ color: '#fca5a5', fontSize: '13px', letterSpacing: '0.05em' }}>
          ADMIN ACCESS
        </strong>
        <span style={{ color: '#fecaca' }}>
          Viewing Partner Account:{' '}
          <strong style={{ color: '#fff' }}>{targetAgencyName}</strong>
        </span>
        <span
          style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#fed7aa',
            letterSpacing: '0.04em',
          }}
        >
          {targetVvisaUid}
        </span>
        <span
          style={{
            background: 'rgba(252, 165, 165, 0.25)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#fca5a5',
            fontWeight: 600,
          }}
        >
          {roleLabel}
        </span>
      </div>

      <button
        onClick={handleExit}
        disabled={isPending}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '6px',
          color: '#fff',
          padding: '6px 14px',
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'background 0.15s',
          opacity: isPending ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
        }}
      >
        {isPending ? 'Exiting...' : '✕ Exit Partner Account'}
      </button>
    </div>
  );
}
