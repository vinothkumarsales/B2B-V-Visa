'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '@/store/app.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthLayout, FieldError } from '@/components/auth/AuthLayout';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

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
    <AuthLayout
      title="Create your account"
      subtitle="Set up your agency in a couple of minutes"
      queue={[
        { name: 'SAPNA CHHAJER', meta: 'Vietnam · 8 travellers', state: 'Approved', tone: 'text-emerald-300' },
        { name: 'VISHAL GIREEYA', meta: 'Turkey · 4 travellers', state: 'Processing', tone: 'text-blue-300' },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="signup-phone">Mobile number</Label>
          <div className="flex">
            <span className="flex h-11 shrink-0 items-center rounded-l-lg border border-r-0 border-input bg-vvisa-surface-2 px-3 text-sm text-vvisa-text-secondary">
              +91
            </span>
            <Input
              id="signup-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              className="h-11 rounded-l-none"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'signup-phone-error' : undefined}
              {...register('phone')}
            />
          </div>
          <FieldError id="signup-phone-error">{errors.phone?.message}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-agency">Agency name</Label>
          <Input
            id="signup-agency"
            type="text"
            autoComplete="organization"
            placeholder="Your travel agency"
            className="h-11"
            aria-invalid={Boolean(errors.agencyName)}
            aria-describedby={errors.agencyName ? 'signup-agency-error' : undefined}
            {...register('agencyName')}
          />
          <FieldError id="signup-agency-error">{errors.agencyName?.message}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Work email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@agency.com"
            className="h-11"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            {...register('email')}
          />
          <FieldError id="signup-email-error">{errors.email?.message}</FieldError>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-11 pr-11"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'signup-password-error' : undefined}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-vvisa-text-muted transition-colors hover:bg-vvisa-surface-2 hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError id="signup-password-error">{errors.password?.message}</FieldError>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="signup-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="h-11 pr-11"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-vvisa-text-muted transition-colors hover:bg-vvisa-surface-2 hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError id="signup-confirm-error">{errors.confirmPassword?.message}</FieldError>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-vvisa-border-subtle bg-vvisa-surface-2/60 p-3.5">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="cursor-pointer text-xs leading-relaxed text-vvisa-text-secondary">
            I agree to the{' '}
            <span className="font-medium text-primary hover:underline">Terms of Service</span> and{' '}
            <span className="font-medium text-primary hover:underline">Privacy Policy</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="brand"
          size="lg"
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-vvisa-text-muted">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => {
            navigate('login');
            router.push('/login');
          }}
          className="rounded font-medium text-primary transition-colors hover:underline"
        >
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
