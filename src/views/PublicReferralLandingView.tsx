'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldCheck,
  CheckCircle2,
  Globe2,
  Clock,
  Sparkles,
  Send,
  Building2,
  FileCheck,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface PublicReferralProps {
  partnerUid: string;
  productSlug?: string;
}

export default function PublicReferralLandingView({ partnerUid, productSlug }: PublicReferralProps) {
  const [partner, setPartner] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/r/${partnerUid}`)
      .then((res) => {
        if (!res.ok) throw new Error('Partner referral link not found');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setPartner(data.partner);
        setProducts(data.products || []);
        if (data.products?.length) {
          // If slug provided, match product by slug
          if (productSlug) {
            const matched = data.products.find(
              (p: any) =>
                p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === productSlug.toLowerCase(),
            );
            setSelectedProductId(matched ? matched.id : data.products[0].id);
          } else {
            setSelectedProductId(data.products[0].id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [partnerUid, productSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !email.trim() || !selectedProductId) {
      setErrorMessage('Please fill in your name, mobile number, and email address.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/r/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerUid,
          productId: selectedProductId,
          clientName: name,
          clientMobile: mobile,
          clientWhatsapp: whatsapp || undefined,
          clientEmail: email,
          clientCity: city || undefined,
          travelDate: travelDate || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit inquiry. Please try again.');
        return;
      }

      setSubmitted(true);
      setReferralCode(data.referralCode || '');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-400">Loading verified visa portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <Globe2 className="size-6 text-emerald-400" />
              V-VISA
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400 border-l border-slate-700 pl-3">
              Official Global Services
            </span>
          </div>

          {partner && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              <UserCheck className="size-3.5" />
              <span>Referred by <strong className="text-white">{partner.name}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 max-w-5xl mx-auto text-center">
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 mb-4">
          <ShieldCheck className="size-3.5 mr-1" />
          Verified Official Visa Services
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Fast, Reliable Global Visa & Travel Services
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Apply with confidence. Verified by our authorized partner <span className="text-white font-semibold">{partner?.name || 'V-Visa Partner'}</span>. Dedicated visa advisors, embassy documentation, and end-to-end guidance.
        </p>

        {/* Feature Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            99.2% Visa Documentation Accuracy
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
            <Clock className="size-4 text-emerald-400" />
            Fastest Possible Embassy Turnaround
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
            <Building2 className="size-4 text-emerald-400" />
            Dedicated Advisor Assigned
          </span>
        </div>
      </section>

      {/* Main Content: Product Details + Lead Capture Form */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Selection & Info */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-800 bg-slate-900/80 shadow-xl text-slate-100">
              <CardHeader className="border-b border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-white flex items-center justify-between">
                  <span>Select Desired Service</span>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs font-normal">
                    {products.length} Available
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {products.map((p) => {
                  const isSelected = selectedProductId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {p.destination} • <span className="text-emerald-400">{p.category}</span>
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />}
                      </div>
                      {p.processingTime && (
                        <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="size-3 text-slate-500" />
                          Processing: {p.processingTime}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {selectedProduct && (
              <Card className="border-slate-800 bg-slate-900/40 text-slate-300 text-xs p-4 space-y-2">
                <p className="font-semibold text-white uppercase tracking-wider text-[11px]">
                  Service Inclusions:
                </p>
                <ul className="space-y-1.5 text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    Complete eligibility evaluation & checklist
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    Embassy form preparation & document review
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    Biometrics & appointment slot assistance
                  </li>
                </ul>
              </Card>
            )}
          </div>

          {/* Right Column: Lead Capture Form */}
          <div className="lg:col-span-7">
            <Card className="border-slate-800 bg-slate-900 shadow-2xl text-slate-100">
              <CardHeader className="border-b border-slate-800 p-6">
                <CardTitle className="text-xl font-bold text-white">
                  Request Official Consultation
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Fill out your details below. A dedicated V-Visa advisor will reach out to you within 2 business hours.
                </p>
              </CardHeader>
              <CardContent className="p-6">
                {submitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Inquiry Received Successfully!</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Your reference number is <strong className="text-emerald-400 font-mono text-sm">{referralCode}</strong>.
                      Our international visa advisor has received your request and will call you shortly.
                    </p>
                    <div className="pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSubmitted(false);
                          setName('');
                          setMobile('');
                          setEmail('');
                          setNotes('');
                        }}
                        className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                      >
                        Submit Another Inquiry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {errorMessage && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                        {errorMessage}
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-medium text-slate-200">Full Name (as per Passport) *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="mt-1 bg-slate-950 border-slate-800 text-white text-xs h-10"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-200">Mobile Number *</Label>
                        <Input
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="mt-1 bg-slate-950 border-slate-800 text-white text-xs h-10"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-slate-200">WhatsApp Number</Label>
                        <Input
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="+91 98765 43210 (optional)"
                          className="mt-1 bg-slate-950 border-slate-800 text-white text-xs h-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-slate-200">Email Address *</Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="rahul@example.com"
                          className="mt-1 bg-slate-950 border-slate-800 text-white text-xs h-10"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-slate-200">City of Residence</Label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Mumbai, Bengaluru"
                          className="mt-1 bg-slate-950 border-slate-800 text-white text-xs h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-slate-200">Target Travel or Intake Date</Label>
                      <Input
                        type="date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="mt-1 bg-slate-950 border-slate-800 text-white text-xs h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium text-slate-200">Notes or Specific Requirements</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tell us about your visa requirements, previous travel history, or any urgent timelines..."
                        className="mt-1 bg-slate-950 border-slate-800 text-white text-xs h-20 resize-none"
                      />
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">
                      By submitting this form, you authorize V-Visa and authorized partner <strong className="text-slate-200">{partner?.name || 'Partner'}</strong> to contact you regarding your visa processing inquiry.
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 text-sm shadow-lg shadow-emerald-500/20"
                    >
                      {submitting ? 'Submitting Inquiry...' : 'Submit Visa Inquiry'}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
