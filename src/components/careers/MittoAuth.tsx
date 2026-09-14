'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, LockKeyhole, Orbit, ShieldCheck, Sparkles } from 'lucide-react';

export function MittoAuth({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const search = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => search.get('error') ? 'Authentication could not be completed. Please try again.' : '');
  const isRegister = mode === 'register';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (isRegister && password !== String(form.get('confirmPassword') ?? '')) { setBusy(false); return setError('Passwords do not match.'); }
    try {
      const body = isRegister ? { phone: form.get('phone'), agencyName: `${String(form.get('fullName')).trim()} Career Workspace`, email: form.get('email'), password } : { identifier: form.get('identifier'), password };
      const response = await fetch(isRegister ? '/api/auth/register' : '/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message ?? `${isRegister ? 'Registration' : 'Login'} failed.`);
      router.push('/careers/dashboard'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to reach the authentication service.'); }
    finally { setBusy(false); }
  }

  return <main className="mitto-career min-h-screen text-white"><div className="mitto-aurora" aria-hidden="true" /><div className="relative z-10 grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
    <section className="hidden border-r border-white/8 p-12 lg:flex lg:flex-col lg:justify-between"><Link href="/" className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200"><Orbit className="size-5" /></span><span><b className="block">Mitto Career</b><small className="text-[10px] uppercase tracking-[.22em] text-slate-500">Job-search OS</small></span></Link><div className="max-w-xl"><p className="mitto-eyebrow"><Sparkles className="size-4" /> Your private career workspace</p><h1 className="mt-7 text-5xl font-semibold leading-[1.02] tracking-[-.05em]">One account for every step of your search.</h1><p className="mt-6 text-lg leading-8 text-slate-400">Resume intelligence, opportunity matching, application kits, integrations, and human approvals stay together.</p><div className="mt-9 grid gap-3">{['Resume and profile stay private','No application proceeds without approval','Connections can be revoked'].map(item => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.035] p-4 text-sm text-slate-300"><Check className="size-4 text-emerald-300" />{item}</div>)}</div></div><p className="text-xs text-slate-600">Mitto Career · Human-controlled automation</p></section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-md"><Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="size-4" /> Back to Mitto</Link><div className="mitto-glass rounded-[1.75rem] p-6 sm:p-8"><div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><LockKeyhole className="size-5" /></div><h2 className="mt-6 text-3xl font-semibold tracking-[-.035em]">{isRegister ? 'Create your workspace' : 'Welcome back'}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{isRegister ? 'Start your private, managed job-search workspace.' : 'Continue your career workflow where you left it.'}</p>
      <form onSubmit={submit} className="mt-7 space-y-4">{isRegister && <><Field label="Full name" name="fullName" placeholder="Your full name" autoComplete="name" /><Field label="Mobile number" name="phone" placeholder="+91 98765 43210" autoComplete="tel" /></>}<Field label={isRegister ? 'Email address' : 'Email or mobile number'} name={isRegister ? 'email' : 'identifier'} type={isRegister ? 'email' : 'text'} placeholder={isRegister ? 'you@example.com' : 'Email or mobile'} autoComplete="username" /><div><label className="text-xs font-medium text-slate-300" htmlFor="password">Password</label><div className="relative mt-2"><input id="password" name="password" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10" placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-4 top-3.5 text-slate-500" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>{isRegister && <Field label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat password" autoComplete="new-password" />}{error && <p className="rounded-2xl border border-rose-300/15 bg-rose-300/8 p-3 text-sm text-rose-100">{error}</p>}<button disabled={busy} className="mitto-button mt-2 h-12 w-full disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <>{isRegister ? 'Create workspace' : 'Log in'} <ArrowRight className="size-4" /></>}</button></form>
      <div className="mt-5 flex items-center justify-center gap-1 text-sm text-slate-500"><span>{isRegister ? 'Already have an account?' : 'New to Mitto?'}</span><Link href={isRegister ? '/login' : '/register'} className="font-semibold text-cyan-200 hover:text-white">{isRegister ? 'Log in' : 'Create account'}</Link></div><div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-600"><ShieldCheck className="size-3.5" /> Secure server session · approval first</div></div></div></section>
  </div></main>;
}

function Field({ label, name, ...props }: { label: string; name: string; type?: string; placeholder: string; autoComplete: string }) { return <div><label className="text-xs font-medium text-slate-300" htmlFor={name}>{label}</label><input id={name} name={name} required {...props} className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10" /></div>; }
