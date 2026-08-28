'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/store/app.store';
import { loginSchema, type LoginPayload } from '@/lib/auth/login-schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AuthLayout, FieldError, GoogleMark } from '@/components/auth/AuthLayout';
import { TRUST_POINTS } from '@/content/proof';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

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

const emptySubscribe = () => () => {};

export default function LoginView() {
  const router = useRouter();
  const navigate = useAppStore((s) => s.navigate);
  const login = useAppStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  // An OAuth failure comes back as ?error=CODE. Read it through
  // useSyncExternalStore so the server snapshot (null) and the first client
  // snapshot agree, then let submit results override it.
  const urlErrorCode = useSyncExternalStore(
    emptySubscribe,
    () => new URLSearchParams(window.location.search).get('error'),
    () => null,
  );
  // null = show whatever the URL says; a string = an explicit submit result.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const serverError =
    submitError ?? (urlErrorCode ? loginErrorMessage(urlErrorCode) : '');
  const setServerError = setSubmitError;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginPayload) => {
    setSubmitting(true);
    setServerError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.identifier.trim(), values.password);
      
      // Check verification
      if (!userCredential.user.emailVerified) {
        router.push('/register');
        return;
      }

      const token = await userCredential.user.getIdToken();

      // Check onboarding status
      const onboardRes = await fetch('/api/auth/onboarding-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const onboardData = await onboardRes.json();
      if (!onboardData.onboarded) {
        router.push('/register');
        return;
      }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setServerError(data?.error?.message || 'Login session creation failed');
        return;
      }
      if (data.agency) {
        login(data.agency);
        router.push(`/${data.agency.id}/explore`);
      } else {
        router.push('/explore');
      }
    } catch (error: any) {
      console.error('Firebase Auth Login Failed', error);
      setServerError(error.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Log in to VVisa"
      subtitle="Enter your agency credentials to open the desk."
      footer={
        <p className="mt-8 text-center text-sm text-vvisa-text-secondary">
          No account yet?{' '}
          <button
            type="button"
            onClick={() => {
              navigate('signup');
              router.push('/register');
            }}
            className="rounded font-medium text-primary transition-colors hover:underline"
          >
            Create an agency account
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[var(--mk-radius)] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="login-identifier" className="mk-eyebrow text-foreground">
            Email or mobile
          </Label>
          <Input
            id="login-identifier"
            type="text"
            autoComplete="username"
            autoFocus
            placeholder="you@agency.com"
            className="h-11 rounded-[var(--mk-radius)]"
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
            {...register('identifier')}
          />
          <FieldError id="login-identifier-error">{errors.identifier?.message}</FieldError>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="login-password" className="mk-eyebrow text-foreground">
              Password
            </Label>
            <button
              type="button"
              className="rounded text-xs font-medium text-primary transition-colors hover:underline"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-11 rounded-[var(--mk-radius)] pr-11"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--mk-radius)] text-vvisa-text-muted transition-colors hover:bg-[var(--mk-panel)] hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FieldError id="login-password-error">{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-vvisa-text-muted">or</span>
        <Separator className="flex-1" />
      </div>

      <Button
        variant="outline"
        size="lg"
        type="button"
        onClick={async () => {
          setServerError('');
          setSubmitting(true);
          try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken();

            // Check onboarding status
            const onboardRes = await fetch('/api/auth/onboarding-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const onboardData = await onboardRes.json();
            if (!onboardData.onboarded) {
              router.push('/register');
              return;
            }

            const response = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            const data = await response.json();
            if (!response.ok) {
              setServerError(data?.error?.message || 'Google Login session failed');
              return;
            }
            if (data.agency) login(data.agency);
            router.push('/dashboard');
          } catch (error: any) {
            console.error('Google Auth Failed', error);
            setServerError(error.message || 'Google Authentication failed.');
          } finally {
            setSubmitting(false);
          }
        }}
        className="w-full"
      >
        <GoogleMark />
        Continue with Google
      </Button>

      <ul className="mk-rule-t mt-8 grid grid-cols-3 gap-3 pt-6">
        {TRUST_POINTS.map((p) => (
          <li key={p.label}>
            <p className="mk-numeral text-[13px] text-foreground">{p.value}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-vvisa-text-muted">{p.label}</p>
          </li>
        ))}
      </ul>
    </AuthLayout>
  );
}
