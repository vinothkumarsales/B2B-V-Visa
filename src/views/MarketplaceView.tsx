'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  ShieldCheck,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Store,
  Layers,
  ShoppingBag,
  Star,
  Award,
  ArrowRight,
  Sparkles,
  DollarSign,
  Package,
  Info,
  Check,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';

// Categories supported in V-Visa Partner Marketplace
const MARKETPLACE_CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'VISA', label: 'Visa Services' },
  { id: 'TOURS', label: 'Tours & Packages' },
  { id: 'FLIGHTS', label: 'Flight Desks' },
  { id: 'HOTELS', label: 'Hotels & Resorts' },
  { id: 'TRANSPORT', label: 'Transfers & Car Rental' },
  { id: 'ACTIVITIES', label: 'Sightseeing & Passes' },
  { id: 'TRAVEL_SUPPORT', label: 'Insurance & eSIM' },
  { id: 'OTHER', label: 'Other B2B Services' },
];

interface VendorProfileData {
  id: string;
  businessName: string;
  businessType?: string;
  contactPerson?: string;
  contactEmail: string;
  contactPhone?: string;
  kycStatus: string;
  vendorStatus: string;
  digioKycId?: string;
  digioKycStatus?: string;
  reputationScore: number;
  totalOrdersFulfilled: number;
  averageRating: number;
  totalReviews: number;
}

interface ProductItem {
  id: string;
  sourceType: 'PLATFORM' | 'VENDOR';
  status: string;
  category: string;
  title: string;
  tagline?: string;
  description: string;
  inclusions?: string[];
  exclusions?: string[];
  destinationCountry?: string;
  cityOrRegion?: string;
  validityDays: number;
  processingTimeDays: number;
  cancellationPolicy?: string;
  termsAndConditions?: string;
  basePriceMinor: number;
  platformFeeMinor: number;
  gstMinor: number;
  sellingPriceMinor: number;
  priceUnit: string;
  minQuantity: number;
  maxQuantity: number;
  featured: boolean;
  bookingCount: number;
  applyUrl?: string;
  vendorProfile?: {
    id: string;
    businessName: string;
    reputationScore: number;
    averageRating: number;
    totalOrdersFulfilled: number;
    agency?: {
      vvisaUid: string;
      city?: string;
      state?: string;
    };
  };
}

interface OrderItem {
  id: string;
  orderNumber: string;
  productId: string;
  status: string;
  quantity: number;
  totalAmountMinor: number;
  createdAt: string;
  product: {
    title: string;
    category: string;
    sellingPriceMinor: number;
    priceUnit: string;
  };
  vendorProfile?: {
    businessName: string;
    contactEmail: string;
    contactPhone?: string;
  };
  buyerAgency?: {
    id: string;
    name: string;
    email: string;
    vvisaUid?: string;
  };
  rating?: {
    overallRating: number;
    reviewText?: string;
  };
}

