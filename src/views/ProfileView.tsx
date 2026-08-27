'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, AlertTriangle, Lock, User, Building2, Scan, FileCheck, Loader2, Check } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh',
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface DocUploadZoneProps {
  title: string;
  helper: string;
  docType: string;
  value: string | null;
  onUpload: (docType: string, fileName: string) => void;
}

function DocUploadZone({ title, helper, docType, value, onUpload }: DocUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, documentType: docType }),
      });
      onUpload(docType, file.name);
    } catch {
      onUpload(docType, file.name);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground font-medium">{title}</Label>
      <p className="text-xs text-vvisa-text-muted">{helper}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        className="hidden"
        onChange={handleUpload}
      />
      <div
        className={`border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer h-20
          ${value ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-vvisa-border hover:border-primary/50'}
        `}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin mb-1" />
            <p className="text-xs text-primary">Scanning with ocr.z.ai...</p>
          </>
        ) : value ? (
          <>
            <FileCheck className="h-3.5 w-3.5 text-emerald-400 mb-1" />
            <p className="text-xs text-emerald-400 font-medium truncate max-w-full px-2">{value}</p>
            <span className="text-[9px] text-vvisa-text-muted mt-0.5">Click to replace</span>
          </>
        ) : (
          <>
            <Scan className="h-3.5 w-3.5 text-vvisa-text-muted mb-1" />
            <p className="text-xs text-vvisa-text-muted">Click to upload</p>
            <span className="inline-flex items-center gap-0.5 text-[9px] text-primary mt-0.5">
              <Scan className="h-2.5 w-2.5" /> ocr.z.ai ready
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProfileView() {
  const { agency, login } = useAppStore();
  const profileAgency = agency;
  const agencyId = profileAgency?.id;
  const [country, setCountry] = useState(profileAgency?.country || 'India');
  const [state, setState] = useState(profileAgency?.state || 'Karnataka');
  const [phone, setPhone] = useState(profileAgency?.phone || '');
  const [whatsapp, setWhatsapp] = useState(profileAgency?.whatsapp || '');
  const [gstNumber, setGstNumber] = useState(profileAgency?.gstNumber || '');
  const [panCard, setPanCard] = useState(profileAgency?.panCard || '');
  const [addressLine1, setAddressLine1] = useState(profileAgency?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(profileAgency?.addressLine2 || '');
  const [city, setCity] = useState(profileAgency?.city || '');
  const [zipCode, setZipCode] = useState(profileAgency?.zipCode || '');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string | null>>({
    gst: null,
    cheque: null,
  });

  // Onboarding user and business fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [designation, setDesignation] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarName, setAadhaarName] = useState('');
  const [aadhaarAddress, setAadhaarAddress] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState(profileAgency?.name || '');
  const [billingType, setBillingType] = useState<'GST' | 'NON_GST'>('NON_GST');

  // Fetch full details including onboarding fields on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.userProfile) {
          setFirstName(data.userProfile.firstName || '');
          setLastName(data.userProfile.lastName || '');
          setGender(data.userProfile.gender || 'Male');
          setDesignation(data.userProfile.designation || '');
          setAadhaarNumber(data.userProfile.aadhaarNumber || '');
          setAadhaarName(data.userProfile.aadhaarName || '');
          setAadhaarAddress(data.userProfile.aadhaarAddress || '');
        }
        if (data.businessProfile) {
          setBusinessName(data.businessProfile.businessName || '');
          setBillingType(data.businessProfile.billingType || 'NON_GST');
          if (data.businessProfile.logoUrl) {
            setLogoFile('agency_logo');
            setLogoBase64(data.businessProfile.logoUrl);
          }
        }
      })
      .catch((err) => console.error('Failed to load onboarding fields:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return;

    setLogoUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, documentType: 'logo' }),
      });
      setLogoFile(file.name);
      setLogoBase64(`data:${file.type};base64,${base64}`);
    } catch {
      setLogoFile(file.name);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleDocUpload = (docType: string, fileName: string) => {
    setUploadedDocs((prev) => ({ ...prev, [docType]: fileName }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          whatsapp,
          country,
          gstNumber,
          panCard,
          addressLine1,
          addressLine2,
          city,
          state,
          zipCode,
          firstName,
          lastName,
          gender,
          designation,
          aadhaarNumber,
          aadhaarName,
          aadhaarAddress,
          businessName,
          billingType,
          logoUrl: logoBase64,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || 'Profile update failed');
      login({
        ...profileAgency!,
        ...payload.agency,
        accountType: profileAgency?.accountType ?? 'b2b',
        walletBalance: profileAgency?.walletBalance ?? 0,
      });
      setSaveMessage('Profile saved successfully.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Profile update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-vvisa-text-muted">Loading profile details...</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 max-w-3xl"
    >
      {/* Section 1: Agency Logo */}
      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-vvisa-text-secondary" />
              Agency Logo
            </div>
            {agencyId && <span className="text-xs text-vvisa-text-muted font-mono font-normal">{agencyId}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div
              className={`border-2 border-dashed rounded-xl w-32 h-32 flex flex-col items-center justify-center text-center transition-all cursor-pointer shrink-0
                ${logoFile ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-vvisa-border hover:border-primary/50'}
                ${logoUploading ? 'border-primary bg-primary/5' : ''}
              `}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoUploading ? (
                <>
                  <Loader2 className="h-6 w-6 text-primary animate-spin mb-1" />
                  <p className="text-xs text-primary">Scanning...</p>
                </>
              ) : logoBase64 ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  <img src={logoBase64} alt="Uploaded logo" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
              ) : logoFile ? (
                <>
                  <Check className="h-6 w-6 text-emerald-400 mb-1" />
                  <p className="text-xs text-emerald-400 font-medium">{logoFile}</p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-vvisa-text-muted mb-1" />
                  <p className="text-xs text-vvisa-text-muted">Upload</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-medium mt-2">
                    <Scan className="h-3 w-3" />
                    Powered by ocr.z.ai
                  </span>
                </>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-vvisa-text-secondary">
                JPG, JPEG, PNG or SVG - max 1 MB
              </p>
              <Button
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                className="border-vvisa-border text-vvisa-text-secondary hover:bg-vvisa-surface-2 hover:text-foreground rounded-lg text-xs"
              >
                Choose file
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1.5: Personal Details */}
      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-vvisa-text-secondary" />
            Personal Details
          </CardTitle>
          <p className="text-xs text-vvisa-text-muted">Manage your personal onboarding credentials</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Gender</Label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10 w-full px-3 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Designation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Billing Type</Label>
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as 'GST' | 'NON_GST')}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10 w-full px-3 outline-none"
              >
                <option value="NON_GST">Non-GST Invoice</option>
                <option value="GST">GST Invoice</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Agency Information */}
      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-vvisa-text-secondary" />
              Agency Information
            </div>
            {agencyId && <span className="text-xs text-vvisa-text-muted font-mono font-normal">{agencyId}</span>}
          </CardTitle>
          <p className="text-xs text-vvisa-text-muted">Update your GST, PAN, and address details</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Details */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Basic Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vvisa-surface border border-vvisa-border">
                    <SelectItem value="India">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Account Type</Label>
                <Input
                  value="b2b"
                  readOnly
                  className="bg-vvisa-bg border border-vvisa-border rounded-lg text-foreground h-10 opacity-60 cursor-not-allowed"
                />
              </div>
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Contact Number</Label>
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Alternative Number</Label>
                <Input
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-vvisa-border" />

          {/* Tax Details */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Tax Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">GST Number</Label>
                <Input
                  value={gstNumber}
                  onChange={(event) => setGstNumber(event.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">PAN Card</Label>
                <Input
                  value={panCard}
                  onChange={(event) => setPanCard(event.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Documents</h4>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-800/30 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80">
                Upload your GST certificate to enable GST input credit on your invoices. All documents are scanned using <span className="text-primary font-medium">ocr.z.ai</span>.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DocUploadZone
                title="GST Certificate"
                helper="PDF - max 5 MB"
                docType="gst"
                value={uploadedDocs.gst}
                onUpload={handleDocUpload}
              />
              <DocUploadZone
                title="Cancelled Cheque"
                helper="JPG, PNG or PDF - max 5 MB"
                docType="cheque"
                value={uploadedDocs.cheque}
                onUpload={handleDocUpload}
              />
            </div>
          </div>

          <Separator className="bg-vvisa-border" />

          {/* Address */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Address</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Address Line 1</Label>
                <Input
                  value={addressLine1}
                  onChange={(event) => setAddressLine1(event.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Address Line 2</Label>
                <Input
                  value={addressLine2}
                  onChange={(event) => setAddressLine2(event.target.value)}
                  className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-vvisa-text-muted mb-1.5 block">City</Label>
                  <Input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-vvisa-text-muted mb-1.5 block">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-vvisa-surface border border-vvisa-border max-h-60 overflow-y-auto">
                      {indianStates.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Zip Code</Label>
                  <Input
                    value={zipCode}
                    onChange={(event) => setZipCode(event.target.value)}
                    className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {saveMessage && <p className="text-xs text-vvisa-text-muted">{saveMessage}</p>}
          <Button onClick={handleSaveProfile} disabled={saving || !profileAgency} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-10 px-6">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Aadhaar Details */}
      <Card className="bg-vvisa-surface border border-vvisa-border rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-vvisa-text-secondary" />
            Aadhaar Details
          </CardTitle>
          <p className="text-xs text-vvisa-text-muted">Identity verification information</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Name as per Aadhaar</Label>
              <Input
                value={aadhaarName}
                onChange={(e) => setAadhaarName(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                placeholder="Enter name as per Aadhaar"
              />
            </div>
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Aadhaar Number</Label>
              <Input
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10 font-mono"
                placeholder="Enter 12-digit Aadhaar"
                maxLength={12}
              />
            </div>
            <div>
              <Label className="text-xs text-vvisa-text-muted mb-1.5 block">Address as per Aadhaar</Label>
              <Input
                value={aadhaarAddress}
                onChange={(e) => setAadhaarAddress(e.target.value)}
                className="bg-vvisa-bg border border-vvisa-border focus:border-primary rounded-lg text-foreground h-10"
                placeholder="Enter address as per Aadhaar"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
