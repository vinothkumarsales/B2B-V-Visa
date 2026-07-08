'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Globe2,
  MailCheck,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type {
  CareersDemoAgent,
  CareersDemoApplicationAnswer,
  CareersDemoJob,
  CareersDemoMaterial,
  CareersDemoTimelineItem,
} from '@/server/careers/demo-data';

type CareersDemoExperienceProps = {
  candidate: {
    name: string;
    targetRegion: string;
    targetRoles: string[];
    experience: string;
    skills: string[];
    missingInformation: string[];
    reviewStatus: string;
    confidenceScore: string;
    currentRole: string;
    preferredCountries: string[];
    professionalSummary: string;
    workExperience: string[];
  };
  timeline: CareersDemoTimelineItem[];
  agents: CareersDemoAgent[];
  jobs: CareersDemoJob[];
  metrics: readonly (readonly [string, string])[];
  materials: CareersDemoMaterial[];
  europeBenefits: string[];
  coverLetter: {
    jobTitle: string;
    company: string;
    location: string;
    generatedBy: string;
    reviewStatus: string;
    unsupportedClaims: string;
    candidateActionRequired: string;
    body: string[];
  };
  recruiterEmail: {
    to: string;
    subject: string;
    status: string;
    mailboxDraft: string;
    attachments: string[];
    bodyPreview: string;
  };
  applicationAnswers: CareersDemoApplicationAnswer[];
};

const safetyLabels = [
  'Demo mode',
  'No real applications submitted',
  'No real payment processed',
  'No external job portals contacted',
];

const materialIcons = [FileText, ClipboardCheck, MailCheck, BadgeCheck];
const workflowTabs = ['Resume extraction', 'Jobs', 'Application kit', 'Internal review', 'Tracking'] as const;