function formatCurrency(amountMinor: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

export default function MarketplaceView() {
  const agency = useAppStore((s) => s.agency);
  const partnerUid = agency?.vvisaUid || 'VVA1000001';

  // Vendor KYC state
  const [vendorLoading, setVendorLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<string>('NOT_STARTED');
  const [vendorProfile, setVendorProfile] = useState<VendorProfileData | null>(null);

  // KYC Popup Modal State (Before Digio)
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycAgreed, setKycAgreed] = useState(false);
  const [digioStarting, setDigioStarting] = useState(false);
  const [digioSession, setDigioSession] = useState<any>(null);

  // State B Tab Navigation
  const [activeTab, setActiveTab] = useState<'catalogue' | 'my-products' | 'orders' | 'wall-of-fame'>('catalogue');

  // Catalogue & Filters
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [myProducts, setMyProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [orderRole, setOrderRole] = useState<'BUYER' | 'VENDOR'>('BUYER');
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Add Product Modal State
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productForm, setProductForm] = useState({
    category: 'TOURS',
    title: '',
    tagline: '',
    description: '',
    destinationCountry: '',
    cityOrRegion: '',
    validityDays: '30',
    processingTimeDays: '3',
    inclusionsRaw: '',
    exclusionsRaw: '',
    basePriceRupees: '',
    priceUnit: 'PER_PERSON',
    cancellationPolicy: 'Free cancellation up to 7 days before commencement.',
    termsAndConditions: 'Partner must furnish valid traveller documentation.',
    complianceConfirmed: false,
  });

  // Booking Modal State
  const [selectedProduct, setSelectedProduct] = useState<ProductItem[] | null>(null);
  const [bookingProduct, setBookingProduct] = useState<ProductItem | null>(null);
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [bookingContactName, setBookingContactName] = useState('');
  const [bookingContactEmail, setBookingContactEmail] = useState('');
  const [bookingContactPhone, setBookingContactPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Order Rating Modal State
  const [ratingOrder, setRatingOrder] = useState<OrderItem | null>(null);
  const [serviceQuality, setServiceQuality] = useState(5);
  const [responseTime, setResponseTime] = useState(5);
  const [accuracy, setAccuracy] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Calculate live pricing breakdown in Add Product Form
  const calculatedPricing = useMemo(() => {
    const base = Math.max(0, parseInt(productForm.basePriceRupees || '0', 10));
    const baseMinor = base * 100;
    const platformFeeMinor = Math.round(baseMinor * 0.05);
    const taxableMinor = baseMinor + platformFeeMinor;
    const gstMinor = Math.round(taxableMinor * 0.18);
    const sellingPriceMinor = taxableMinor + gstMinor;

    return {
      baseMinor,
      platformFeeMinor,
      gstMinor,
      sellingPriceMinor,
    };
  }, [productForm.basePriceRupees]);

  // Load Vendor Status
  const loadVendorStatus = useCallback(async () => {
    try {
      setVendorLoading(true);
      const res = await fetch('/api/marketplace/vendor');
      if (res.ok) {
        const data = await res.json();
        setKycStatus(data.kycStatus || 'NOT_STARTED');
        setVendorProfile(data.profile || null);
      }
    } catch (err) {
      console.error('Failed to load vendor status:', err);
    } finally {
      setVendorLoading(false);
    }
  }, []);

  // Load Marketplace Products
  const loadProducts = useCallback(async () => {
    try {
      setCatalogueLoading(true);
      const url = new URL('/api/marketplace/products', window.location.origin);
      if (selectedCategory !== 'ALL') {
        url.searchParams.set('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setCatalogueLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  // Load Vendor's Own Products
  const loadMyProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace/products?myProducts=true');
      if (res.ok) {
        const data = await res.json();
        setMyProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load my products:', err);
    }
  }, []);

  // Load Orders
  const loadOrders = useCallback(async (role: 'BUYER' | 'VENDOR') => {
    try {
      setOrdersLoading(true);
      const res = await fetch(`/api/marketplace/orders?role=${role}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendorStatus();
  }, [loadVendorStatus]);

  useEffect(() => {
    if (kycStatus === 'COMPLETED') {
      loadProducts();
      loadMyProducts();
    }
  }, [kycStatus, loadProducts, loadMyProducts]);

  useEffect(() => {
    if (kycStatus === 'COMPLETED' && activeTab === 'orders') {
      loadOrders(orderRole);
    }
  }, [kycStatus, activeTab, orderRole, loadOrders]);

  // Load Digio Web SDK script dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || (window as any).Digio) return;
    const script = document.createElement('script');
    script.src = 'https://ext.digio.in/sdk/v11/digio.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Launch Digio Workflow via Web SDK or canonical 3-part Gateway URL
  const launchDigioWorkflow = useCallback((session: any) => {
    if (!session) return;

    if (typeof window !== 'undefined' && (window as any).Digio) {
      try {
        const Digio = (window as any).Digio;
        const digio = new Digio({
          environment: session.environment || (session.gatewayUrl?.includes('ext.digio.in') ? 'sandbox' : 'production'),
          callback: (response: any) => {
            console.log('[DIGIO SDK Callback]', response);
            if (response && !response.error_code) {
              handleCompleteKyc();
            }
          },
        });
        digio.init();
        digio.submit(session.id, session.customerIdentifier, session.tokenId);
        return;
      } catch (sdkErr) {
        console.warn('Digio SDK submit error, falling back to direct gateway URL:', sdkErr);
      }
    }

    if (session.gatewayUrl) {
      window.open(session.gatewayUrl, '_blank', 'width=800,height=700');
    }
  }, []);

  // Handle Digio Vendor Onboarding Start
  const handleStartDigio = async () => {
    try {
      setDigioStarting(true);
      const res = await fetch('/api/marketplace/vendor/digio/start', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to start vendor onboarding session.');
        return;
      }

      setDigioSession(data.session);

      // Launch workflow session immediately
      launchDigioWorkflow(data.session);
    } catch (err) {
      console.error('Digio start error:', err);
      alert('Error initiating Digio session.');
    } finally {
      setDigioStarting(false);
    }
  };

  // Complete KYC (either via Digio webhook callback or simulated test completion)
  const handleCompleteKyc = async () => {
    try {
      setDigioStarting(true);
      const res = await fetch('/api/marketplace/vendor/digio/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digioKycId: digioSession?.id,
          verificationToken: digioSession?.verificationToken,
          businessDetails: {
            businessName: agency?.name || 'Verified Travel Agency',
            businessType: 'PVT_LTD',
            categories: ['TOURS', 'VISA', 'HOTELS', 'FLIGHTS'],
            city: agency?.city || 'Bengaluru',
            state: agency?.state || 'Karnataka',
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setKycStatus('COMPLETED');
        setKycModalOpen(false);
        setDigioSession(null);
        await loadVendorStatus();
        await loadProducts();
      } else {
        alert(data.error || 'Could not complete verification.');
      }
    } catch (err) {
      console.error('KYC complete error:', err);
    } finally {
      setDigioStarting(false);
    }
  };

  // Handle Add Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.complianceConfirmed) {
      alert('Please confirm the marketplace compliance and authenticity declaration.');
      return;
    }

    const baseRupees = parseInt(productForm.basePriceRupees, 10);
    if (isNaN(baseRupees) || baseRupees <= 0) {
      alert('Please enter a valid base price in ₹.');
      return;
    }

    try {
      setProductSubmitting(true);
      const inclusions = productForm.inclusionsRaw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const exclusions = productForm.exclusionsRaw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/marketplace/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: productForm.category,
          title: productForm.title,
          tagline: productForm.tagline,
          description: productForm.description,
          destinationCountry: productForm.destinationCountry,
          cityOrRegion: productForm.cityOrRegion,
          validityDays: parseInt(productForm.validityDays, 10) || 30,
          processingTimeDays: parseInt(productForm.processingTimeDays, 10) || 3,
          inclusions,
          exclusions,
          basePriceMinor: baseRupees * 100, // into paise
          priceUnit: productForm.priceUnit,
          cancellationPolicy: productForm.cancellationPolicy,
          termsAndConditions: productForm.termsAndConditions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to publish product.');
        return;
      }

      setAddProductOpen(false);
      setProductForm({
        category: 'TOURS',
        title: '',
        tagline: '',
        description: '',
        destinationCountry: '',
        cityOrRegion: '',
        validityDays: '30',
        processingTimeDays: '3',
        inclusionsRaw: '',
        exclusionsRaw: '',
        basePriceRupees: '',
        priceUnit: 'PER_PERSON',
        cancellationPolicy: 'Free cancellation up to 7 days before commencement.',
        termsAndConditions: 'Partner must furnish valid traveller documentation.',
        complianceConfirmed: false,
      });

      await loadProducts();
      await loadMyProducts();
      setActiveTab('my-products');
    } catch (err) {
      console.error('Product submit error:', err);
      alert('Error creating product.');
    } finally {
      setProductSubmitting(false);
    }
  };

  // Handle Book Product Submit
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingProduct) return;

    try {
      setBookingSubmitting(true);
      const res = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: bookingProduct.id,
          quantity: bookingQuantity,
          travellerDetails: {
            primaryContactName: bookingContactName,
            primaryContactEmail: bookingContactEmail,
            primaryContactPhone: bookingContactPhone,
            specialRequests: bookingNotes,
          },
          notes: bookingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to place booking request.');
        return;
      }

      setBookingSuccess(data.order.orderNumber);
      await loadOrders('BUYER');
    } catch (err) {
      console.error('Booking order error:', err);
      alert('Error placing booking.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Handle Submit Rating
  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingOrder) return;

    try {
      setRatingSubmitting(true);
      const res = await fetch(`/api/marketplace/orders/${ratingOrder.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceQualityRating: serviceQuality,
          responseTimeRating: responseTime,
          accuracyRating: accuracy,
          reviewText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to submit rating.');
        return;
      }

      setRatingOrder(null);
      await loadOrders(orderRole);
      await loadProducts();
    } catch (err) {
      console.error('Rating submit error:', err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Handle Order Status Update
  const handleOrderStatusUpdate = async (orderId: string, status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    try {
      const res = await fetch('/api/marketplace/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) {
        await loadOrders(orderRole);
      }
    } catch (err) {
      console.error('Order status update error:', err);
    }
  };

  if (vendorLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Checking Vendor Onboarding status...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE A — KYC NOT COMPLETED
  // =========================================================================
  if (kycStatus !== 'COMPLETED') {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-4">
        {/* State A Hero Banner */}
        <div className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm p-8 shadow-sm">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1 font-semibold text-xs border-amber-500/30 bg-amber-500/10 text-amber-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verification Required
            </Badge>

            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Become a V-Visa Marketplace Vendor
            </h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              Before you can list travel products or services on V-Visa, we need to verify your business identity through our secure verification gateway.
            </p>

            {/* In-Progress Notification if applicable */}
            {(kycStatus === 'IN_PROGRESS' || kycStatus === 'VERIFICATION_PENDING') && (
              <div className="mt-5 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-500">Verification in progress</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your vendor onboarding request has been registered and is undergoing verification. Click below to continue or complete document steps.
                  </p>
                </div>
              </div>
            )}

            {/* Failed Notification if applicable */}
            {kycStatus === 'FAILED' && (
              <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-500">Verification rejected or incomplete</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your previous verification attempt could not be approved. Please review your credentials and re-submit.
                  </p>
                </div>
              </div>
            )}

            {/* Checklist items */}
            <div className="mt-6 space-y-3">
              {[
                { title: 'Verify your identity', desc: 'Secure selfie & government ID matching via Digio' },
                { title: 'Verify your business', desc: 'Validate your agency name, GSTIN, and company PAN' },
                { title: 'Submit required company documents', desc: 'Authorisation letters and travel business registration' },
                { title: 'Accept marketplace compliance terms', desc: 'Anti-fraud covenant and authentic voucher delivery agreement' },
                { title: 'Unlock product listing', desc: 'Distribute travel packages directly to thousands of verified partner agencies' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground block">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="gap-2 font-semibold px-6 shadow-md"
                onClick={() => setKycModalOpen(true)}
              >
                Complete KYC
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="lg" asChild>
                <Link href={`/${partnerUid}/explore`}>
                  Maybe Later
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* 4-Step KYC Modal (Content Popup Before Digio) */}
        <Dialog open={kycModalOpen} onOpenChange={setKycModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
                <ShieldCheck className="h-4 w-4" />
                V-Visa Verification Gateway
              </div>
              <DialogTitle className="text-xl font-bold">Vendor Onboarding</DialogTitle>
              <DialogDescription>
                Complete your verification to unlock product listing on the V-Visa Partner Marketplace.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-4">
              <div className="grid gap-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Step 1: Identity Verification</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Authorized signatory identity verification and live selfie capture through Digio.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Step 2: Business Verification</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verify your company trade name, registered GSTIN, and business PAN.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Step 3: Company Documents</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submit required business entity documents or tourism accreditation certificates.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Step 4: Marketplace Agreement</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Review and accept the V-Visa Vendor Marketplace terms and compliance covenant.
                    </p>
                  </div>
                </div>
              </div>

              {/* Anti-fraud contractual notice */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  Marketplace Compliance & Anti-Fraud Notice
                </div>
                <p>
                  Your information is securely processed through our verification workflow. You will be able to list products only after successful onboarding.
                </p>
                <p className="text-[11px] leading-relaxed">
                  <strong>Notice of Contractual Penalty:</strong> Partners declare that all listed services, hotel vouchers, and packages are authentic and valid. Listing fraudulent, unconfirmed, or forged vouchers constitutes material breach of contract and incurs liquidated damages up to ₹10,00,000 without prejudice to other remedies.
                </p>
              </div>

              {/* Agreement checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agree-kyc"
                  checked={kycAgreed}
                  onChange={(e) => setKycAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="agree-kyc" className="text-xs text-foreground font-medium cursor-pointer">
                  I agree to the V-Visa Marketplace Vendor Terms and the Anti-Fraud Compliance Declaration.
                </label>
              </div>

              {/* Digio Session Launch Status */}
              {digioSession && (
                <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-3.5 text-xs space-y-2.5">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Workflow Active: &quot;{digioSession.templateName}&quot;
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {digioSession.isMock ? 'Sandbox Mock' : 'Digio Live'}
                    </Badge>
                  </div>
                  <div className="bg-background/80 rounded p-2 text-[11px] font-mono space-y-0.5 border border-border/50">
                    <div><span className="text-muted-foreground">Request ID:</span> {digioSession.id}</div>
                    <div><span className="text-muted-foreground">Identifier:</span> {digioSession.customerIdentifier}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {digioSession.gatewayUrl && (
                      <Button
                        size="sm"
                        className="gap-1.5 font-medium shadow-sm"
                        onClick={() => launchDigioWorkflow(digioSession)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Launch Verification Gateway
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCompleteKyc}
                      disabled={digioStarting}
                    >
                      {digioStarting ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
                      Check / Confirm Completion
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setKycModalOpen(false)}>
                Cancel
              </Button>
              {!digioSession ? (
                <Button
                  onClick={handleStartDigio}
                  disabled={!kycAgreed || digioStarting}
                  className="gap-2 font-semibold"
                >
                  {digioStarting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                  Start Vendor Onboarding
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // STATE B — KYC COMPLETED (Full Partner Marketplace Unlocked)
  // =========================================================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Partner Marketplace
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 gap-1 font-semibold text-xs px-2.5 py-0.5">
              <CheckCircle2 className="h-3 w-3" />
              Vendor Onboarding — Completed
            </Badge>
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-500 gap-1 font-semibold text-xs px-2 py-0.5">
              <ShieldCheck className="h-3 w-3" />
              Verified Vendor
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Distribute and discover verified travel products, packages, and services across the V-Visa partner network.
          </p>
        </div>

        {/* Primary Header Action */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setAddProductOpen(true)}
            className="gap-2 font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            + Add Product
          </Button>
        </div>
      </div>

      {/* Vendor Reputation Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium block">Reputation Score</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{vendorProfile?.reputationScore || 100}</span>
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                Tier A
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium block">Fulfilled Bookings</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">{vendorProfile?.totalOrdersFulfilled || 0}</span>
              <span className="text-xs text-muted-foreground">Confirmed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium block">Partner Rating</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {(vendorProfile?.averageRating || 5.0).toFixed(1)}
              </span>
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="text-xs text-muted-foreground">({vendorProfile?.totalReviews || 0})</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium block">Catalogue Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-emerald-500">Active Vendor</span>
              <span className="text-xs text-muted-foreground">({myProducts.length} published)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 pb-px">
        {[
          { id: 'catalogue', label: 'Marketplace Catalogue', icon: Store },
          { id: 'my-products', label: `My Products (${myProducts.length})`, icon: Package },
          { id: 'orders', label: 'Orders & Bookings', icon: ShoppingBag },
          { id: 'wall-of-fame', label: 'Wall of Fame', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: MARKETPLACE CATALOGUE */}
      {/* =================================================================== */}
      {activeTab === 'catalogue' && (
        <div className="space-y-5">
          {/* Category Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-3xl no-scrollbar">
              {MARKETPLACE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {/* Catalogue Grid */}
          {catalogueLoading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-foreground">No products found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No verified travel products match your search criteria. Try changing the category filter or add the first listing!
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5 text-xs"
                onClick={() => setAddProductOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                List a Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod) => {
                const isPlatform = prod.sourceType === 'PLATFORM';
                return (
                  <Card
                    key={prod.id}
                    className="border-border/80 bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between"
                  >
                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-wider">
                          {prod.category.replace('_', ' ')}
                        </Badge>
                        {isPlatform ? (
                          <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 bg-primary/5 text-primary">
                            V-Visa Platform
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold border-blue-500/30 bg-blue-500/5 text-blue-500 gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Verified Vendor
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-base font-bold text-foreground leading-snug line-clamp-1">
                        {prod.title}
                      </CardTitle>

                      {prod.tagline && (
                        <CardDescription className="text-xs line-clamp-1 text-muted-foreground mt-0.5">
                          {prod.tagline}
                        </CardDescription>
                      )}

                      {/* Region & Speed Indicators */}
                      <div className="flex items-center gap-3 pt-2 text-[11px] text-muted-foreground">
                        {prod.destinationCountry && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 text-muted-foreground/70" />
                            {prod.destinationCountry}
                            {prod.cityOrRegion ? `, ${prod.cityOrRegion}` : ''}
                          </span>
                        )}
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          {prod.processingTimeDays}d turnaround
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                      {/* Inclusions bullets */}
                      {prod.inclusions && prod.inclusions.length > 0 && (
                        <div className="space-y-1.5 py-1">
                          {prod.inclusions.slice(0, 3).map((inc, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="truncate">{inc}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Transparent Pricing Breakdown Box */}
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Base Price</span>
                          <span>{formatCurrency(prod.basePriceMinor)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Platform Fee (5%)</span>
                          <span>{formatCurrency(prod.platformFeeMinor)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>GST (18%)</span>
                          <span>{formatCurrency(prod.gstMinor)}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1 border-t border-border/60">
                          <span className="text-xs font-semibold text-foreground">Selling Price</span>
                          <div className="text-right">
                            <span className="text-base font-bold text-foreground">
                              {formatCurrency(prod.sellingPriceMinor)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              /{prod.priceUnit.toLowerCase().replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Vendor attribution */}
                      {!isPlatform && prod.vendorProfile && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                          <span className="truncate font-medium text-foreground">
                            {prod.vendorProfile.businessName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            <span>{(prod.vendorProfile.averageRating || 5.0).toFixed(1)}</span>
                          </div>
                        </div>
                      )}

                      {/* Action CTA */}
                      {isPlatform ? (
                        <Button
                          size="sm"
                          className="w-full font-semibold text-xs mt-1 gap-1.5"
                          asChild
                        >
                          <Link href={`/${partnerUid}/apply?product=${prod.id}`}>
                            Apply on V-Visa
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full font-semibold text-xs mt-1"
                          onClick={() => {
                            setBookingProduct(prod);
                            setBookingQuantity(1);
                            setBookingContactName(agency?.name || '');
                            setBookingContactEmail(agency?.email || '');
                            setBookingContactPhone(agency?.phone || '');
                            setBookingNotes('');
                            setBookingSuccess(null);
                          }}
                        >
                          Book / Request Service
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MY PRODUCTS */}
      {/* =================================================================== */}
      {activeTab === 'my-products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              Products Published by {agency?.name || 'Your Agency'}
            </h3>
            <Button size="sm" onClick={() => setAddProductOpen(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              + Add Product
            </Button>
          </div>

          {myProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-foreground">You haven&apos;t listed any products yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                As a verified vendor, you can publish travel packages, ground services, and hotel deals to the entire partner ecosystem.
              </p>
              <Button
                size="sm"
                className="mt-4 gap-1.5 text-xs font-semibold"
                onClick={() => setAddProductOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Your First Listing
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border/80 overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Base Price</th>
                      <th className="p-3">B2B Selling Price</th>
                      <th className="p-3">Bookings</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {myProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="p-3">
                          <span className="font-semibold text-foreground block">{p.title}</span>
                          <span className="text-muted-foreground text-[11px] block">{p.tagline || p.destinationCountry}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {p.category}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono">{formatCurrency(p.basePriceMinor)}</td>
                        <td className="p-3 font-semibold text-foreground font-mono">{formatCurrency(p.sellingPriceMinor)}</td>
                        <td className="p-3">{p.bookingCount}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ORDERS & REQUESTS */}
      {/* =================================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={orderRole === 'BUYER' ? 'default' : 'outline'}
                onClick={() => setOrderRole('BUYER')}
                className="text-xs"
              >
                Bookings Placed (As Buyer)
              </Button>
              <Button
                size="sm"
                variant={orderRole === 'VENDOR' ? 'default' : 'outline'}
                onClick={() => setOrderRole('VENDOR')}
                className="text-xs"
              >
                Incoming Bookings (As Vendor)
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => loadOrders(orderRole)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {ordersLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-foreground">No orders recorded</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {orderRole === 'BUYER'
                  ? 'You haven&apos;t booked any travel packages yet. Explore the catalogue to request services.'
                  : 'You have not received any partner booking orders yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <Card key={ord.id} className="border-border/80 bg-card">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-sm">{ord.orderNumber}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            ord.status === 'COMPLETED'
                              ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10'
                              : ord.status === 'CANCELLED'
                              ? 'text-red-500 border-red-500/20 bg-red-500/10'
                              : 'text-blue-500 border-blue-500/20 bg-blue-500/10'
                          }`}
                        >
                          {ord.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">{ord.product.title}</p>
                      <p className="text-muted-foreground text-[11px]">
                        Qty: {ord.quantity} | Total: <span className="font-mono font-semibold text-foreground">{formatCurrency(ord.totalAmountMinor)}</span> | Date: {new Date(ord.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Vendor management actions */}
                      {orderRole === 'VENDOR' && ord.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleOrderStatusUpdate(ord.id, 'IN_PROGRESS')}
                        >
                          Mark In Progress
                        </Button>
                      )}
                      {orderRole === 'VENDOR' && ord.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => handleOrderStatusUpdate(ord.id, 'COMPLETED')}
                        >
                          Mark Completed
                        </Button>
                      )}

                      {/* Buyer rating action for completed orders */}
                      {orderRole === 'BUYER' && ord.status === 'COMPLETED' && !ord.rating && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 border-amber-500/30 text-amber-500 bg-amber-500/10"
                          onClick={() => {
                            setRatingOrder(ord);
                            setServiceQuality(5);
                            setResponseTime(5);
                            setAccuracy(5);
                            setReviewText('');
                          }}
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-500" />
                          Rate Vendor
                        </Button>
                      )}

                      {ord.rating && (
                        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1">
                          <Star className="h-3 w-3 fill-amber-500" />
                          Rated: {ord.rating.overallRating.toFixed(1)}/5
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: WALL OF FAME */}
      {/* =================================================================== */}
      {activeTab === 'wall-of-fame' && (
        <div className="space-y-4">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-foreground">
              V-Visa Marketplace Wall of Fame
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recognizing verified travel partners with outstanding fulfillment accuracy, zero disputes, and top partner ratings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: agency?.name || 'V-Visa Partner Desk',
                tier: 'Elite Certified Vendor',
                score: vendorProfile?.reputationScore || 100,
                rating: 5.0,
                orders: vendorProfile?.totalOrdersFulfilled || 0,
                badge: 'Top Reliable Partner',
              },
              {
                name: 'Falcon Wings Global Holidays',
                tier: 'Premier Ground Operator',
                score: 145,
                rating: 4.9,
                orders: 28,
                badge: 'Fastest Turnaround',
              },
              {
                name: 'Orient Travel & Visa Services',
                tier: 'Verified Visa Specialist',
                score: 130,
                rating: 4.8,
                orders: 19,
                badge: 'Zero Dispute Record',
              },
            ].map((vendor, idx) => (
              <Card key={idx} className="border-border/80 bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1 font-semibold">
                      <Award className="h-3 w-3" />
                      {vendor.badge}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-primary">Rank #{idx + 1}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground">{vendor.name}</h4>
                    <span className="text-xs text-muted-foreground">{vendor.tier}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-center">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Score</span>
                      <span className="text-xs font-bold text-foreground">{vendor.score}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Rating</span>
                      <span className="text-xs font-bold text-amber-500 flex items-center justify-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-500" />
                        {vendor.rating}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Orders</span>
                      <span className="text-xs font-bold text-foreground">{vendor.orders}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD PRODUCT (NO IMAGE UPLOADS — B2B SPEC) */}
      {/* =================================================================== */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">List a Travel Product / Service</DialogTitle>
            <DialogDescription>
              Publish a verified travel product to all partners across the V-Visa B2B ecosystem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <Label className="text-xs">Category *</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(val) => setProductForm({ ...productForm, category: val })}
                >
                  <SelectTrigger className="text-xs h-9 mt-1">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETPLACE_CATEGORIES.filter((c) => c.id !== 'ALL').map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Destination */}
              <div>
                <Label className="text-xs">Destination Country</Label>
                <Input
                  className="text-xs h-9 mt-1"
                  placeholder="e.g. United Arab Emirates, Thailand"
                  value={productForm.destinationCountry}
                  onChange={(e) => setProductForm({ ...productForm, destinationCountry: e.target.value })}
                />
              </div>
            </div>

            {/* Product Title */}
            <div>
              <Label className="text-xs">Product Title *</Label>
              <Input
                required
                className="text-xs h-9 mt-1"
                placeholder="e.g. Dubai 5D4N Premium FIT Land Package (4-Star Hotel + Safari)"
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
              />
            </div>

            {/* Tagline */}
            <div>
              <Label className="text-xs">Short Tagline / Catchphrase</Label>
              <Input
                className="text-xs h-9 mt-1"
                placeholder="e.g. Instant confirmation, deluxe transfers included"
                value={productForm.tagline}
                onChange={(e) => setProductForm({ ...productForm, tagline: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs">Description *</Label>
              <Textarea
                required
                rows={3}
                className="text-xs mt-1"
                placeholder="Detailed explanation of services, itinerary highlights, or visa assistance specifications..."
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Key Inclusions (One per line)</Label>
                <Textarea
                  rows={3}
                  className="text-xs mt-1 font-mono"
                  placeholder={"Hotel with breakfast\nAirport transfers\nDesert safari with BBQ"}
                  value={productForm.inclusionsRaw}
                  onChange={(e) => setProductForm({ ...productForm, inclusionsRaw: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Exclusions (One per line)</Label>
                <Textarea
                  rows={3}
                  className="text-xs mt-1 font-mono"
                  placeholder={"Flight tickets\nPersonal expenses\nTourism dirham fee"}
                  value={productForm.exclusionsRaw}
                  onChange={(e) => setProductForm({ ...productForm, exclusionsRaw: e.target.value })}
                />
              </div>
            </div>

            {/* Pricing Section & Live Breakdown */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
              <h4 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Transparent Pricing Setup
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Your Net Base Price (₹) *</Label>
                  <Input
                    required
                    type="number"
                    min="1"
                    className="text-xs h-9 mt-1 font-mono"
                    placeholder="e.g. 15000"
                    value={productForm.basePriceRupees}
                    onChange={(e) => setProductForm({ ...productForm, basePriceRupees: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-xs">Price Unit</Label>
                  <Select
                    value={productForm.priceUnit}
                    onValueChange={(val) => setProductForm({ ...productForm, priceUnit: val })}
                  >
                    <SelectTrigger className="text-xs h-9 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_PERSON" className="text-xs">Per Person</SelectItem>
                      <SelectItem value="PER_BOOKING" className="text-xs">Per Booking</SelectItem>
                      <SelectItem value="PER_ROOM" className="text-xs">Per Room</SelectItem>
                      <SelectItem value="PER_VEHICLE" className="text-xs">Per Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Processing Time (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="text-xs h-9 mt-1"
                    value={productForm.processingTimeDays}
                    onChange={(e) => setProductForm({ ...productForm, processingTimeDays: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Calculation Preview */}
              <div className="rounded border border-border/60 bg-card p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base Price</span>
                  <span>{formatCurrency(calculatedPricing.baseMinor)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Service Fee (5%)</span>
                  <span>{formatCurrency(calculatedPricing.platformFeeMinor)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (18%)</span>
                  <span>{formatCurrency(calculatedPricing.gstMinor)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-border font-semibold">
                  <span className="text-foreground">Total Selling Price to Partners</span>
                  <span className="text-sm font-bold text-primary">
                    {formatCurrency(calculatedPricing.sellingPriceMinor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Anti-fraud & compliance declaration */}
            <div className="flex items-start gap-2 pt-1">
              <input
                required
                type="checkbox"
                id="compliance-check"
                checked={productForm.complianceConfirmed}
                onChange={(e) => setProductForm({ ...productForm, complianceConfirmed: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="compliance-check" className="text-[11px] text-muted-foreground cursor-pointer leading-tight">
                I certify that all details, prices, and inclusions are genuine. I accept responsibility for fulfilling confirmed bookings in accordance with V-Visa Vendor terms and anti-fraud penalties.
              </label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddProductOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={productSubmitting} className="font-semibold gap-1.5">
                {productSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                Publish Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL: BOOK PRODUCT / PLACE ORDER */}
      {/* =================================================================== */}
      <Dialog open={!!bookingProduct} onOpenChange={() => setBookingProduct(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Book Travel Product</DialogTitle>
            <DialogDescription className="text-xs">
              Place a confirmed B2B booking for {bookingProduct?.title}
            </DialogDescription>
          </DialogHeader>

          {bookingSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-foreground">Booking Confirmed!</h4>
              <p className="text-xs text-muted-foreground">
                Your order number is <code className="font-mono font-bold text-foreground">{bookingSuccess}</code>. The vendor has been notified.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setBookingProduct(null);
                  setBookingSuccess(null);
                  setActiveTab('orders');
                }}
              >
                View in Orders & Bookings
              </Button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                <div className="flex justify-between font-semibold text-foreground">
                  <span>{bookingProduct?.title}</span>
                  <span className="font-mono">{formatCurrency(bookingProduct?.sellingPriceMinor || 0)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{bookingProduct?.tagline || bookingProduct?.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity (Units / Persons)</Label>
                  <Input
                    type="number"
                    min="1"
                    max={bookingProduct?.maxQuantity || 50}
                    value={bookingQuantity}
                    onChange={(e) => setBookingQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Total Order Value</Label>
                  <div className="h-9 mt-1 rounded border border-border bg-muted/40 px-3 flex items-center font-mono font-bold text-foreground">
                    {formatCurrency((bookingProduct?.sellingPriceMinor || 0) * bookingQuantity)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Primary Contact Name *</Label>
                <Input
                  required
                  value={bookingContactName}
                  onChange={(e) => setBookingContactName(e.target.value)}
                  className="text-xs h-9 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Contact Email *</Label>
                  <Input
                    required
                    type="email"
                    value={bookingContactEmail}
                    onChange={(e) => setBookingContactEmail(e.target.value)}
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Contact Phone *</Label>
                  <Input
                    required
                    value={bookingContactPhone}
                    onChange={(e) => setBookingContactPhone(e.target.value)}
                    className="text-xs h-9 mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Special Requests / Traveller Details</Label>
                <Textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="e.g. Travel dates, hotel bed type, pickup location..."
                  className="text-xs mt-1"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="ghost" onClick={() => setBookingProduct(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={bookingSubmitting} className="font-semibold">
                  {bookingSubmitting ? 'Confirming...' : 'Place Booking'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* MODAL: RATE VENDOR */}
      {/* =================================================================== */}
      <Dialog open={!!ratingOrder} onOpenChange={() => setRatingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Rate Vendor Performance</DialogTitle>
            <DialogDescription className="text-xs">
              Submit your verified 3-dimensional rating for Order #{ratingOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRatingSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Service Quality</Label>
                  <span className="font-bold text-amber-500">{serviceQuality} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={serviceQuality}
                  onChange={(e) => setServiceQuality(parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Response Time</Label>
                  <span className="font-bold text-amber-500">{responseTime} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={responseTime}
                  onChange={(e) => setResponseTime(parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Accuracy & Delivery</Label>
                  <span className="font-bold text-amber-500">{accuracy} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={accuracy}
                  onChange={(e) => setAccuracy(parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Review Feedback (Optional)</Label>
              <Textarea
                rows={2}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience working with this vendor..."
                className="text-xs mt-1"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRatingOrder(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={ratingSubmitting} className="font-semibold">
                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
