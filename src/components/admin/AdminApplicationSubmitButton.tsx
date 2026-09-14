'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type SubmitApplication = {
  id: string;
  agencyName: string;
  partnerUid: string;
  applicantName: string;
  destination: string;
  visaType: string;
  documents: number;
  currency: string;
  totalAmountMinor: number;
};

export function AdminApplicationSubmitButton({
  application,
  supportSessionId,
}: {
  application: SubmitApplication;
  supportSessionId?: string;
}) {
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  async function submit() {
    setPending(true);
    const response = await fetch(`/api/admin/applications/${application.id}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation, reason, walletDeduction: false, supportSessionId }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'Application submitted for document processing.' : body.error?.message ?? 'Submission failed.');
    setPending(false);
    if (response.ok) setTimeout(() => location.reload(), 700);
  }

  return (
    <Dialog>
      <DialogTrigger asChild><Button size="sm">Submit</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Submit on behalf</DialogTitle></DialogHeader>
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p>{application.agencyName} · {application.partnerUid}</p>
          <p>{application.applicantName} · {application.destination} · {application.visaType}</p>
          <p>{application.documents} documents · {(application.totalAmountMinor / 100).toLocaleString('en-IN', { style: 'currency', currency: application.currency })}</p>
          <p className="text-vvisa-text-muted">Wallet impact: None. Wallet deduction remains disabled.</p>
        </div>
        <div><Label>Reason</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} /></div>
        <div><Label>Type SUBMIT</Label><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
        {message && <p className="text-sm">{message}</p>}
        <DialogFooter>
          <Button onClick={submit} disabled={pending || confirmation !== 'SUBMIT' || reason.trim().length < 8}>
            {pending ? 'Submitting...' : 'Confirm Submission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
