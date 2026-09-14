'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function EndSupportSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return <Button variant="outline" size="sm" disabled={pending} onClick={async () => {
    setPending(true);
    const response = await fetch('/api/admin/support-session/end', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    if (response.ok) router.push('/admin/partners');
    else setPending(false);
  }}>{pending ? 'Ending...' : 'Exit Session'}</Button>;
}
