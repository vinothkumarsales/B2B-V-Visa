'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function PartnerSupportSessionLauncher({ partnerUid, agencyName }: { partnerUid: string; agencyName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/support-session/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ partnerUid, mode: 'view_only', reason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Unable to start support session.');
      router.push(`/admin/support-session/${body.session.id}/dashboard`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start support session.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Eye className="mr-2 size-4" />Open Partner Dashboard</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Open {agencyName}</DialogTitle><DialogDescription>Create an audited, read-only support session. Your admin identity remains active.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-vvisa-border-subtle bg-vvisa-surface-2 p-3 text-sm"><p className="font-medium">Access mode: View Only</p><p className="text-vvisa-text-muted">Support and Operations writes remain unavailable in this phase.</p></div>
          <div className="space-y-2"><Label htmlFor="support-reason">Reason</Label><Textarea id="support-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} placeholder="Why do you need to view this partner dashboard?" /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={startSession} disabled={pending || reason.trim().length < 8}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}Start View-Only Session</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
