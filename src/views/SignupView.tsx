'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DollarSign,
  Zap,
  Headphones,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
} from 'lucide-react';

const step1Schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type Step1FormData = z.infer<typeof step1Schema>;

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

const features = [
  {
    icon: DollarSign,
    title: 'Best Prices for Travel Agents',
    points: ['Bulk discounts on every visa', 'No hidden charges or markup'],
  },
  {
    icon: Zap,
    title: 'Quick & Easy Applications',
    points: ['Apply for 500+ visas in minutes', 'Bulk upload & auto-fill'],
  },
  {
    icon: Headphones,
    title: '24/7 Support, Anytime',
    points: ['Dedicated account manager', 'WhatsApp, email & phone support'],
  },
];

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

export default function SignupView() {
  const router = useRouter();
  const navigate = useAppStore((s) => s.navigate);
  const login = useAppStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  type SignupStep = 'REGISTER' | 'VERIFY_EMAIL' | 'BUSINESS_ONBOARDING';
  const [step, setStep] = useState<SignupStep>('REGISTER');
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [selectedBillingType, setSelectedBillingType] = useState<'GST' | 'NON_GST'>('NON_GST');

  // Step 1 Form Handler
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1 },
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Onboarding Form Handler
  const {
    register: registerOnboard,
    handleSubmit: handleSubmitOnboard,
    setValue: setOnboardValue,
    formState: { errors: errorsOnboard },
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

  // Track Firebase User State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setStep('REGISTER');
      } else {
        setFirebaseUser(user);
        if (!user.emailVerified) {
          setStep('VERIFY_EMAIL');
        } else {
          // Verify onboarding status
          try {
            const token = await user.getIdToken();
            const response = await fetch('/api/auth/onboarding-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const data = await response.json();
            if (data.onboarded) {
              const storeAuth = useAppStore.getState().isAuthenticated;
              if (!storeAuth) {
                const { signOut } = await import('firebase/auth');
                await signOut(auth).catch(() => {});
                setFirebaseUser(null);
                setStep('REGISTER');
              } else {
                const agencyId = useAppStore.getState().agency?.id;
                router.push(agencyId ? `/${agencyId}/explore` : '/explore');
              }
            } else {
              setStep('BUSINESS_ONBOARDING');
            }
          } catch (err) {
            console.error('Failed checking onboarding status', err);
            setStep('BUSINESS_ONBOARDING');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Polling for email verification
  useEffect(() => {
    if (step !== 'VERIFY_EMAIL' || !auth.currentUser) return;

    const intervalId = setInterval(async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          await user.reload();
          if (user.emailVerified) {
            clearInterval(intervalId);
            setFirebaseUser(user);
            setStep('BUSINESS_ONBOARDING');
          }
        }
      } catch (err: any) {
        console.error('Failed reloading user state during verification polling:', err);
        if (err?.code === 'auth/user-token-expired' || err?.message?.includes('user-token-expired')) {
          clearInterval(intervalId);
          setServerError('Your signup session has expired. Please try signing up again.');
          await signOut(auth).catch(() => {});
          setStep('REGISTER');
        }
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [step]);

  // Step 1: Create Account
  const onStep1Submit = async (data: Step1FormData) => {
    if (!termsAccepted) return setServerError('Please accept the terms to continue.');
    setSubmitting(true);
    setServerError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await sendEmailVerification(userCredential.user);
      setFirebaseUser(userCredential.user);
      setStep('VERIFY_EMAIL');
    } catch (error: any) {
      console.error('Registration Step 1 Failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        setServerError('This email address is already in use. Please sign in or use a different email.');
      } else {
        setServerError(error.message || 'Failed to create account.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 Fallback: Check verification manually
  const checkEmailVerification = async () => {
    const user = auth.currentUser;
    if (user) {
      setSubmitting(true);
      setServerError('');
      try {
        await user.reload();
        if (user.emailVerified) {
          setFirebaseUser(user);
          setStep('BUSINESS_ONBOARDING');
        } else {
          setServerError('Email is not verified yet. Please check your inbox.');
        }
      } catch (err: any) {
        setServerError(err.message || 'Verification check failed.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Step 2: Resend Verification Link
  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (user) {
      setSubmitting(true);
      setServerError('');
      try {
        await sendEmailVerification(user);
        alert('Verification email resent successfully.');
      } catch (err: any) {
        setServerError(err.message || 'Failed to resend verification.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Onboarding Submit
  const onOnboardingSubmit = async (data: OnboardingFormData) => {
    const user = auth.currentUser;
    if (!user) return setServerError('You must be logged in to complete onboarding.');
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
      if (!response.ok) return setServerError(payload?.error?.message || 'Onboarding failed to save');
      if (payload.agency) {
        login(payload.agency);
        router.push(`/${payload.agency.id}/explore`);
      } else {
        router.push('/explore');
      }
    } catch (error: any) {
      console.error('Onboarding Save Failed:', error);
      if (error?.code === 'auth/user-token-expired' || error?.message?.includes('user-token-expired')) {
        setServerError('Your onboarding session has expired. Please try signing up or logging in again.');
        const { signOut } = await import('firebase/auth');
        await signOut(auth).catch(() => {});
        setFirebaseUser(null);
        setStep('REGISTER');
      } else {
        setServerError(error.message || 'Unable to save business profile.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] lg:flex lg:items-start">
      {/* Left Branding Panel */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex min-h-[230px] w-full flex-col justify-between overflow-hidden bg-[#6e51ff] p-6 text-white sm:p-8 lg:sticky lg:top-0 lg:h-screen lg:w-[42%] lg:min-w-[340px] lg:p-12"
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />

        <button
          onClick={async () => {
            await signOut(auth);
            navigate('landing');
            router.push('/');
          }}
          className="relative z-10 flex w-fit items-center gap-2 text-primary-foreground/80 transition-colors hover:text-primary-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
              <span className="text-foreground font-bold text-xl">V</span>
            </div>
            <span className="text-foreground font-semibold text-xl tracking-tight">
              V-VISA Business
            </span>
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Welcome to V-VISA Business
            </h1>
            <p className="mt-3 text-white/70 text-sm leading-relaxed">
              Start processing visas faster and grow your travel business.
            </p>
          </div>

          {/* Feature list */}
          <div className="hidden flex-col gap-3 lg:flex">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 shrink-0 mt-0.5">
                    <feature.icon className="size-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-white">{feature.title}</h3>
                    <ul className="mt-1.5 space-y-0.5">
                      {feature.points.map((point) => (
                        <li
                          key={point}
                          data-point={point}
                          className="text-[0px] leading-relaxed text-white/70 after:text-xs after:content-[attr(data-point)]"
                        >
                          • {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right Form Panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex w-full flex-1 items-start justify-center bg-[#f5f7fb] px-5 py-8 sm:px-8 lg:min-h-screen lg:items-center lg:px-12"
      >
        <div className={`w-full ${step === 'REGISTER' ? 'max-w-4xl' : 'max-w-lg'} rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:my-8 transition-all duration-300`}>
          
          {/* STEP 1: REGISTER */}
          {step === 'REGISTER' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-950">Create your account</h2>
                <p className="mt-1.5 text-sm text-slate-500">Get started with V-VISA in minutes</p>
              </div>

              <form onSubmit={handleSubmitStep1(onStep1Submit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Email</Label>
                    <Input
                      type="email"
                      placeholder="you@agency.com"
                      autoComplete="email"
                      className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                      {...registerStep1('email')}
                    />
                    {errorsStep1.email && (
                      <p className="text-xs text-red-500">{errorsStep1.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                        className="h-11 border-slate-300 bg-white pr-10 text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                        {...registerStep1('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errorsStep1.password && (
                      <p className="text-xs text-red-500">{errorsStep1.password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="h-11 border-slate-300 bg-white pr-10 text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                        {...registerStep1('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errorsStep1.confirmPassword && (
                      <p className="text-xs text-red-500">{errorsStep1.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-0.5 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                  />
                  <label htmlFor="terms" className="cursor-pointer text-xs leading-relaxed text-slate-500">
                    I agree to the{' '}
                    <span className="text-indigo-600 hover:underline">Terms of Service</span> and{' '}
                    <span className="text-indigo-600 hover:underline">Privacy Policy</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full cursor-pointer bg-blue-600 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {submitting ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              {serverError && <p className="mt-4 text-sm text-red-600">{serverError}</p>}
              
              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    navigate('login');
                    router.push('/login');
                  }}
                  className="cursor-pointer font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* STEP 2: VERIFY EMAIL */}
          {step === 'VERIFY_EMAIL' && (
            <div className="text-center py-6 space-y-6">
              <div className="flex justify-center">
                <CheckCircle className="size-16 text-blue-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-slate-950">Verify your email</h2>
                <p className="text-sm text-slate-500">
                  We&apos;ve sent a verification link to:
                </p>
                <p className="font-semibold text-slate-900 break-all">
                  {firebaseUser?.email}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Please check your inbox and click the verification link to continue.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Button
                  onClick={checkEmailVerification}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11"
                >
                  {submitting ? 'Checking...' : 'I&apos;ve verified my email'}
                </Button>
                
                <div className="flex justify-center gap-4 text-xs font-medium pt-2">
                  <button
                    onClick={handleResendVerification}
                    className="text-blue-600 hover:underline"
                  >
                    Resend verification email
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={async () => {
                      await signOut(auth);
                      setStep('REGISTER');
                    }}
                    className="text-slate-500 hover:underline"
                  >
                    Use another email
                  </button>
                </div>
              </div>

              {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            </div>
          )}

          {/* STEP 3: BUSINESS ONBOARDING */}
          {step === 'BUSINESS_ONBOARDING' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-950 text-center">Complete your Business Profile</h2>
                <p className="mt-1.5 text-sm text-slate-500 text-center">We need a few details to set up your business account</p>
              </div>

              <form onSubmit={handleSubmitOnboard(onOnboardingSubmit)} className="space-y-6">
                
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
                      value={firebaseUser?.email || ''}
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
                        className="h-11 rounded-l-none border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                        {...registerOnboard('phone')}
                      />
                    </div>
                    {errorsOnboard.phone && (
                      <p className="text-xs text-red-500">{errorsOnboard.phone.message}</p>
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
                        {...registerOnboard('firstName')}
                      />
                      {errorsOnboard.firstName && (
                        <p className="text-xs text-red-500">{errorsOnboard.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Last Name</Label>
                      <Input
                        placeholder="Last Name"
                        className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                        {...registerOnboard('lastName')}
                      />
                      {errorsOnboard.lastName && (
                        <p className="text-xs text-red-500">{errorsOnboard.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Gender</Label>
                      <select
                        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500"
                        {...registerOnboard('gender')}
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
                        {...registerOnboard('designation')}
                      />
                      {errorsOnboard.designation && (
                        <p className="text-xs text-red-500">{errorsOnboard.designation.message}</p>
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
                      {...registerOnboard('country')}
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
                      {...registerOnboard('operatingCountry')}
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
                        {...registerOnboard('businessName')}
                      />
                      {errorsOnboard.businessName && (
                        <p className="text-xs text-red-500">{errorsOnboard.businessName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Billing Type</Label>
                      <select
                        className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500"
                        {...registerOnboard('billingType')}
                        onChange={(e) => {
                          const val = e.target.value as 'GST' | 'NON_GST';
                          setSelectedBillingType(val);
                          setOnboardValue('billingType', val);
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
                        {...registerOnboard('gstNumber')}
                      />
                      {errorsOnboard.gstNumber && (
                        <p className="text-xs text-red-500">{errorsOnboard.gstNumber.message}</p>
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
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
}
