'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/app.store';
import { loginSchema, type LoginPayload } from '@/lib/auth/login-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  Zap,
  Headphones,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';

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

function loginErrorMessage(code?: string) {
  switch (code) {
    case 'INVALID_JSON':
    case 'INVALID_REQUEST_BODY':
      return 'Please enter a valid email and password.';
    case 'BOOTSTRAP_LOGIN_DISABLED':
      return 'Admin bootstrap login is currently disabled.';
    case 'INVALID_CREDENTIALS':
      return 'The email or password is incorrect.';
    case 'ACCOUNT_LOCKED':
      return 'Too many failed attempts. Try again later.';
    case 'google_not_configured':
    case 'GOOGLE_NOT_CONFIGURED':
      return 'Google login is not configured yet. Add the Google OAuth credentials in Vercel and redeploy.';
    case 'google_invalid_state':
    case 'GOOGLE_STATE_MISMATCH':
      return 'Google login expired. Please try again.';
    case 'google_email_unverified':
    case 'GOOGLE_EMAIL_NOT_VERIFIED':
      return 'Google could not verify this email address.';
    case 'google_login_failed':
    case 'GOOGLE_TOKEN_EXCHANGE_FAILED':
      return 'Google rejected the login callback. Check that the Google client secret and callback URL are correct.';
    case 'GOOGLE_PROFILE_FAILED':
      return 'Google login succeeded, but the profile could not be loaded.';
    case 'DATABASE_CONNECTION_FAILED':
      return 'Google login reached the server, but the database connection failed.';
    case 'DATABASE_SCHEMA_MISSING':
      return 'Google login reached the database, but required tables are missing.';
    case 'USER_BOOTSTRAP_FAILED':
      return 'Google login could not create the account. Please try again.';
    case 'SESSION_CREATION_FAILED':
      return 'Google login could not create the session. Please try again.';
    case 'GOOGLE_LOGIN_FAILED':
      return 'Google login failed. Please try again.';
    default:
      return 'Login failed. Please try again.';
  }
}

export default function LoginView() {
  const router = useRouter();
  const navigate = useAppStore((s) => s.navigate);
  const login = useAppStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState(() => {
    if (typeof window === 'undefined') return '';
    return loginErrorMessage(new URLSearchParams(window.location.search).get('error') ?? undefined);
  });
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginPayload) => {
    setSubmitting(true);
    setServerError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setServerError(loginErrorMessage(data?.error?.code));
        return;
      }
      if (data.agency) login(data.agency);
      router.push('/dashboard');
    } catch {
      setServerError('Unable to reach the login service');
    } finally {
      setSubmitting(false);
    }
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
          onClick={() => navigate('landing')}
          className="relative z-10 flex w-fit items-center gap-2 text-primary-foreground/80 transition-colors hover:text-primary-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="relative z-10 flex flex-col gap-8">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm">
              <span className="text-primary-foreground font-bold text-xl">V</span>
            </div>
            <span className="text-primary-foreground font-semibold text-xl tracking-tight">
              VVisa Business
            </span>
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Join 10,000+ Agents growing with VVisa!
            </h1>
            <p className="mt-3 text-white/70 text-sm leading-relaxed">
              The fastest way to process visa applications for your customers.
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

      {/* Right Panel — Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full md:w-[60%] bg-vvisa-bg flex items-center justify-center p-6 md:p-12"
      >
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Login to VVisa</h2>
            <p className="mt-1.5 text-sm text-vvisa-text-muted">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="login-email"
                className="text-sm font-medium text-vvisa-text-secondary"
              >
                Email
              </Label>
              <Input
                id="login-email"
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
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="login-password"
                  className="text-sm font-medium text-vvisa-text-secondary"
                >
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Reset My Password
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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

            {/* Sign In Button */}
            {serverError && (
              <p className="text-xs text-red-400">{serverError}</p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-foreground font-medium transition-colors cursor-pointer"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <Separator className="flex-1 bg-vvisa-border" />
            <span className="text-xs text-vvisa-text-muted font-medium">OR</span>
            <Separator className="flex-1 bg-vvisa-border" />
          </div>

          {/* Google Button */}
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setServerError('');
              window.location.href = '/api/auth/google';
            }}
            className="w-full h-11 bg-vvisa-surface border-vvisa-border text-white hover:bg-vvisa-surface-2 hover:text-foreground font-medium transition-colors cursor-pointer"
          >
            <svg className="size-4 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm text-vvisa-text-muted">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => {
                navigate('signup');
                router.push('/register');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
            >
              Sign up
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
