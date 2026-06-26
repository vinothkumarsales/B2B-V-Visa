'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { mockAgency } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
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
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
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

  const handleSendOtp = () => {
    // In production this would call an API
    setOtpSent(true);
    setValue('otp', '');
  };

  const onSubmit = () => {
    // Auto-login after successful signup
    login(mockAgency);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row vv-page">
      {/* Left Panel — Branding */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex w-full flex-col justify-between overflow-hidden bg-primary p-8 text-primary-foreground md:w-[40%] md:p-12"
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
          <div className="flex flex-col gap-3">
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
                    <h3 className="text-foreground font-medium text-sm">
                      {feature.title}
                    </h3>
                    <ul className="mt-1.5 space-y-0.5">
                      {feature.points.map((point) => (
                        <li
                          key={point}
                          className="text-white/60 text-xs leading-relaxed"
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

      {/* Right Panel — Signup Form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full md:w-[60%] bg-vvisa-bg flex items-center justify-center p-6 md:p-12 overflow-y-auto"
      >
        <div className="w-full max-w-md py-8">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="mt-1.5 text-sm text-vvisa-text-muted">
              Get started with VVisa in minutes
            </p>
          </div>

          {/* Tab Toggle */}
          <div className="flex bg-vvisa-surface rounded-lg p-1 mb-6 border border-vvisa-border">
            <button className="flex-1 h-9 rounded-md bg-indigo-600 text-foreground text-sm font-medium transition-colors cursor-pointer">
              Sign up with Phone
            </button>
            <button className="flex-1 h-9 rounded-md text-vvisa-text-muted text-sm font-medium hover:text-vvisa-text-secondary transition-colors cursor-pointer">
              Sign up with Email
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Phone Number with India Flag */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-vvisa-text-secondary">
                Mobile Number
              </Label>
              <div className="flex gap-0">
                <div className="flex items-center gap-2 bg-vvisa-surface border border-vvisa-border border-r-0 rounded-l-md px-3 h-11 shrink-0">
                  <span className="text-lg">🇮🇳</span>
                  <span className="text-sm text-vvisa-text-secondary">+91</span>
                </div>
                <Input
                  placeholder="Enter mobile number"
                  className="h-11 bg-vvisa-surface border-vvisa-border text-white placeholder:text-vvisa-text-muted focus:border-indigo-500 focus:ring-indigo-500/20 rounded-l-none"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-400">{errors.phone.message}</p>
              )}
            </div>

            {/* Send OTP / OTP Input */}
            {!otpSent ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleSendOtp}
                className="w-full h-11 bg-vvisa-surface border-vvisa-border text-white hover:bg-vvisa-surface-2 hover:text-foreground font-medium transition-colors cursor-pointer"
              >
                Send OTP
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-vvisa-text-secondary">
                  Enter OTP
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={(val) => {
                      setOtpValue(val);
                      setValue('otp', val);
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-indigo-400 text-center">
                  OTP sent! Check your phone.
                </p>
              </motion.div>
            )}

            {/* Agency Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-vvisa-text-secondary">
                Agency Name
              </Label>
              <Input
                placeholder="e.g. Vindox Travels"
                className="h-11 bg-vvisa-surface border-vvisa-border text-white placeholder:text-vvisa-text-muted focus:border-indigo-500 focus:ring-indigo-500/20"
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
              <Label className="text-sm font-medium text-vvisa-text-secondary">
                Email
              </Label>
              <Input
                type="email"
                placeholder="you@agency.com"
                className="h-11 bg-vvisa-surface border-vvisa-border text-white placeholder:text-vvisa-text-muted focus:border-indigo-500 focus:ring-indigo-500/20"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-vvisa-text-secondary">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  className="h-11 bg-vvisa-surface border-vvisa-border text-white placeholder:text-vvisa-text-muted focus:border-indigo-500 focus:ring-indigo-500/20 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-vvisa-text-muted hover:text-vvisa-text-secondary transition-colors"
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
              <Label className="text-sm font-medium text-vvisa-text-secondary">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  className="h-11 bg-vvisa-surface border-vvisa-border text-white placeholder:text-vvisa-text-muted focus:border-indigo-500 focus:ring-indigo-500/20 pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-vvisa-text-muted hover:text-vvisa-text-secondary transition-colors"
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
                className="mt-0.5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <label
                htmlFor="terms"
                className="text-xs text-vvisa-text-muted leading-relaxed cursor-pointer"
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
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-foreground font-medium transition-colors cursor-pointer"
            >
              Create Account
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="mt-8 text-center text-sm text-vvisa-text-muted">
            Already have an account?{' '}
            <button
              onClick={() => {
                navigate('login');
                router.push('/login');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
