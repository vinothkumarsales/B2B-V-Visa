'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/store/app.store';
import { statusConfig } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Building, CreditCard, Wallet, Copy, QrCode, Info, Loader2, CheckCircle2, ArrowUpRight } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function formatINR(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(abs);
  return amount < 0 ? `-${formatted}` : formatted;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
  DEPOSIT: { label: 'Deposit', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  WITHDRAWAL: { label: 'Withdrawal', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  PAYMENT: { label: 'Payment', bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  REFUND: { label: 'Refund', bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' },
};

export default function WalletView() {
  const { walletBalance, transactions, agency, setWalletBalance, setTransactions } = useAppStore();
  const searchParams = useSearchParams();
  const [depositTab, setDepositTab] = useState<'online' | 'bank' | 'upi' | 'card'>('online');
  const [topupAmount, setTopupAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [paymentBanner, setPaymentBanner] = useState<'success' | 'failed' | null>(null);

  // Sync with live wallet data
  const refreshWallet = async () => {
    try {
      const res = await fetch('/api/wallet', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === 'number') setWalletBalance(data.balance);
        if (Array.isArray(data.transactions)) {
          const mapped = data.transactions.map((t: any) => ({
            id: t.id,
            type: t.type?.includes('DEPOSIT') ? 'DEPOSIT' : t.type?.includes('REFUND') ? 'REFUND' : t.type?.includes('WITHDRAWAL') ? 'WITHDRAWAL' : 'PAYMENT',
            amount: t.amount ?? (t.amountMinor ? Math.abs(t.amountMinor) / 100 : 0),
            status: 'COMPLETED',
            description: t.description ?? t.type?.replaceAll('_', ' '),
            createdAt: t.createdAt,
          }));
          setTransactions(mapped);
        }
      }
    } catch {}
  };

  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus === 'success') {
      setPaymentBanner('success');
      refreshWallet();
    } else if (paymentStatus === 'failed') {
      setPaymentBanner('failed');
    }
  }, [searchParams]);

  const handleOnlineTopUp = async (amount: number) => {
    if (!amount || amount < 100) {
      setTopupError('Minimum deposit amount is ₹100.');
      return;
    }
    setTopupLoading(true);
    setTopupError(null);
    try {
      const amountMinor = Math.round(amount * 100);
      const idempotencyKey = `topup:${agency?.id ?? 'agency'}:${Date.now()}`;
      const res = await fetch('/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountMinor, idempotencyKey }),
      });
      const data = await res.json().catch(() => ({}));
      const checkoutUrl = data.paymentOrder?.providerSessionUrl;
      if (!res.ok || typeof checkoutUrl !== 'string') {
        throw new Error(data.message || 'Unable to create payment session. Please try again.');
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      setTopupError(err instanceof Error ? err.message : 'Payment initiation failed');
      setTopupLoading(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Status Banners */}
      {paymentBanner === 'success' && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span><strong>Deposit successful!</strong> Your wallet balance has been updated.</span>
          </div>
          <button onClick={() => setPaymentBanner(null)} className="text-xs hover:underline font-medium">Dismiss</button>
        </div>
      )}
      {paymentBanner === 'failed' && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <span><strong>Payment was not completed.</strong> Please try again or choose an alternative payment method.</span>
          </div>
          <button onClick={() => setPaymentBanner(null)} className="text-xs hover:underline font-medium">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
            <p className="text-sm text-vvisa-text-muted mt-1">
              Manage your balance, deposits, and payments
              {agency?.vvisaUid && <span className="ml-2 px-2 py-0.5 rounded bg-vvisa-surface-2 text-xs font-mono text-foreground font-semibold">UID: {agency.vvisaUid}</span>}
            </p>
          </div>
        </div>
        <Card className="vv-surface-elevated shrink-0 rounded-xl border">
          <CardContent className="px-5 py-3 text-right">
            <p className="text-xs text-vvisa-text-muted">Current Balance</p>
            <p className="vv-tabular text-2xl font-bold text-foreground">{formatINR(walletBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deposit">
        <TabsList className="h-auto rounded-lg border border-vvisa-border-subtle bg-vvisa-surface p-1 shadow-[var(--vvisa-shadow-sm)]">
          <TabsTrigger
            value="deposit"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-4 py-2 text-sm"
          >
            Deposit
          </TabsTrigger>
          <TabsTrigger
            value="withdraw"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-4 py-2 text-sm"
          >
            Withdraw
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-vvisa-surface-2 data-[state=active]:text-foreground text-vvisa-text-muted rounded-md px-4 py-2 text-sm"
          >
            Transactions
          </TabsTrigger>
        </TabsList>

        {/* Deposit Tab */}
        <TabsContent value="deposit" className="mt-4 space-y-4">
          {/* Deposit Sub-tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'online', label: '⚡ Instant Add Money (Zoho Payments)', fee: 'Instant' },
              { key: 'bank', label: 'Bank Transfer (NEFT/IMPS)', fee: '0%' },
              { key: 'upi', label: 'Direct UPI QR', fee: '0%' },
              { key: 'card', label: 'Card Instructions', fee: '2%' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDepositTab(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  depositTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-vvisa-surface border border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${depositTab === tab.key ? 'text-primary-foreground/60' : 'text-vvisa-text-muted'}`}>
                  ({tab.fee})
                </span>
              </button>
            ))}
          </div>

          {depositTab === 'online' && (
            <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
                  <span>Add Money Instantly</span>
                  <Badge className="bg-primary/10 text-primary text-xs font-semibold">Zoho Payments</Badge>
                </CardTitle>
                <p className="text-xs text-vvisa-text-muted">
                  Select a quick amount or enter custom amount. Credits immediately to your wallet upon successful transaction.
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {topupError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                    {topupError}
                  </div>
                )}

                {/* Quick Presets */}
                <div>
                  <Label className="text-xs text-vvisa-text-muted mb-2 block">Quick Amounts</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[2000, 5000, 10000, 25000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setTopupAmount(amt);
                          setCustomAmount('');
                        }}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          topupAmount === amt && !customAmount
                            ? 'border-primary bg-primary/10 font-bold text-primary ring-2 ring-primary/20'
                            : 'border-vvisa-border bg-vvisa-bg hover:border-primary/50 text-foreground'
                        }`}
                      >
                        <p className="text-sm">₹{amt.toLocaleString('en-IN')}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Or Enter Custom Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-vvisa-text-muted">₹</span>
                    <Input
                      placeholder="e.g. 15000"
                      type="number"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) setTopupAmount(val);
                      }}
                      className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-8 pr-3 h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => handleOnlineTopUp(customAmount ? parseInt(customAmount, 10) : topupAmount)}
                    disabled={topupLoading || (customAmount ? parseInt(customAmount, 10) < 100 : topupAmount < 100)}
                    className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg h-11 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {topupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                    {topupLoading
                      ? 'Creating Payment Session...'
                      : `Proceed to Pay ₹${(customAmount ? parseInt(customAmount, 10) || 0 : topupAmount).toLocaleString('en-IN')}`}
                  </Button>
                  <p className="text-[11px] text-vvisa-text-muted text-center mt-2">
                    Secured by Zoho Payments Hosted Checkout. Supports Cards, UPI, Net Banking, and Wallets.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {depositTab === 'bank' && (
            <>
              {/* Info text */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-vvisa-surface-2 border border-vvisa-border">
                <Info className="h-4 w-4 text-vvisa-text-secondary shrink-0 mt-0.5" />
                <p className="text-xs text-vvisa-text-secondary">
                  Please use only the account details provided below. Deposits from other accounts may not be credited or may be delayed.
                </p>
              </div>

              {/* Bank Accounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank 1 */}
                <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Building className="h-4 w-4 text-vvisa-text-secondary" />
                        V-VISA Bank 1
                      </CardTitle>
                      <Badge className="bg-emerald-500/14 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300 text-xs border-0">Preferred</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2.5">
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Account Number</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-mono text-foreground">1234567890123456</p>
                        <button className="text-vvisa-text-muted hover:text-foreground transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">IFSC Code</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-mono text-foreground">YESB0CHSN0C</p>
                        <button className="text-vvisa-text-muted hover:text-foreground transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Account Name</p>
                      <p className="text-sm text-foreground mt-0.5">V-VISA Technologies Pvt Ltd</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Bank 2 */}
                <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building className="h-4 w-4 text-vvisa-text-secondary" />
                      V-VISA Bank 2
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2.5">
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Account Number</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-mono text-foreground">9876543210987654</p>
                        <button className="text-vvisa-text-muted hover:text-foreground transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">IFSC Code</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-mono text-foreground">UTIB000RAZP</p>
                        <button className="text-vvisa-text-muted hover:text-foreground transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-vvisa-text-muted">Account Name</p>
                      <p className="text-sm text-foreground mt-0.5">V-VISA Technologies Pvt Ltd</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tips Box */}
              <div className="p-3 rounded-lg bg-vvisa-surface-2 border border-vvisa-border">
                <p className="text-xs text-vvisa-text-secondary">
                  💡 <span className="font-medium text-foreground">Tips:</span> For instant transfers up to Rs. 2L, use IMPS. For larger transactions use NEFT.
                </p>
              </div>
            </>
          )}

          {depositTab === 'upi' && (
            <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
              <CardContent className="p-6 flex flex-col items-center">
                <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-white p-2 mb-4">
                  <img
                    src="/phonepe-qr.jpg"
                    alt="PhonePe QR Code for UPI Payment"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm text-foreground font-medium mb-1 font-mono">Q75148468@ybl</p>
                <p className="text-xs text-vvisa-text-muted">Scan QR code or send to this UPI ID</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="bg-vvisa-surface-2 text-vvisa-text-secondary text-xs border-0">PhonePe</Badge>
                  <Badge variant="secondary" className="bg-vvisa-surface-2 text-vvisa-text-secondary text-xs border-0">0% fee</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {depositTab === 'card' && (
            <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/14 dark:bg-amber-400/15 border border-amber-500/30">
                  <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200/85">
                    A 2% processing fee will be charged on credit card deposits. For fee-free deposits, use Bank Transfer or UPI.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Card Deposit Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-vvisa-text-muted">₹</span>
                      <Input
                        placeholder="Enter amount (e.g. 10000)"
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-8 pr-3 h-10 font-mono"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleOnlineTopUp(parseInt(customAmount, 10) || 5000)}
                  disabled={topupLoading || (!customAmount && !topupAmount)}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg h-10 flex items-center justify-center gap-2"
                >
                  {topupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {topupLoading ? 'Redirecting to Checkout...' : `Pay ₹${(parseInt(customAmount, 10) || 5000).toLocaleString('en-IN')} with Credit/Debit Card`}
                </Button>
                <p className="text-[11px] text-vvisa-text-muted text-center">
                  Cards are processed securely via Zoho Payments 3D Secure / OTP checkout.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-500/14 dark:bg-amber-400/15 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-800 dark:text-amber-200/90 font-medium">Payment Processing Time</p>
              <p className="text-xs text-amber-800/85 dark:text-amber-200/75 mt-0.5">
                Please wait 30 min – 2 hrs for payments to reflect in your wallet. If your payment is not reflected after 2 hours, please contact support.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Withdraw Tab */}
        <TabsContent value="withdraw" className="mt-4">
          <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Withdrawal Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-vvisa-text-muted">₹</span>
                  <Input
                    placeholder="Enter amount"
                    type="number"
                    className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground pl-8 pr-3 h-10 font-mono"
                  />
                </div>
                <p className="text-xs text-vvisa-text-muted mt-1">Available: {formatINR(walletBalance)}</p>
              </div>
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Bank Account</Label>
                <p className="text-sm text-foreground p-3 rounded-lg bg-vvisa-bg border border-vvisa-border">
                  HDFC Bank · ••••3456 (Registered)
                </p>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg h-10">
                Request Withdrawal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-vvisa-border">
                    <th className="text-left text-xs text-vvisa-text-muted font-medium px-4 py-3">Transaction ID</th>
                    <th className="text-left text-xs text-vvisa-text-muted font-medium px-4 py-3">Date</th>
                    <th className="text-left text-xs text-vvisa-text-muted font-medium px-4 py-3">Description</th>
                    <th className="text-left text-xs text-vvisa-text-muted font-medium px-4 py-3">Type</th>
                    <th className="text-right text-xs text-vvisa-text-muted font-medium px-4 py-3">Amount</th>
                    <th className="text-right text-xs text-vvisa-text-muted font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const tc = typeConfig[txn.type] || typeConfig.PAYMENT;
                    const isCredit = txn.type === 'DEPOSIT' || txn.type === 'REFUND';
                    return (
                      <tr key={txn.id} className="border-b border-vvisa-border/50 last:border-0 hover:bg-vvisa-surface-2 transition-colors">
                        <td className="px-4 py-3 text-xs text-vvisa-border-active font-mono whitespace-nowrap max-w-[160px] truncate" title={txn.id}>{txn.id}</td>
                        <td className="px-4 py-3 text-xs text-vvisa-text-secondary whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-foreground max-w-[300px] truncate">{txn.description}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={`${tc.bg} ${tc.text} text-xs border-0`}>
                            {tc.label}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-sm font-mono text-right whitespace-nowrap ${isCredit ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                          {isCredit ? '+' : ''}{formatINR(txn.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs ${txn.status === 'COMPLETED' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                            {txn.status === 'COMPLETED' ? '✓ Completed' : '⏳ Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-vvisa-text-muted">
                        No wallet transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
