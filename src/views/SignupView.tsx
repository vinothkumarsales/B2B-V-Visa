'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

const signupSchema = z
  .object({
    phone: z.string().min(10, 'Enter valid phone number'),
    otp: z.string().length(6, 'Enter 6-digit OTP').optional(),
    agencyName: z.string().min(2, 'Enter agency name'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

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

export default function SignupView() {
  const router = useRouter();
  const navigate = useAppStore((s) => s.navigate);
  const login = useAppStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      phone: '',
      agencyName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    if (!termsAccepted) return setServerError('Please accept the terms to continue.');
    setSubmitting(true);
    setServerError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone, agencyName: data.agencyName, email: data.email, password: data.password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return setServerError(payload?.error?.message || 'Registration failed');
      login(payload.agency);
      router.push('/dashboard');
    } catch {
      setServerError('Unable to reach the registration service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] lg:grid lg:grid-cols-[minmax(340px,42%)_1fr]">
      {/* Left Panel â€” Branding */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex min-h-[230px] w-full flex-col justify-between overflow-hidden bg-[#1f5fd6] p-6 text-white sm:p-8 lg:min-h-screen lg:p-12"
      >
        {/* Decorative background circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />

        {/* Back button */}
        <button
          onClick={() => {
            navigate('landing');
            router.push('/');
          }}
          className="relative z-10 flex w-fit items-center gap-2 text-primary-foreground/80 transition-colors hover:text-primary-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="relative z-10 flex flex-col gap-8">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
              <span className="text-foreground font-bold text-xl">V</span>
            </div>
            <span className="text-foreground font-semibold text-xl tracking-tight">
              VVisa Business
            </span>
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Welcome to VVisa Business
            </h1>
            <p className="mt-3 text-white/70 text-sm leading-relaxed">
              Start processing visas faster and grow your travel business.
            </p>
          </div>

          {/* Feature Cards */}
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
                    <h3 className="font-medium text-sm text-white">
                      {feature.title}
                    </h3>
                    <ul className="mt-1.5 space-y-0.5">
                      {feature.points.map((point) => (
                        <li
                          key={point}
                          data-point={point}
                          className="text-[0px] leading-relaxed text-white/70 after:text-xs after:content-[attr(data-point)]"
                        >
                          â€¢ {point}
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

      {/* Right Panel â€” Signup Form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex w-full items-start justify-center bg-[#f5f7fb] px-5 py-8 sm:px-8 lg:min-h-screen lg:items-center lg:px-12"
      >
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:my-8">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-950">Create your account</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Get started with VVisa in minutes
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1 text-center text-sm font-medium text-slate-600">
            <span className="rounded bg-white px-3 py-2 text-slate-900 shadow-sm">Email</span>
            <span className="px-3 py-2">Mobile</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Phone Number with India Flag */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Mobile Number
              </Label>
              <div className="flex gap-0">
                <div className="flex h-11 shrink-0 items-center gap-2 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 [&>span:first-child]:hidden">
                  <span className="text-lg">ðŸ‡®ðŸ‡³</span>
                  <span className="text-sm text-slate-700">+91</span>
                </div>
                <Input
                  placeholder="Enter mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="h-11 rounded-l-none border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Agency Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Agency Name
              </Label>
              <Input
                placeholder="e.g. Vindox Travels"
                autoComplete="organization"
                className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                {...register('agencyName')}
              />
              {errors.agencyName && (
                <p className="text-xs text-red-400">
                  {errors.agencyName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                type="email"
                placeholder="you@agency.com"
                autoComplete="email"
                className="h-11 border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  className="h-11 border-slate-300 bg-white pr-10 text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="h-11 border-slate-300 bg-white pr-10 text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked === true)
                }
                className="mt-0.5 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <label
                htmlFor="terms"
                className="cursor-pointer text-xs leading-relaxed text-slate-500"
              >
                I agree to the{' '}
                <span className="text-indigo-400 hover:text-indigo-300">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="text-indigo-400 hover:text-indigo-300">
                  Privacy Policy
                </span>
              </label>
            </div>

            {/* Create Account Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full cursor-pointer bg-blue-600 font-medium text-white transition-colors hover:bg-blue-700"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Sign In Link */}
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
        </div>
      </motion.div>
    </div>
  );
}