export function CareersDemoExperience({
  candidate,
  timeline,
  agents,
  jobs,
  metrics,
  materials,
  europeBenefits,
  coverLetter,
  recruiterEmail,
  applicationAnswers,
}: CareersDemoExperienceProps) {
  const [step, setStep] = useState(5);
  const [materialIndex, setMaterialIndex] = useState(0);
  const [workflowTab, setWorkflowTab] = useState<(typeof workflowTabs)[number]>('Resume extraction');
  const progress = useMemo(() => Math.round(((step + 1) / timeline.length) * 100), [step, timeline.length]);
  const activeMaterial = materials[materialIndex] ?? materials[0];

  function runJourney() {
    setStep(0);
    let next = 0;
    const timer = window.setInterval(() => {
      next += 1;
      setStep(Math.min(next, timeline.length - 1));
      if (next >= timeline.length - 1) window.clearInterval(timer);
    }, 280);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_38%,#f4f8fb_100%)] text-foreground">
      <section className="relative border-b border-vvisa-border-subtle">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_10%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_84%_8%,rgba(20,184,166,0.15),transparent_26%),radial-gradient(circle_at_50%_90%,rgba(99,102,241,0.12),transparent_32%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              {safetyLabels.map((label) => (
                <Badge key={label} variant="secondary" className="border-primary/20 bg-white/80 text-primary shadow-[var(--vvisa-shadow-sm)]">
                  <ShieldCheck className="size-3.5" />
                  {label}
                </Badge>
              ))}
            </div>
            <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.04] md:text-6xl">
              See how VVisa Careers manages a Europe job-search journey
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-vvisa-text-secondary">
              From resume intake to service activation, opportunity tracking, internal review, and employer-response tasks - all in one managed dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={runJourney} className="group">
                <Play className="size-4" />
                Run demo journey
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/careers/dashboard">Open candidate dashboard</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/admin/careers">Open admin console</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-3xl border border-vvisa-border-subtle bg-white/90 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Command center preview</p>
                  <h2 className="mt-2 text-2xl font-semibold">Europe service flow</h2>
                </div>
                <Badge className="bg-emerald-300 text-emerald-950">{progress}% complete</Badge>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-cyan-300" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
              </div>
              <div className="mt-6 grid gap-3">
                {timeline.slice(Math.max(0, step - 2), step + 1).map((item, index) => (
                  <motion.div key={item.label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-white/10 bg-white/7 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-cyan-300 text-sm font-semibold text-slate-950">{step - index + 1}</span>
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Section eyebrow="Demo progress timeline" title="A complete journey, simulated safely">
        <div className="rounded-3xl border border-vvisa-border-subtle bg-white p-5 shadow-[var(--vvisa-shadow-sm)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-vvisa-text-muted">Animated fixture progress</p>
              <p className="text-2xl font-semibold">{timeline[step]?.label}</p>
            </div>
            <Button onClick={runJourney}>
              <Play className="size-4" />
              Run demo journey
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {timeline.map((item, index) => {
              const complete = index <= step;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${complete ? 'border-primary/30 bg-primary/5 shadow-[var(--vvisa-shadow-sm)]' : 'border-vvisa-border-subtle bg-vvisa-surface-2'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`size-3 rounded-full ${complete ? 'bg-primary shadow-[0_0_0_6px_rgba(37,99,235,0.12)]' : 'bg-vvisa-border'}`} />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-vvisa-text-muted">Step {index + 1}</span>
                  </div>
                  <p className="mt-3 font-semibold">{item.label}</p>
                  <p className="mt-2 text-xs leading-5 text-vvisa-text-secondary">{item.detail}</p>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section eyebrow="Agent workflow results" title="Core agents producing safe demo outputs">
        <div className="mb-5 flex flex-wrap gap-2">
          {workflowTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setWorkflowTab(tab)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${workflowTab === tab ? 'border-primary bg-primary text-primary-foreground shadow-[var(--vvisa-shadow-sm)]' : 'border-vvisa-border-subtle bg-white text-vvisa-text-secondary hover:bg-vvisa-surface-2'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-vvisa-text-secondary">
          Demo mode: these agents show fixture results only. No external portal contacted, no real email sent, and no real application submitted.
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="rounded-3xl border border-vvisa-border-subtle bg-white p-5 shadow-[var(--vvisa-shadow-sm)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="size-5" />
                </div>
                <Badge variant={agent.status === 'Review required' ? 'outline' : 'secondary'}>{agent.status}</Badge>
              </div>
              <h3 className="mt-4 font-semibold">{agent.name}</h3>
              <p className="mt-2 text-sm leading-6 text-vvisa-text-secondary">{agent.action}</p>
              <div className="mt-4 grid gap-2 text-xs">
                <Status label="Result" value={agent.result} />
                <Status label="Output" value={agent.output} />
                <Status label="Completed" value={agent.completedAt} />
                <Status label="Confidence" value={agent.confidence} />
                <Status label="Next" value={agent.next} />
              </div>
              <p className="mt-4 text-xs font-medium text-primary">Safe demo label: Fixture result</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Fixture resume extraction preview" title="Extracted candidate profile">
        <p className="mb-5 rounded-2xl border border-vvisa-border-subtle bg-white p-4 text-sm leading-6 text-vvisa-text-secondary shadow-[var(--vvisa-shadow-sm)]">
          Demo extraction preview - no real resume processed on this page.
        </p>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="rounded-3xl border-vvisa-border-subtle bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <CardContent className="p-6">
              <Badge className="bg-cyan-300 text-slate-950">Fixture resume extraction preview</Badge>
              <h2 className="mt-5 text-3xl font-semibold">{candidate.name}</h2>
              <p className="mt-2 text-slate-300">{candidate.currentRole} - {candidate.experience} experience - {candidate.targetRegion}</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/7 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Professional summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{candidate.professionalSummary}</p>
              </div>
              <div className="mt-6 grid gap-3">
                {candidate.targetRoles.map((role) => (
                  <div key={role} className="rounded-xl border border-white/10 bg-white/7 p-3 text-sm">{role}</div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoPanel title="Personal details" items={[candidate.name, candidate.targetRegion, candidate.experience]} icon={UsersRound} />
            <InfoPanel title="Skills extracted" items={candidate.skills} icon={Sparkles} />
            <InfoPanel title="Work experience" items={candidate.workExperience} icon={BriefcaseBusiness} />
            <InfoPanel title="Target roles" items={candidate.targetRoles} icon={Target} />
            <InfoPanel title="Preferred countries" items={candidate.preferredCountries} icon={Globe2} />
            <InfoPanel title="Missing information" items={candidate.missingInformation} icon={ShieldAlert} />
            <div className="rounded-2xl border border-vvisa-border-subtle bg-emerald-50 p-5 md:col-span-2">
              <p className="flex items-center gap-2 font-semibold text-emerald-900"><CheckCircle2 className="size-5" /> Review status: {candidate.reviewStatus}</p>
              <p className="mt-2 text-sm text-emerald-800">Confidence score: {candidate.confidenceScore}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Why Europe?" title="A strong market direction without overpromising sponsorship">
        <p className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-vvisa-text-secondary">
          Europe is our first launch corridor. The same managed workflow can later support other countries and regions based on available packages.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {europeBenefits.map((benefit) => (
            <div key={benefit} className="rounded-2xl border border-vvisa-border-subtle bg-white p-5 shadow-[var(--vvisa-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--vvisa-shadow-md)]">
              <Globe2 className="size-5 text-primary" />
              <p className="mt-4 font-semibold">{benefit}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Jobs discovered" title="Fixture opportunity pipeline">
        <div className="grid gap-4 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={`${job.role}-${job.location}`} className="rounded-3xl border-vvisa-border-subtle bg-white transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{job.role}</p>
                    <p className="mt-1 text-sm text-vvisa-text-muted">{job.company}</p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">{job.score}</Badge>
                </div>
                <p className="mt-4 text-sm text-vvisa-text-secondary">{job.location}</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <Status label="Sponsorship" value={job.sponsorship} />
                  <Status label="Application kit" value={job.applicationKitStatus} />
                  <Status label="Internal review" value={job.internalReviewStatus} />
                  <Status label="Application stage" value={job.applicationStage} />
                  <Status label="Status" value={job.status} />
                  <Status label="Next" value={job.nextStep} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="Application command center" title="Fixture metrics for the managed workflow">
        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-vvisa-border-subtle bg-white p-5 shadow-[var(--vvisa-shadow-sm)]">
              <p className="text-3xl font-semibold">{value}</p>
              <p className="mt-2 text-sm text-vvisa-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Application materials preview" title="Prepared materials, not real documents">
        <p className="mb-5 rounded-2xl border border-vvisa-border-subtle bg-white p-4 text-sm leading-6 text-vvisa-text-secondary shadow-[var(--vvisa-shadow-sm)]">
          Fixture result: generated material is preview-only. No documents are created, uploaded, emailed, or submitted from this demo page.
        </p>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-3">
            {materials.map((material, index) => {
              const Icon = materialIcons[index] ?? FileText;
              return (
                <button key={material.title} type="button" onClick={() => setMaterialIndex(index)} className={`rounded-2xl border p-4 text-left transition ${materialIndex === index ? 'border-primary/40 bg-primary/5 shadow-[var(--vvisa-shadow-sm)]' : 'border-vvisa-border-subtle bg-white'}`}>
                  <Icon className="size-5 text-primary" />
                  <p className="mt-3 font-semibold">{material.title}</p>
                  <p className="mt-1 text-xs text-vvisa-text-muted">{material.status}</p>
                </button>
              );
            })}
          </div>
          <Card className="rounded-3xl border-vvisa-border-subtle bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <CardContent className="p-6">
              <Badge className="bg-cyan-300 text-slate-950">Demo preview only</Badge>
              <h3 className="mt-5 text-3xl font-semibold">{activeMaterial.title}</h3>
              <p className="mt-3 text-cyan-100">{activeMaterial.status}</p>
              <p className="mt-6 rounded-2xl border border-white/10 bg-white/7 p-5 leading-7 text-slate-200">{activeMaterial.snippet}</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section eyebrow="Generated cover letter" title="Application Kit Agent output">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <Card className="rounded-3xl border-vvisa-border-subtle bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
            <CardContent className="p-6">
              <Badge className="bg-primary text-primary-foreground">Generated by {coverLetter.generatedBy}</Badge>
              <h3 className="mt-5 text-3xl font-semibold">{coverLetter.jobTitle} - {coverLetter.company}</h3>
              <p className="mt-2 text-vvisa-text-secondary">{coverLetter.location}</p>
              <div className="mt-6 rounded-2xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-5 text-sm leading-7 text-vvisa-text-secondary">
                {coverLetter.body.map((line) => (
                  <p key={line} className="mb-3 last:mb-0">{line}</p>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-vvisa-border-subtle bg-slate-950 text-white">
            <CardContent className="grid gap-3 p-6 text-sm">
              <Status label="Internal review status" value={coverLetter.reviewStatus} />
              <Status label="Unsupported claims" value={coverLetter.unsupportedClaims} />
              <Status label="Candidate action required" value={coverLetter.candidateActionRequired} />
              <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
                <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-cyan-300" /> No real application submitted</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section eyebrow="Recruiter email draft" title="Managed draft workflow">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="rounded-3xl border-vvisa-border-subtle bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <CardContent className="p-6">
              <Badge className="bg-cyan-300 text-slate-950">No real email sent</Badge>
              <h3 className="mt-5 text-3xl font-semibold">Recruiter email draft</h3>
              <p className="mt-4 leading-7 text-slate-300">This demo does not send emails. It shows the managed draft workflow.</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
            <CardContent className="grid gap-3 p-6 text-sm">
              <Status label="To" value={recruiterEmail.to} />
              <Status label="Subject" value={recruiterEmail.subject} />
              <Status label="Attachments" value={recruiterEmail.attachments.join(', ')} />
              <Status label="Status" value={recruiterEmail.status} />
              <Status label="Mailbox draft" value={recruiterEmail.mailboxDraft} />
              <div className="rounded-2xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-vvisa-text-muted">Body preview</p>
                <p className="mt-2 leading-7 text-vvisa-text-secondary">{recruiterEmail.bodyPreview}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section eyebrow="Application answers preview" title="Conservative answers with candidate-input guardrails">
        <div className="grid gap-4 lg:grid-cols-3">
          {applicationAnswers.map((answer) => (
            <Card key={answer.question} className="rounded-3xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
              <CardContent className="p-5">
                <Badge variant={answer.status.includes('required') || answer.status.includes('Blocked') ? 'outline' : 'secondary'}>{answer.status}</Badge>
                <h3 className="mt-4 font-semibold">{answer.question}</h3>
                <p className="mt-3 text-sm leading-7 text-vvisa-text-secondary">{answer.answer}</p>
                <p className="mt-4 text-xs font-medium text-primary">Demo mode: legal, salary, and sponsorship answers are not filled blindly.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="Employer response" title="Interview task preview">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-vvisa-border-subtle bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
            <CardContent className="p-6">
              <Badge className="bg-emerald-100 text-emerald-800">Interview requested</Badge>
              <h3 className="mt-5 text-3xl font-semibold">Northbridge Labs GmbH</h3>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <Status label="Role" value="Backend Engineer" />
                <Status label="Round" value="Recruiter screening" />
                <Status label="Suggested date" value="Tomorrow" />
                <Status label="Candidate task" value="Confirm availability and prepare for screening call" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-vvisa-border-subtle bg-white">
            <CardContent className="p-6">
              <p className="flex items-center gap-2 font-semibold"><CalendarClock className="size-5 text-primary" /> Planned integration preview</p>
              <div className="mt-5 grid gap-3">
                {['Google Calendar: planned', 'Google Meet: planned', 'Reminders: planned'].map((item) => (
                  <div key={item} className="rounded-xl bg-vvisa-surface-2 p-3 text-sm text-vvisa-text-secondary">{item}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section eyebrow="Internal operations preview" title="Admin pipeline view">
        <div className="rounded-3xl border border-vvisa-border-subtle bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="grid gap-4 md:grid-cols-3">
            {['Payments verified', 'Service active', 'Activation handoff pending', 'Internal review queue', 'Application readiness', 'Employer response review'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/7 p-4">
                <CheckCircle2 className="size-5 text-cyan-300" />
                <p className="mt-3 font-semibold">{item}</p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-6 bg-white text-slate-950 hover:bg-slate-100">
            <Link href="/admin/careers">Open admin console</Link>
          </Button>
        </div>
      </Section>

      <section className="px-5 pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#0f766e_100%)] p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] md:p-12">
          <Badge className="bg-white text-slate-950">Demo complete</Badge>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">Show the full story, then move to real onboarding.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-200">This route is presentation-only. It does not process real payments, contact employers, submit applications, or run external automation.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
              <Link href="/careers/onboarding">Start real onboarding</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white">
              <Link href="/careers/dashboard">View dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white">
              <Link href="/careers">Back to Careers home</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-12 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoPanel({ title, items, icon: Icon }: { title: string; items: string[]; icon: typeof UsersRound }) {
  return (
    <Card className="rounded-2xl border-vvisa-border-subtle bg-white shadow-[var(--vvisa-shadow-sm)]">
      <CardContent className="p-5">
        <Icon className="size-5 text-primary" />
        <p className="mt-3 font-semibold">{title}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="secondary">{item}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-vvisa-border-subtle bg-vvisa-surface-2 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-vvisa-text-muted">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}
