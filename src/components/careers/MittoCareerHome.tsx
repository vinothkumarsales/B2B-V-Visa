'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, FileText, Linkedin, Loader2, LockKeyhole, Mail, Orbit, Radar, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import type { ConnectionStatusSummary } from '@/lib/connections';

type WorkspaceState = 'loading' | 'signed_out' | 'needs_profile' | 'ready' | 'disabled' | 'error';

export function MittoCareerHome() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<WorkspaceState>('loading');
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionStatusSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  async function refresh() {
    try {
      const response = await fetch('/api/careers/connections', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return setState('signed_out');
      if (response.status === 403) return setState('disabled');
      if (response.status === 404) return setState('needs_profile');
      if (!response.ok || !payload.ok) throw new Error();
      setCandidateId(payload.data.candidateId ?? null);
      setConnections(payload.data.providers ?? []);
      setState('ready');
    } catch { setState('error'); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function connect(provider: 'mail' | 'linkedin') {
    setBusy(provider); setNotice('');
    try {
      const response = await fetch('/api/careers/connections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider }) });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return setState('signed_out');
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? 'Connection setup unavailable.');
      setNotice(`${provider === 'mail' ? 'Gmail' : 'LinkedIn'} authorization is prepared. Live OAuth remains configuration-gated.`);
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to start connection.'); }
    finally { setBusy(null); }
  }

  async function upload(file?: File) {
    if (!file) return;
    if (!candidateId) { setNotice('Create your career profile before uploading a resume.'); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setNotice('Upload a PDF, JPG, PNG, or WebP resume.'); return; }
    setBusy('resume'); setNotice('');
    try {
      const contentBase64 = await toBase64(file);
      const response = await fetch('/api/careers/resume', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidateId, fileName: file.name, mimeType: file.type, contentBase64 }) });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return setState('signed_out');
      if (!response.ok) throw new Error(payload.error?.message ?? 'Resume upload unavailable.');
      setNotice('Resume uploaded securely for review.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to upload resume.'); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ''; }
  }

  const connection = (id: 'mail' | 'linkedin') => connections.find((item) => item.id === id);
  return <main className="mitto-career min-h-screen overflow-hidden text-white"><div className="mitto-aurora" aria-hidden="true" />
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#070912]/80 backdrop-blur-2xl"><div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-5 lg:px-8"><Link href="/" className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200"><Orbit className="size-5" /></span><span><b className="block">Mitto Career</b><small className="text-[10px] uppercase tracking-[.22em] text-slate-500">Job-search OS</small></span></Link><nav className="hidden gap-7 text-sm text-slate-400 md:flex"><a href="#workspace">Workspace</a><a href="#process">How it works</a><a href="#control">Control</a></nav><div className="flex items-center gap-2"><Link href="/login" className="rounded-full px-4 py-2 text-sm text-slate-300">Log in</Link><Link href="/register" className="mitto-button">Create account <ArrowRight className="size-4" /></Link></div></div></header>

    <section className="relative z-10 mx-auto grid max-w-[1480px] gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1fr_.95fr] lg:px-8 lg:pt-24"><div className="flex flex-col justify-center"><p className="mitto-eyebrow"><Sparkles className="size-4" /> One workspace. Human controlled.</p><h1 className="mt-7 text-5xl font-semibold leading-[.97] tracking-[-.06em] sm:text-7xl lg:text-[5.3rem]">Make your job search feel <span className="bg-gradient-to-r from-cyan-200 via-white to-violet-300 bg-clip-text text-transparent">organized.</span></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">Upload your resume, connect Gmail and LinkedIn, review matched roles, and approve every application kit from one private command center.</p><div className="mt-9 flex flex-wrap gap-3"><a href="#workspace" className="mitto-button px-5 py-3">Open workspace <ArrowRight className="size-4" /></a><Link href="/login" className="mitto-button-secondary px-5 py-3">I have an account</Link></div><div className="mt-9 flex flex-wrap gap-5 text-xs text-slate-500">{['No blind auto-apply','Private resume storage','Approval before execution'].map(item => <span key={item} className="flex items-center gap-2"><Check className="size-3.5 text-emerald-300" />{item}</span>)}</div></div><Preview /></section>

    <section id="workspace" className="relative z-10 border-y border-white/8 bg-white/[.018]"><div className="mx-auto max-w-[1480px] px-5 py-24 lg:px-8"><p className="mitto-eyebrow">Your setup</p><h2 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Start once. Manage everything here.</h2><p className="mt-4 max-w-2xl text-slate-400">This workspace checks your real session and capability state. It never pretends an integration is connected.</p><div className="mt-10 grid gap-4 lg:grid-cols-3">
      <Card icon={FileText} title="Career profile" copy="Roles, regions, experience, sponsorship, and relocation preferences." status={state === 'ready' ? 'Ready' : 'Required'}><Link href="/careers/onboarding" className="mitto-button-secondary w-full">{state === 'ready' ? 'Update profile' : 'Create profile'} <ArrowRight className="size-4" /></Link></Card>
      <Card icon={UploadCloud} title="Upload resume" copy="PDF or image, stored privately and versioned for managed review." status={state === 'ready' ? 'Available' : 'Profile first'}><input ref={fileRef} className="hidden" type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} /><button type="button" onClick={() => fileRef.current?.click()} disabled={busy === 'resume'} className="mitto-button-secondary w-full disabled:opacity-50">{busy === 'resume' ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Choose resume</button></Card>
      <div className="mitto-glass rounded-[1.4rem] p-6"><div className="flex justify-between"><span className="rounded-2xl bg-violet-300/10 p-3 text-violet-200"><Radar className="size-6" /></span><State state={state} /></div><h3 className="mt-7 text-xl font-semibold">Connect your search</h3><p className="mt-3 text-sm leading-6 text-slate-400">Prepare governed Gmail outreach and LinkedIn discovery access.</p><div className="mt-6 grid gap-3"><Connect icon={Mail} label="Gmail" connected={connection('mail')?.connected} busy={busy === 'mail'} onClick={() => void connect('mail')} /><Connect icon={Linkedin} label="LinkedIn" connected={connection('linkedin')?.connected} busy={busy === 'linkedin'} onClick={() => void connect('linkedin')} /></div></div>
    </div>{state === 'signed_out' && <Notice><LockKeyhole className="size-4" /> Log in to upload your resume and manage connections.<Link href="/login" className="ml-auto font-semibold">Log in <ArrowRight className="inline size-4" /></Link></Notice>}{state === 'needs_profile' && <Notice>Create your career profile to unlock resume and connection setup.</Notice>}{state === 'disabled' && <Notice><ShieldCheck className="size-4" /> Connections are feature-gated in this environment.</Notice>}{notice && <Notice>{notice}</Notice>}</div></section>

    <section id="process" className="relative z-10 mx-auto max-w-[1480px] px-5 py-24 lg:px-8"><p className="mitto-eyebrow">The operating loop</p><h2 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">One screen from signal to decision.</h2><div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{[['01','Profile intelligence','Resume, skills, preferences, and missing information.'],['02','Opportunity matching','Roles ranked by fit and sponsorship signals.'],['03','Application kit','Tailored CV, cover letter, recruiter note, and answers.'],['04','Your approval','Review evidence and decide what may proceed.']].map(([n,title,copy]) => <div key={n} className="mitto-glass rounded-[1.4rem] p-6"><span className="text-xs font-bold text-cyan-200">{n}</span><h3 className="mt-10 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p></div>)}</div></section>
    <section id="control" className="relative z-10 mx-auto max-w-[1480px] px-5 pb-24 lg:px-8"><div className="mitto-glass grid gap-8 rounded-[2rem] p-8 lg:grid-cols-2"><div><p className="mitto-eyebrow">Built around consent</p><h2 className="mt-5 text-3xl font-semibold">Automation removes busywork, not your judgment.</h2><p className="mt-4 leading-7 text-slate-400">Mitto prepares, scores, validates, and records. Human approval remains the boundary before controlled submission.</p></div><div className="grid gap-3">{['Connections can be revoked','Application kits carry review evidence','Live execution remains capability-gated'].map(item => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-slate-300"><ShieldCheck className="size-4 text-emerald-300" />{item}</div>)}</div></div></section>
    <footer className="relative z-10 border-t border-white/8 px-5 py-8"><div className="mx-auto flex max-w-[1480px] justify-between text-sm text-slate-500"><p>© 2026 Mitto Career.</p><p>career.vvisa.in ready</p></div></footer>
  </main>;
}

function Preview() { return <div className="mitto-float mitto-glass rounded-[1.7rem] p-3"><div className="rounded-[1.3rem] border border-white/8 bg-[#0a0d17]/95 p-6"><div className="flex justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-slate-500">Today</p><p className="mt-1 font-semibold">Candidate command center</p></div><span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] text-emerald-200">Approval first</span></div><div className="mt-6 grid grid-cols-3 gap-3">{[['84%','Profile'],['12','Matches'],['3','Review']].map(([v,l]) => <div key={l} className="rounded-2xl border border-white/8 bg-white/[.045] p-4"><b className="text-2xl">{v}</b><p className="text-[11px] text-slate-500">{l}</p></div>)}</div>{[['Resume intelligence','Complete'],['Opportunity review','In progress'],['Application approval','Waiting for you']].map(([l,s],i) => <div key={l} className="mt-5 flex items-center gap-3"><span className={`size-2 rounded-full ${i === 0 ? 'bg-emerald-300' : i === 1 ? 'bg-cyan-300' : 'bg-amber-300'}`} /><span className="flex-1 text-xs text-slate-300">{l}</span><span className="text-[10px] text-slate-500">{s}</span></div>)}</div></div>; }
function Card({ icon: Icon, title, copy, status, children }: { icon: typeof FileText; title: string; copy: string; status: string; children: ReactNode }) { return <div className="mitto-glass flex min-h-72 flex-col rounded-[1.4rem] p-6"><div className="flex justify-between"><span className="rounded-2xl bg-cyan-300/10 p-3 text-cyan-200"><Icon className="size-6" /></span><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-300">{status}</span></div><h3 className="mt-7 text-xl font-semibold">{title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{copy}</p><div className="mt-6">{children}</div></div>; }
function Connect({ icon: Icon, label, connected, busy, onClick }: { icon: typeof Mail; label: string; connected?: boolean; busy: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} disabled={busy || connected} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-3 disabled:opacity-60"><Icon className="size-4" /><span className="flex-1 text-left text-sm">{label}</span>{busy ? <Loader2 className="size-4 animate-spin" /> : <small>{connected ? 'Connected' : 'Connect'}</small>}</button>; }
function State({ state }: { state: WorkspaceState }) { const labels: Record<WorkspaceState,string> = { loading:'Checking',signed_out:'Login required',needs_profile:'Profile required',ready:'Workspace ready',disabled:'Feature gated',error:'Check setup' }; return <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-300">{labels[state]}</span>; }
function Notice({ children }: { children: ReactNode }) { return <div className="mt-5 flex items-center gap-2 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.06] px-4 py-3 text-sm">{children}</div>; }
function toBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(new Error('Unable to read file.')); reader.readAsDataURL(file); }); }
