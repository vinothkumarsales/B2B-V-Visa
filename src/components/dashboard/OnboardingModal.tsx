'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/app.store';

const onboardingSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.string().min(1, 'Gender is required'),
  designation: z.string().min(1, 'Designation is required'),
  country: z.string().min(2, 'Country is required'),
  operatingCountry: z.string().min(2, 'Operating country is required'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  billingType: z.enum(['GST', 'NON_GST']),
  gstNumber: z.string().max(20).optional(),
}).refine(data => data.billingType === 'NON_GST' || (data.billingType === 'GST' && data.gstNumber && data.gstNumber.trim().length > 0), {
  message: 'GST number is required for GST Invoice billing.',
  path: ['gstNumber']
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const countriesList = [
  'India',
  'United States',
  'United Kingdom',
  'Singapore',
  'United Arab Emirates',
  'Germany',
  'Canada',
  'Australia',
  'Thailand',
  'Malaysia',
];

export default function OnboardingModal() {
  const login = useAppStore((s) => s.login);
  const setIsOnboarded = useAppStore((s) => s.setIsOnboarded);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [selectedBillingType, setSelectedBillingType] = useState<'GST' | 'NON_GST'>('NON_GST');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      phone: '',
      firstName: '',
      lastName: '',
      gender: 'Male',
      designation: '',
      country: 'India',
      operatingCountry: 'India',
      businessName: '',
      billingType: 'NON_GST',
      gstNumber: '',
    },
  });

  useEffect(() => {
    const email = auth.currentUser?.email || '';
    setCurrentUserEmail(email);
  }, []);

  const onSubmit = async (data: OnboardingFormData) => {
    const user = auth.currentUser;
    if (!user) return setServerError('Session expired. Please reload.');
    setSubmitting(true);
    setServerError('');
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, token }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return setServerError(payload?.error?.message || 'Onboarding failed');
      
      // Hydrate agency profile data inside store
      login(payload.agency);
      setIsOnboarded(true);
      // reload the dashboard content
      window.location.reload();
    } catch (error: any) {
      console.error('Onboarding Save Failed:', error);
      setServerError(error.message || 'Unable to save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-950 text-center">Complete your Business Profile</h2>
          <p className="mt-1 text-sm text-slate-500 text-center">Set up your business credentials before accessing the dashboard</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Section: Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Contact Information
            </h3>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex justify-between items-center">
                <span>Email</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Verified ✓
                </span>
              </Label>
              <Input
                type="email"
                value={currentUserEmail}
                disabled
                className="h-11 border-slate-200 bg-slate-50 text-slate-500 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Phone</Label>
              <div className="flex">
                <div className="flex h-11 shrink-0 items-center gap-2 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3">
                  <span className="text-lg">🇮🇳</span>
                  <span className="text-sm text-slate-700">+91</span>
                </div>
                <Input
                  placeholder="Enter mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="h-11 rounded-l-none border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Section: Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Personal Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">First Name</Label>
                <Input
                  placeholder="First Name"
                  className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Last Name</Label>
                <Input
                  placeholder="Last Name"
                  className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Gender</Label>
                <select
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500"
                  {...register('gender')}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Designation</Label>
                <Input
                  placeholder="Lead Engineer"
                  className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                  {...register('designation')}
                />
                {errors.designation && (
                  <p className="text-xs text-red-500">{errors.designation.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Country Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Registration Country</Label>
              <select
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500"
                {...register('country')}
              >
                {countriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Operating Location</Label>
              <select
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500"
                {...register('operatingCountry')}
              >
                {countriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Business Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Business Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Business Name</Label>
                <Input
                  placeholder="e.g. Vindox Travels"
                  className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                  {...register('businessName')}
                />
                {errors.businessName && (
                  <p className="text-xs text-red-500">{errors.businessName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Billing Type</Label>
                <select
                  className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500"
                  {...register('billingType')}
                  onChange={(e) => {
                    const val = e.target.value as 'GST' | 'NON_GST';
                    setSelectedBillingType(val);
                    setValue('billingType', val);
                  }}
                >
                  <option value="NON_GST">Non-GST Invoice</option>
                  <option value="GST">GST Invoice</option>
                </select>
              </div>
            </div>

            {/* Conditional GST Number */}
            {selectedBillingType === 'GST' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">GST Number</Label>
                <Input
                  placeholder="Enter GST number"
                  className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                  {...register('gstNumber')}
                />
                {errors.gstNumber && (
                  <p className="text-xs text-red-500">{errors.gstNumber.message}</p>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full cursor-pointer bg-blue-600 font-medium text-white transition-colors hover:bg-blue-700"
          >
            {submitting ? 'Saving...' : 'Continue'}
          </Button>
        </form>

        {serverError && <p className="mt-4 text-sm text-red-600 text-center">{serverError}</p>}
      </div>
    </div>
  );
}
