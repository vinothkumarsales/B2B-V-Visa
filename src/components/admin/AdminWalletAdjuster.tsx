'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShieldCheck } from 'lucide-react';

export function AdminWalletAdjuster({ uid }: { uid: string }) {
  const router = useRouter();
  const [canAdjust, setCanAdjust] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/partners/${uid}/wallet`)
      .then(res => res.json())
      .then(data => {
        if (data.adjustmentsEnabled) {
          setCanAdjust(true);
        }
      })
      .catch(() => {});
  }, [uid]);

  if (!canAdjust) return null;

  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      const amountMinor = Math.round(parseFloat(amount) * 100);
      const res = await fetch(`/api/admin/partners/${uid}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountMinor,
          type,
          reason,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust wallet');

      toast.success(`Successfully ${type === 'CREDIT' ? 'credited' : 'debited'} ₹${amount}`);
      setAmount('');
      setReason('');
      setConfirmOpen(false);
      
      router.refresh();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return toast.error('Please enter a valid amount greater than 0');
    }
    if (reason.length < 5) {
      return toast.error('Please provide a descriptive reason (at least 5 characters)');
    }
    setConfirmOpen(true);
  };

  return (
    <Card className="mb-6 border-red-200 bg-red-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-800 flex items-center gap-2">
          <ShieldCheck className="size-5" />
          Admin Wallet Adjustment
        </CardTitle>
        <CardDescription>
          Manually adjust the wallet balance for {uid}. This action is securely audited.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleOpenConfirm} className="grid sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(val) => setType(val as 'CREDIT' | 'DEBIT')} 
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CREDIT" id="credit" />
                <Label htmlFor="credit" className="text-emerald-700 cursor-pointer">Credit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="DEBIT" id="debit" />
                <Label htmlFor="debit" className="text-red-700 cursor-pointer">Debit</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input 
              type="number" 
              placeholder="0.00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              min="1" 
              step="0.01"
              required
            />
          </div>
          
          <div className="space-y-2 sm:col-span-2 flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Reason / Reference</Label>
              <Input 
                placeholder="E.g., Refund for App #123" 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                required
                minLength={5}
              />
            </div>
            <Button type="submit" variant="destructive">
              Prepare
            </Button>
          </div>
        </form>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Wallet Adjustment</DialogTitle>
              <DialogDescription>
                You are about to manually mutate a financial ledger. Please confirm the details carefully.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold text-slate-500">Agent UID:</div>
                <div className="font-mono">{uid}</div>
                
                <div className="font-semibold text-slate-500">Adjustment Type:</div>
                <div className={type === 'CREDIT' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                  {type}
                </div>
                
                <div className="font-semibold text-slate-500">Amount:</div>
                <div className="font-bold text-lg">₹{parseFloat(amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                
                <div className="font-semibold text-slate-500">Reason:</div>
                <div className="italic">{reason}</div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmSubmit} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Adjustment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
