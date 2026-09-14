'use client';

import { useRef, useState } from 'react';
import { Linkedin, Loader2, Mail, UploadCloud } from 'lucide-react';

export function MittoDashboardActions({ candidateId, initialConnections }: { candidateId: string; initialConnections: Array<{ provider: string; connected: boolean }> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [connections, setConnections] = useState(initialConnections);

  async function upload(file?: File) {
    if (!file) return;
    setBusy('resume'); setMessage('');
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = reject; reader.readAsDataURL(file); });
      const response = await fetch('/api/careers/resume', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidateId, fileName: file.name, mimeType: file.type, contentBase64 }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message ?? 'Upload unavailable');
      setMessage(data.analysis?.status === 'ready' ? `Resume analysed. ATS readiness: ${data.analysis.atsScore}/100. Refreshing your intelligence dashboard…` : 'Resume uploaded. OCR or manual review is required before scoring.');
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload unavailable.'); }
    finally { setBusy(''); }
  }

  async function connect(provider: 'mail' | 'linkedin') {
    setMessage(provider === 'mail'
      ? 'Gmail requires the Mitto callback to be approved in Google Cloud. No connection was created.'
      : 'LinkedIn requires a LinkedIn OAuth application and callback approval. No connection was created.');
  }

  const connected = (provider: string) => connections.find(item => item.provider === provider)?.connected;
  return <div className="grid gap-4 lg:grid-cols-3"><Action title="Upload a new resume" copy="Text-based PDF recommended · private and versioned"><input ref={fileRef} className="hidden" type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={event => void upload(event.target.files?.[0])} /><button className="mitto-button-secondary w-full" onClick={() => fileRef.current?.click()} disabled={busy === 'resume'}>{busy === 'resume' ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} Upload and analyse</button></Action><Action title="Gmail" copy="Waiting for Google callback approval"><button className="mitto-button-secondary w-full" onClick={() => void connect('mail')} disabled={connected('mail')}><Mail className="size-4" /> {connected('mail') ? 'Connected' : 'Configuration required'}</button></Action><Action title="LinkedIn" copy="Waiting for a LinkedIn OAuth application"><button className="mitto-button-secondary w-full" onClick={() => void connect('linkedin')} disabled={connected('linkedin')}><Linkedin className="size-4" /> {connected('linkedin') ? 'Connected' : 'Configuration required'}</button></Action>{message && <p className="rounded-2xl border border-cyan-700/20 bg-cyan-50 p-4 text-sm text-slate-700 lg:col-span-3">{message}</p>}</div>;
}

function Action({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) { return <div className="mitto-glass rounded-[1.3rem] p-5"><h3 className="font-semibold">{title}</h3><p className="mb-5 mt-2 min-h-10 text-sm text-slate-400">{copy}</p>{children}</div>; }
