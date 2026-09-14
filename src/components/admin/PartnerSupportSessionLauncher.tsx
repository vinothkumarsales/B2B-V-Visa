'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PartnerSupportSessionLauncher({ partnerUid, agencyName }: { partnerUid: string; agencyName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState('view_only');

  async function startSession() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/support-session/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ partnerUid, mode, reason }),
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
          <div className="space-y-2"><Label>Access mode</Label><Select value={mode} onValueChange={setMode}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="view_only">View Only</SelectItem><SelectItem value="support">Support</SelectItem><SelectItem value="operations">Operations</SelectItem></SelectContent></Select><p className="text-xs text-vvisa-text-muted">Operations is restricted to operations and super admins. All actions retain your admin identity.</p></div>
          <div className="space-y-2"><Label htmlFor="support-reason">Reason</Label><Textarea id="support-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} placeholder="Why do you need to view this partner dashboard?" /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={startSession} disabled={pending || reason.trim().length < 8}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}Start Session</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
