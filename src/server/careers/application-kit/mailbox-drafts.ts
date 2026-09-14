import fs from 'node:fs/promises';
import path from 'node:path';

export type MailboxDraft = {
  requestId: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  draft: {
    subject: string;
    body: string;
    raw: string;
    prohibitedTermsFound: boolean;
  };
  createdAt: string;
  sent: false;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function redact(text: string, phrases: string[]): { text: string; found: boolean } {
  if (!phrases.length) return { text, found: false };
  const escaped = phrases.map(escapeRegExp);
  const pattern = new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'gi');
  const found = pattern.test(text);
  return { text: text.replace(pattern, '[REDACTED]'), found };
}

export async function writeRecruiterEmailDraft({
  requestId,
  candidateName,
  jobTitle,
  company,
  coverLetterMarkdown,
  prohibitedTerms = [],
}: {
  requestId: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  coverLetterMarkdown: string;
  prohibitedTerms?: string[];
}): Promise<MailboxDraft> {
  const subject = `Application: ${candidateName} → ${jobTitle} at ${company}`;
  const raw = `${subject}\n\n${coverLetterMarkdown || ''}`.trim();
  const body = raw;
  const { text: redacted, found } = redact(body, prohibitedTerms);

  const draft: MailboxDraft = {
    requestId,
    candidateName,
    jobTitle: jobTitle || '',
    company: company || '',
    draft: {
      subject,
      body: redacted,
      raw,
      prohibitedTermsFound: found,
    },
    createdAt: new Date().toISOString(),
    sent: false,
  };

  return draft;
}

export async function assertMailboxNotSent(draft: MailboxDraft): Promise<{ ok: true } | { ok: false; error: { code: string; message: string } }> {
  if (draft.sent) {
    return { ok: false, error: { code: 'UNEXPECTED_SIDE_EFFECT', message: 'Mailbox draft marks itself as sent.' } };
  }
  if (!process.env.CAREERS_MAILBOX_SEND_ENABLED) {
    return { ok: true };
  }
  return { ok: true };
}
