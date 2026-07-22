import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileSearch, FileText, Gauge, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { MittoCareerShell } from '@/components/careers/MittoCareerShell';
import { GlassCard, SectionHeading, StatusBadge } from '@/components/careers/MittoPrimitives';
import { redirect } from 'next/navigation';

const workspace = [
  { label: 'Profile setup', value: 'Start here', detail: 'Add your experience, target roles, regions, and work authorization.', icon: UserRound, href: '/careers/onboarding', status: 'Available' as const },
  { label: 'Resume intelligence', value: 'Structured review', detail: 'Upload your resume for parsing and a managed readiness review.', icon: FileText, href: '/careers/onboarding', status: 'Available' as const },
  { label: 'Application operations', value: 'Human controlled', detail: 'Review application kits, approvals, and visible service activity.', icon: BriefcaseBusiness, href: '/careers/dashboard', status: 'Behind feature flag' as const },
];

export default function MittoCareerPortalPage() {
  redirect('/#workspace');
  return (
    <MittoCareerShell>
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-12 lg:px-8 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="mitto-eyebrow"><Sparkles className="size-4" /> Candidate workspace</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-.045em] text-white md:text-7xl">One calm interface for your job-search operation.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Build your profile, understand service readiness, and keep every human review and application artifact in one visible command center.</p>
          </div>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-400">Workspace readiness</span><StatusBadge status="Available" /></div>
            <div className="mt-6 flex items-end gap-3"><strong className="text-5xl text-white">0%</strong><span className="pb-1 text-sm text-slate-400">before onboarding</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[8%] rounded-full bg-gradient-to-r from-cyan-300 to-indigo-400" /></div>
            <Link href="/careers/onboarding" className="mitto-button mt-6 w-full">Create my profile <ArrowRight className="size-4" /></Link>
          </GlassCard>
        </div>

        <div className="mt-16"><SectionHeading eyebrow="Start simply" title="Three surfaces. One managed journey." copy="Each capability is labelled by its real availability. No invisible automation and no claims of guaranteed placement." /></div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {workspace.map(({ icon: Icon, ...item }) => (
            <GlassCard key={item.label} className="group flex min-h-72 flex-col p-6">
              <div className="flex items-start justify-between gap-4"><span className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-200"><Icon className="size-6" /></span><StatusBadge status={item.status} /></div>
              <p className="mt-8 text-sm text-cyan-200">{item.value}</p><h2 className="mt-2 text-2xl font-semibold text-white">{item.label}</h2><p className="mt-3 flex-1 leading-7 text-slate-400">{item.detail}</p>
              <Link href={item.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">Open workspace <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="mt-8 grid gap-6 p-6 md:grid-cols-4">
          {[['Profile', 'Candidate-owned', Gauge], ['Discovery', 'Demo available', FileSearch], ['Application kits', 'Approval gated', ShieldCheck], ['Submission', 'Human controlled', CheckCircle2]].map(([title, value, Icon]) => (
            <div key={title as string} className="rounded-2xl border border-white/8 bg-black/20 p-5"><Icon className="size-5 text-cyan-200" /><p className="mt-5 text-xs uppercase tracking-[.18em] text-slate-500">{title as string}</p><p className="mt-2 font-medium text-white">{value as string}</p></div>
          ))}
        </GlassCard>
      </section>
    </MittoCareerShell>
  );
}
