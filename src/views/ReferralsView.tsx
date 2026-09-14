'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Share2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Eye,
  MessageSquare,
  PhoneCall,
  FileUp,
  HelpCircle,
  X,
  ChevronRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  destination: string;
  category: string;
  amountMinor: number;
  currency: string;
}

interface ReferralRecord {
  id: string;
  referralCode: string;
  partnerAgencyId: string;
  partnerUid: string;
  productId: string;
  clientName: string;
  clientMobile: string;
  clientWhatsapp?: string | null;
  clientEmail: string;
  clientCountry?: string | null;
  clientCity?: string | null;
  clientNationality?: string | null;
  clientLanguage?: string | null;
  notes?: string | null;
  travelDate?: string | null;
  numberOfApplicants?: number | null;
  urgency?: string | null;
  passportAvailable?: boolean | null;
  budget?: string | null;
  existingRefusal?: boolean | null;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'ONBOARDED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  assignedAdvisor?: string | null;
  nextAction?: string | null;
  rewardAmountMinor: number;
  rewardStatus: 'ESTIMATED' | 'PENDING' | 'APPROVED' | 'CREDITED' | 'REVERSED' | 'DISPUTED' | 'REJECTED';
  rewardCondition?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    destination: string;
    category: string;
    amountMinor?: number;
  } | null;
}

interface ReferralStats {
  totalReferrals: number;
  new: number;
  contacted: number;
  onboarded: number;
  inProgress: number;
  completed: number;
  closed: number;
  pendingEarningsMinor: number;
  approvedEarningsMinor: number;
  totalEarnedMinor: number;
  conversionRate: number;
  thisMonthEarningsMinor: number;
  topProduct: string;
  needsActionCount: number;
}

