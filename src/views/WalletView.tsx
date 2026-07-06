'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { statusConfig } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Building, CreditCard, Wallet, Copy, QrCode, Info } from 'lucide-react';

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
  const { walletBalance, transactions, agency } = useAppStore();
  const [depositTab, setDepositTab] = useState('bank');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
            <p className="text-sm text-vvisa-text-muted mt-1">Manage your balance, deposits, and withdrawals</p>
          </div>
          {agency?.id && <span className="text-xs text-vvisa-border-active font-mono">{agency.id}</span>}
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
          <div className="flex gap-2">
            {[
              { key: 'bank', label: 'Bank Transfer', fee: '0%' },
              { key: 'upi', label: 'UPI', fee: '0%' },
              { key: 'card', label: 'Credit Card', fee: '2%' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDepositTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  depositTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-vvisa-surface border border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${depositTab === tab.key ? 'text-primary-foreground/60' : 'text-vvisa-text-muted'}`}>
                  ({tab.fee} fee)
                </span>
              </button>
            ))}
          </div>

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
                        VVisa Bank 1
                      </CardTitle>
                      <Badge className="bg-emerald-950/30 text-emerald-400 text-xs border-0">Preferred</Badge>
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
                      <p className="text-sm text-foreground mt-0.5">VVisa Technologies Pvt Ltd</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Bank 2 */}
                <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building className="h-4 w-4 text-vvisa-text-secondary" />
                      VVisa Bank 2
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
                      <p className="text-sm text-foreground mt-0.5">VVisa Technologies Pvt Ltd</p>
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
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-800/30">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200/80">
                    A 2% processing fee will be charged on credit card deposits. For fee-free deposits, use Bank Transfer or UPI.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Card Number</Label>
                    <Input
                      placeholder="4242 4242 4242 4242"
                      className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Expiry</Label>
                    <Input
                      placeholder="MM/YY"
                      className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-vvisa-text-muted mb-1.5 block">CVV</Label>
                    <Input
                      placeholder="•••"
                      type="password"
                      className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Amount</Label>
                  <Input
                    placeholder="Enter amount"
                    type="number"
                    className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10 font-mono"
                  />
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg h-10 flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pay with Credit Card
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/30">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-200/90 font-medium">Payment Processing Time</p>
              <p className="text-xs text-amber-200/70 mt-0.5">
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
                        <td className={`px-4 py-3 text-sm font-mono text-right whitespace-nowrap ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCredit ? '+' : ''}{formatINR(txn.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs ${txn.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>
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