const statusBadgeStyles: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  CONTACTED: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  QUALIFIED: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  ONBOARDED: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  CLOSED: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const rewardBadgeStyles: Record<string, string> = {
  ESTIMATED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  CREDITED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  REVERSED: 'bg-red-500/10 text-red-500 border-red-500/20',
  DISPUTED: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

function formatCurrency(amountMinor: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function maskContact(contact: string): string {
  if (contact.includes('@')) {
    const [name, domain] = contact.split('@');
    if (!name || !domain) return contact;
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name}***`;
    return `${maskedName}@${domain}`;
  }
  const clean = contact.replace(/\D/g, '');
  if (clean.length >= 8) {
    return `${clean.slice(0, 3)}•••••${clean.slice(-3)}`;
  }
  return contact;
}

export default function ReferralsView() {
  const agency = useAppStore((s) => s.agency);
  const partnerUid = agency?.vvisaUid || 'VVA1000001';

  // Data states
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    new: 0,
    contacted: 0,
    onboarded: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
    pendingEarningsMinor: 0,
    approvedEarningsMinor: 0,
    totalEarnedMinor: 0,
    conversionRate: 0,
    thisMonthEarningsMinor: 0,
    topProduct: 'Visa Services',
    needsActionCount: 0,
  });
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rewardFilter, setRewardFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  // Link copy state
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create Form Fields
  const [clientName, setClientName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientNationality, setClientNationality] = useState('Indian');
  const [clientLanguage, setClientLanguage] = useState('English');
  const [travelDate, setTravelDate] = useState('');
  const [numberOfApplicants, setNumberOfApplicants] = useState('1');
  const [urgency, setUrgency] = useState('Standard');
  const [passportAvailable, setPassportAvailable] = useState(true);
  const [budget, setBudget] = useState('');
  const [existingRefusal, setExistingRefusal] = useState(false);
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(true);

  // Detail Drawer State
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Action Dialog State
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'note' | 'callback' | 'query' | 'upload';
    title: string;
  }>({ open: false, type: 'note', title: '' });
  const [actionInput, setActionInput] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const publicReferralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/r/${partnerUid}`
    : `https://business.vvisa.in/r/${partnerUid}`;

  const refreshData = async () => {
    try {
      const [refRes, linkRes] = await Promise.all([
        fetch('/api/referrals'),
        fetch('/api/referrals/links'),
      ]);
      if (refRes.ok) {
        const data = await refRes.json();
        setReferrals(data.referrals || []);
        if (data.stats) setStats(data.stats);
      }
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        if (linkData.products) setProducts(linkData.products);
      }
    } catch (err) {
      console.error('Failed to refresh referral data:', err);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/referrals'),
      fetch('/api/referrals/links'),
    ])
      .then(async ([refRes, linkRes]) => {
        if (!active) return;
        if (refRes.ok) {
          const data = await refRes.json();
          setReferrals(data.referrals || []);
          if (data.stats) setStats(data.stats);
        }
        if (linkRes.ok) {
          const linkData = await linkRes.json();
          if (linkData.products) setProducts(linkData.products);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load referral data:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicReferralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello! Check out official visa and international services through V-Visa: ${publicReferralUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('V-Visa International Services Referral');
    const body = encodeURIComponent(
      `Hello,\n\nPlease find the official link to explore and apply for international visa services:\n\n${publicReferralUrl}\n\nBest regards,\n${agency?.name || 'V-Visa Partner'}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // Open single referral detail
  const handleOpenDetail = async (ref: ReferralRecord) => {
    setSelectedReferral(ref);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/referrals/${ref.id}`);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filtered referrals list
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (rewardFilter !== 'all' && r.rewardStatus !== rewardFilter) return false;
      if (countryFilter !== 'all' && r.clientCountry?.toLowerCase() !== countryFilter.toLowerCase()) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const code = r.referralCode.toLowerCase();
        const name = r.clientName.toLowerCase();
        const email = r.clientEmail.toLowerCase();
        const mobile = r.clientMobile.toLowerCase();
        const product = (r.product?.name || '').toLowerCase();
        const dest = (r.clientCountry || '').toLowerCase();
        return (
          code.includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          mobile.includes(q) ||
          product.includes(q) ||
          dest.includes(q)
        );
      }

      return true;
    });
  }, [referrals, statusFilter, rewardFilter, countryFilter, searchQuery]);

  // Handle Referral Submission
  const handleSubmitReferral = async () => {
    if (!selectedProduct) return;
    if (!clientName.trim() || !clientMobile.trim() || !clientEmail.trim()) {
      setCreateError('Please complete all required fields (Name, Mobile, and Email).');
      return;
    }

    setSubmitting(true);
    setCreateError(null);
    setDuplicateWarning(null);

    try {
      const payload = {
        productId: selectedProduct.id,
        clientName,
        clientMobile,
        clientWhatsapp: clientWhatsapp || undefined,
        clientEmail,
        clientCity: clientCity || undefined,
        clientNationality,
        clientLanguage,
        travelDate: travelDate || undefined,
        numberOfApplicants: parseInt(numberOfApplicants, 10) || 1,
        urgency,
        passportAvailable,
        budget: budget || undefined,
        existingRefusal,
        notes: notes || undefined,
        consent,
      };

      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error?.message || 'Failed to submit referral. Please check input.');
        return;
      }

      if (data.duplicateWarning) {
        setDuplicateWarning(data.duplicateWarning);
      }

      // Refresh data
      await refreshData();

      // Reset form & close modal after slight delay
      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateStep(1);
        setSelectedProduct(null);
        setClientName('');
        setClientMobile('');
        setClientWhatsapp('');
        setClientEmail('');
        setClientCity('');
        setNotes('');
        setDuplicateWarning(null);
      }, 1200);
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const stages = [
    { key: 'NEW', label: 'Received' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'ONBOARDED', label: 'Onboarded' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Share Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Referral Program
            </h1>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs">
              <Sparkles className="mr-1 size-3" />
              Partner Growth
            </Badge>
          </div>
          <p className="mt-1 text-sm text-vvisa-text-muted">
            Refer clients to high-demand global visa services, track milestone progress in real-time, and earn verified rewards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="mr-1.5 size-4" />
            + Create Referral
          </Button>

          <Button
            variant="outline"
            onClick={copyToClipboard}
            className="border-vvisa-border-subtle bg-vvisa-surface hover:bg-vvisa-surface-2"
          >
            {copiedLink ? (
              <>
                <Check className="mr-1.5 size-4 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 size-4" />
                Copy Link
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={shareOnWhatsApp}
            title="Share on WhatsApp"
            className="border-vvisa-border-subtle bg-vvisa-surface hover:bg-emerald-500/10 hover:text-emerald-500"
          >
            <Share2 className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setQrModalOpen(true)}
            title="View QR Code"
            className="border-vvisa-border-subtle bg-vvisa-surface hover:bg-vvisa-surface-2"
          >
            <QrCode className="size-4" />
          </Button>
        </div>
      </div>

      {/* Share Link Banner */}
      <Card className="border-vvisa-border-subtle bg-gradient-to-r from-primary/5 via-primary/0 to-primary/5 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Share2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-vvisa-text-muted">
                Your Public Referral Link
              </p>
              <p className="font-mono text-sm font-medium text-foreground">
                {publicReferralUrl}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={copyToClipboard}>
              {copiedLink ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="outline" onClick={shareOnWhatsApp}>
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={shareViaEmail}>
              Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer border-vvisa-border-subtle transition-all hover:border-primary/40 ${
            statusFilter === 'all' ? 'ring-2 ring-primary/20 bg-primary/5' : 'bg-vvisa-surface'
          }`}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-vvisa-text-muted">Total Referrals</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalReferrals}</p>
            <p className="mt-0.5 text-[11px] text-vvisa-text-muted">All submissions</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('NEW')}
          className={`cursor-pointer border-vvisa-border-subtle transition-all hover:border-blue-500/40 ${
            statusFilter === 'NEW' ? 'ring-2 ring-blue-500/20 bg-blue-500/5' : 'bg-vvisa-surface'
          }`}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-blue-500">New</p>
              <span className="size-2 rounded-full bg-blue-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.new}</p>
            <p className="mt-0.5 text-[11px] text-vvisa-text-muted">Awaiting contact</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('CONTACTED')}
          className={`cursor-pointer border-vvisa-border-subtle transition-all hover:border-purple-500/40 ${
            statusFilter === 'CONTACTED' ? 'ring-2 ring-purple-500/20 bg-purple-500/5' : 'bg-vvisa-surface'
          }`}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-purple-500">Contacted</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.contacted}</p>
            <p className="mt-0.5 text-[11px] text-vvisa-text-muted">In discussion</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('ONBOARDED')}
          className={`cursor-pointer border-vvisa-border-subtle transition-all hover:border-cyan-500/40 ${
            statusFilter === 'ONBOARDED' ? 'ring-2 ring-cyan-500/20 bg-cyan-500/5' : 'bg-vvisa-surface'
          }`}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-500">Onboarded</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.onboarded}</p>
            <p className="mt-0.5 text-[11px] text-vvisa-text-muted">Docs submitted</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`cursor-pointer border-vvisa-border-subtle transition-all hover:border-amber-500/40 ${
            statusFilter === 'IN_PROGRESS' ? 'ring-2 ring-amber-500/20 bg-amber-500/5' : 'bg-vvisa-surface'
          }`}
        >
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-500">In Progress</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.inProgress}</p>
            <p className="mt-0.5 text-[11px] text-vvisa-text-muted">Processing visa</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('COMPLETED')}
          className={`cursor-pointer border-vvisa-border-subtle transition-all hover:border-emerald-500/40 ${
            statusFilter === 'COMPLETED' ? 'ring-2 ring-emerald-500/20 bg-emerald-500/5' : 'bg-vvisa-surface'
          }`}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-500">Completed</p>
              <CheckCircle2 className="size-3 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.completed}</p>
            <p className="mt-0.5 text-[11px] text-vvisa-text-muted">Reward credited</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial & Performance Summary Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-vvisa-border-subtle bg-vvisa-surface">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-vvisa-text-muted">Total Earned</p>
              <p className="mt-1 text-xl font-bold text-emerald-500">
                {formatCurrency(stats.totalEarnedMinor)}
              </p>
              <p className="text-[11px] text-vvisa-text-muted">Credited to wallet</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-vvisa-border-subtle bg-vvisa-surface">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-vvisa-text-muted">Pending Earnings</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {formatCurrency(stats.pendingEarningsMinor)}
              </p>
              <p className="text-[11px] text-vvisa-text-muted">Estimated pipeline</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-vvisa-border-subtle bg-vvisa-surface">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-vvisa-text-muted">This Month</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {formatCurrency(stats.thisMonthEarningsMinor)}
              </p>
              <p className="text-[11px] text-vvisa-text-muted">Conversion rate: {stats.conversionRate}%</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-vvisa-border-subtle bg-vvisa-surface">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-vvisa-text-muted">Top Product</p>
              <p className="mt-1 truncate text-base font-bold text-foreground">
                {stats.topProduct}
              </p>
              <p className="text-[11px] text-vvisa-text-muted">{stats.needsActionCount} referrals require action</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-vvisa-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Referral ID, client name, phone, email, product..."
            className="h-10 rounded-lg border-vvisa-border-subtle bg-vvisa-surface pl-9 text-sm text-foreground"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full sm:w-44 rounded-lg border-vvisa-border-subtle bg-vvisa-surface text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="border-vvisa-border-subtle bg-vvisa-surface">
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="QUALIFIED">Qualified</SelectItem>
            <SelectItem value="ONBOARDED">Onboarded</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={rewardFilter} onValueChange={setRewardFilter}>
          <SelectTrigger className="h-10 w-full sm:w-44 rounded-lg border-vvisa-border-subtle bg-vvisa-surface text-sm">
            <SelectValue placeholder="Reward Status" />
          </SelectTrigger>
          <SelectContent className="border-vvisa-border-subtle bg-vvisa-surface">
            <SelectItem value="all">All Rewards</SelectItem>
            <SelectItem value="ESTIMATED">Estimated</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="CREDITED">Credited</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || statusFilter !== 'all' || rewardFilter !== 'all' || countryFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setRewardFilter('all');
              setCountryFilter('all');
            }}
            className="text-xs text-vvisa-text-muted hover:text-foreground"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Referrals List Table (Desktop) and Cards (Mobile) */}
      <Card className="border-vvisa-border-subtle bg-vvisa-surface shadow-sm">
        <CardHeader className="border-b border-vvisa-border-subtle px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              Client Referrals ({filteredReferrals.length})
            </CardTitle>
            <p className="text-xs text-vvisa-text-muted">
              Auto-refreshed with real-time status updates
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-2 text-xs text-vvisa-text-muted">Loading referrals...</p>
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="rounded-full bg-vvisa-surface-2 p-4">
                <Users className="size-8 text-vvisa-text-muted" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">No referrals found</h3>
              <p className="mt-1 max-w-sm text-xs text-vvisa-text-muted">
                {searchQuery || statusFilter !== 'all' || rewardFilter !== 'all'
                  ? 'No referrals match your search or filter criteria.'
                  : 'You have not submitted any client referrals yet. Click Create Referral to submit your first lead.'}
              </p>
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                <Plus className="mr-1.5 size-4" />
                + Create Referral
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-vvisa-border-subtle bg-vvisa-surface-2/60 text-xs font-semibold uppercase tracking-wider text-vvisa-text-muted">
                    <tr>
                      <th className="py-3 pl-4 pr-3">Referral</th>
                      <th className="px-3 py-3">Client</th>
                      <th className="px-3 py-3">Product</th>
                      <th className="px-3 py-3">Destination</th>
                      <th className="px-3 py-3">Stage</th>
                      <th className="px-3 py-3">Expected Reward</th>
                      <th className="px-3 py-3">Next Action</th>
                      <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vvisa-border-subtle">
                    {filteredReferrals.map((ref) => (
                      <tr
                        key={ref.id}
                        className="transition-colors hover:bg-vvisa-surface-2/50 cursor-pointer"
                        onClick={() => handleOpenDetail(ref)}
                      >
                        <td className="py-3 pl-4 pr-3">
                          <p className="font-mono text-xs font-semibold text-primary">
                            {ref.referralCode}
                          </p>
                          <p className="text-[11px] text-vvisa-text-muted">
                            {new Date(ref.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground">{ref.clientName}</p>
                          <p className="text-xs text-vvisa-text-muted font-mono">
                            {maskContact(ref.clientMobile)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground">{ref.product?.name || 'Visa Service'}</p>
                          <p className="text-[11px] text-vvisa-text-muted">{ref.product?.category || 'Standard'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-foreground">
                            {ref.clientCountry || ref.product?.destination || 'Global'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold ${
                              statusBadgeStyles[ref.status] || statusBadgeStyles.NEW
                            }`}
                          >
                            {ref.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(ref.rewardAmountMinor)}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              rewardBadgeStyles[ref.rewardStatus] || rewardBadgeStyles.ESTIMATED
                            }`}
                          >
                            {ref.rewardStatus}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <p className="truncate text-xs text-vvisa-text-muted" title={ref.nextAction || 'Under review'}>
                            {ref.nextAction || 'Under review'}
                          </p>
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 text-vvisa-text-muted hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(ref);
                            }}
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="divide-y divide-vvisa-border-subtle md:hidden">
                {filteredReferrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-4 transition-colors active:bg-vvisa-surface-2"
                    onClick={() => handleOpenDetail(ref)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-semibold text-primary">
                          {ref.referralCode}
                        </span>
                        <h4 className="mt-0.5 text-sm font-semibold text-foreground">{ref.clientName}</h4>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold ${
                          statusBadgeStyles[ref.status] || statusBadgeStyles.NEW
                        }`}
                      >
                        {ref.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="mt-2 text-xs text-vvisa-text-muted">
                      <p className="font-medium text-foreground">{ref.product?.name || 'Visa Service'}</p>
                      <p className="mt-0.5">Contact: {maskContact(ref.clientMobile)}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-vvisa-border-subtle pt-2.5 text-xs">
                      <div>
                        <span className="text-vvisa-text-muted">Reward: </span>
                        <span className="font-semibold text-foreground">{formatCurrency(ref.rewardAmountMinor)}</span>
                        <span className="ml-1 text-[11px] text-vvisa-text-muted">({ref.rewardStatus})</span>
                      </div>
                      <span className="text-primary font-medium flex items-center gap-1">
                        View <ChevronRight className="size-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* + Create Referral 2-Step Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-vvisa-border-subtle bg-vvisa-surface p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-foreground">
                Create Client Referral
              </DialogTitle>
              <Badge variant="outline" className="text-xs">
                Step {createStep} of 2
              </Badge>
            </div>
            <DialogDescription className="text-xs text-vvisa-text-muted">
              {createStep === 1
                ? 'Select the eligible V-Visa product or service for your client'
                : 'Enter your client details for verification and advisor assignment'}
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {createStep === 1 ? (
            /* STEP 1: Product Selection */
            <div className="space-y-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-vvisa-text-muted" />
                <Input
                  placeholder="Search catalogue products by destination or category..."
                  className="pl-9 h-9 text-xs"
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    // Local filter for product list
                  }}
                />
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {products.length === 0 ? (
                  <p className="py-8 text-center text-xs text-vvisa-text-muted">Loading catalogue products...</p>
                ) : (
                  products.map((p) => {
                    const isSelected = selectedProduct?.id === p.id;
                    const estimatedReward = Math.max(100000, Math.min(500000, Math.round((p.amountMinor || 2000000) * 0.1)));
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-vvisa-border-subtle bg-vvisa-surface-2/40 hover:border-vvisa-border-subtle hover:bg-vvisa-surface-2'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">{p.name}</h4>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                {p.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-vvisa-text-muted mt-0.5">
                              Destination: <span className="text-foreground font-medium">{p.destination}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-emerald-500">
                              + {formatCurrency(estimatedReward)} Reward
                            </p>
                            <p className="text-[10px] text-vvisa-text-muted">On completion</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  disabled={!selectedProduct}
                  onClick={() => setCreateStep(2)}
                  className="bg-primary text-primary-foreground w-full sm:w-auto"
                >
                  Continue to Client Details
                  <ChevronRight className="ml-1.5 size-4" />
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* STEP 2: Client Details */
            <div className="space-y-4 py-2">
              {selectedProduct && (
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                  <div>
                    <span className="text-vvisa-text-muted">Selected Product: </span>
                    <span className="font-semibold text-foreground">{selectedProduct.name}</span>
                    <span className="text-vvisa-text-muted"> ({selectedProduct.destination})</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary hover:text-primary/80"
                    onClick={() => setCreateStep(1)}
                  >
                    Change
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium">Full Name *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client's passport full name"
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Mobile Number (with country code) *</Label>
                  <Input
                    value={clientMobile}
                    onChange={(e) => setClientMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Email Address *</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">WhatsApp Number</Label>
                  <Input
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(e.target.value)}
                    placeholder="+91 98765 43210 (if different)"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">City of Residence</Label>
                  <Input
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    placeholder="e.g. Mumbai, Chennai, Delhi"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Nationality</Label>
                  <Input
                    value={clientNationality}
                    onChange={(e) => setClientNationality(e.target.value)}
                    placeholder="Indian"
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Expected Travel / Joining Date</Label>
                  <Input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Number of Applicants</Label>
                  <Select value={numberOfApplicants} onValueChange={setNumberOfApplicants}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="1 Applicant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Applicant</SelectItem>
                      <SelectItem value="2">2 Applicants</SelectItem>
                      <SelectItem value="3">3 Applicants</SelectItem>
                      <SelectItem value="4">4+ Family / Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Notes & Client Context</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, background, visa urgency, or client preferences..."
                  className="mt-1 text-xs h-20 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-vvisa-border-subtle bg-vvisa-surface-2/30 p-2.5">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="size-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="consent" className="text-[11px] text-vvisa-text-muted cursor-pointer">
                  I confirm that the client has consented to be contacted by V-Visa specialists regarding their visa application.
                </label>
              </div>

              <DialogFooter className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateStep(1)}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitReferral}
                  disabled={submitting || !consent}
                  className="bg-primary text-primary-foreground"
                >
                  {submitting ? 'Submitting Referral...' : 'Confirm & Submit Referral'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Referral Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg border-l border-vvisa-border-subtle bg-vvisa-surface p-0 flex flex-col">
          <SheetHeader className="border-b border-vvisa-border-subtle p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-primary">
                  {selectedReferral?.referralCode}
                </span>
                <SheetTitle className="text-lg font-bold text-foreground mt-0.5">
                  {selectedReferral?.clientName}
                </SheetTitle>
              </div>
              {selectedReferral && (
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    statusBadgeStyles[selectedReferral.status] || statusBadgeStyles.NEW
                  }`}
                >
                  {selectedReferral.status.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {selectedReferral && (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Client Summary Card */}
              <div className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2/40 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-vvisa-text-muted">
                  Client Summary
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-vvisa-text-muted">Product: </span>
                    <span className="font-medium text-foreground">{selectedReferral.product?.name || 'Visa Service'}</span>
                  </div>
                  <div>
                    <span className="text-vvisa-text-muted">Destination: </span>
                    <span className="font-medium text-foreground">{selectedReferral.clientCountry || 'Global'}</span>
                  </div>
                  <div>
                    <span className="text-vvisa-text-muted">Contact: </span>
                    <span className="font-mono font-medium text-foreground">{maskContact(selectedReferral.clientMobile)}</span>
                  </div>
                  <div>
                    <span className="text-vvisa-text-muted">Email: </span>
                    <span className="font-mono font-medium text-foreground">{maskContact(selectedReferral.clientEmail)}</span>
                  </div>
                  <div>
                    <span className="text-vvisa-text-muted">Applicants: </span>
                    <span className="font-medium text-foreground">{selectedReferral.numberOfApplicants || 1}</span>
                  </div>
                  <div>
                    <span className="text-vvisa-text-muted">Submitted: </span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedReferral.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-vvisa-border-subtle pt-2 text-xs">
                  <span className="text-vvisa-text-muted">Assigned Advisor: </span>
                  <span className="font-medium text-foreground">{selectedReferral.assignedAdvisor || 'Admissions Desk'}</span>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-vvisa-text-muted mb-3">
                  Milestone Progress
                </p>
                <div className="relative flex items-center justify-between">
                  {stages.map((stg, idx) => {
                    const statusIndex = stages.findIndex((s) => s.key === selectedReferral.status);
                    const isPassed = statusIndex >= idx;
                    const isCurrent = selectedReferral.status === stg.key;

                    return (
                      <div key={stg.key} className="flex flex-col items-center z-10">
                        <div
                          className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isPassed
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-vvisa-surface-2 border border-vvisa-border-subtle text-vvisa-text-muted'
                          } ${isCurrent ? 'ring-2 ring-primary/40 ring-offset-2' : ''}`}
                        >
                          {idx + 1}
                        </div>
                        <span className="mt-1 text-[10px] text-vvisa-text-muted text-center font-medium">
                          {stg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reward Status Card */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Partner Referral Reward
                  </p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(selectedReferral.rewardAmountMinor)}
                  </p>
                  <p className="text-[11px] text-vvisa-text-muted mt-0.5">
                    Condition: Full Service Payment & Verification
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    rewardBadgeStyles[selectedReferral.rewardStatus] || rewardBadgeStyles.ESTIMATED
                  }`}
                >
                  {selectedReferral.rewardStatus}
                </Badge>
              </div>

              {/* Activity Timeline */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-vvisa-text-muted mb-3">
                  Activity Timeline
                </p>
                {detailLoading ? (
                  <p className="text-xs text-vvisa-text-muted py-4 text-center">Loading activity...</p>
                ) : timelineEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-vvisa-border-subtle p-4 text-center text-xs text-vvisa-text-muted">
                    Referral is being processed by the admissions team.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-vvisa-border-subtle">
                    {timelineEvents.map((ev, i) => (
                      <div key={ev.id || i} className="relative pl-7 text-xs">
                        <div className="absolute left-2 top-1.5 size-2.5 rounded-full bg-primary -translate-x-1/2" />
                        <div className="flex items-baseline justify-between">
                          <p className="font-semibold text-foreground">{ev.event}</p>
                          <span className="text-[10px] text-vvisa-text-muted">
                            {new Date(ev.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-primary font-medium">{ev.actor}</p>
                        {ev.partnerVisibleNote && (
                          <p className="mt-1 text-vvisa-text-muted bg-vvisa-surface-2/40 p-2 rounded border border-vvisa-border-subtle">
                            {ev.partnerVisibleNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Partner Contextual Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-vvisa-border-subtle">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-vvisa-text-muted">
                  Partner Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => setActionModal({ open: true, type: 'note', title: 'Add Partner Note' })}
                  >
                    <MessageSquare className="mr-1.5 size-3.5" />
                    Add Note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => setActionModal({ open: true, type: 'upload', title: 'Upload Client Document' })}
                  >
                    <FileUp className="mr-1.5 size-3.5" />
                    Upload Document
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => setActionModal({ open: true, type: 'callback', title: 'Request Priority Callback' })}
                  >
                    <PhoneCall className="mr-1.5 size-3.5" />
                    Request Callback
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs justify-start"
                    onClick={() => setActionModal({ open: true, type: 'query', title: 'Raise Query to Advisor' })}
                  >
                    <HelpCircle className="mr-1.5 size-3.5" />
                    Raise Query
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-sm text-center border-vvisa-border-subtle bg-vvisa-surface p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Referral QR Code
            </DialogTitle>
            <DialogDescription className="text-xs text-vvisa-text-muted">
              Clients can scan this QR code to access your personalized referral link directly.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-vvisa-border shadow-inner">
            {/* Direct QR code rendering using Google Chart QR API */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicReferralUrl)}`}
              alt="Referral QR"
              className="size-44 object-contain"
            />
            <p className="mt-2 text-xs font-mono font-semibold text-zinc-900">
              {partnerUid}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={copyToClipboard}
            >
              Copy Link
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs bg-primary text-primary-foreground"
              onClick={() => {
                window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicReferralUrl)}`, '_blank');
              }}
            >
              Download QR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contextual Action Modal */}
      <Dialog open={actionModal.open} onOpenChange={(open) => setActionModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md border-vvisa-border-subtle bg-vvisa-surface p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {actionModal.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-vvisa-text-muted">
              {actionModal.type === 'note' && 'Add an update or note visible to your dedicated advisor.'}
              {actionModal.type === 'callback' && 'Request an urgent advisor callback regarding this client referral.'}
              {actionModal.type === 'query' && 'Submit an inquiry or question to the admissions desk.'}
              {actionModal.type === 'upload' && 'Upload additional client passports, statements or supporting documents.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder={
                actionModal.type === 'upload'
                  ? 'Describe the document or paste link/details...'
                  : 'Enter message or request details...'
              }
              className="text-xs h-24 resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionModal((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!actionInput.trim() || actionSubmitting}
              className="bg-primary text-primary-foreground"
              onClick={() => {
                setActionSubmitting(true);
                setTimeout(() => {
                  setActionSubmitting(false);
                  setActionInput('');
                  setActionModal((prev) => ({ ...prev, open: false }));
                  if (selectedReferral) {
                    setTimelineEvents((prev) => [
                      ...prev,
                      {
                        id: `ev-manual-${Date.now()}`,
                        event: actionModal.title,
                        actor: 'Partner',
                        partnerVisibleNote: actionInput,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                  }
                }, 600);
              }}
            >
              {actionSubmitting ? 'Submitting...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
