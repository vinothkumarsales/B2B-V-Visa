import { env } from '@/lib/env';
import { findZohoTravelAgentByEmail } from './find-travel-agent';
import { createZohoCrmNote } from './record-update';
import { auditLog } from '@/server/audit/audit-log';

export interface ArjunMessageForSummary {
  role: 'user' | 'assistant';
  content: string;
}

export interface PushCrmNoteParams {
  partnerEmail: string;
  partnerName?: string;
  agencyName?: string;
  agencyId?: string;
  userId?: string;
  vvisaUid?: string;
  messages: ArjunMessageForSummary[];
  escalationTicket?: string;
  categoryOrDestination?: string;
}

const TRIVIAL_PHRASES = new Set([
  'hi', 'hello', 'hey', 'ok', 'okay', 'thanks', 'thank you',
  'bye', 'goodbye', 'cool', 'sure', 'yes', 'no', 'fine'
]);

/**
 * Determines whether a conversation is substantive enough to warrant a CRM note.
 * Excludes trivial single-word messages, greetings, and acknowledgments.
 */
export function isMeaningfulConversation(messages: ArjunMessageForSummary[]): boolean {
  if (!messages || messages.length < 2) return false;

  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) return false;

  const substantiveKeywords = [
    'visa', 'tourist', 'business', 'passport', 'fee', 'price', 'cost',
    'document', 'documents', 'checklist', 'status', 'application', 'refus',
    'reject', 'flight', 'urgent', 'appointment', 'dubai', 'france', 'schengen',
    'uk', 'singapore', 'germany', 'switzerland', 'italy', 'spain', 'us', 'usa'
  ];

  return userMessages.some((m) => {
    const text = m.content.trim().toLowerCase();
    if (text.length < 6) return false;
    if (TRIVIAL_PHRASES.has(text)) return false;
    return substantiveKeywords.some((kw) => text.includes(kw)) || text.length > 25;
  });
}

/**
 * Generates a concise 3-4 line summary conforming strictly to the required format:
 * Enquiry: [what they wanted]
 * Context: [important traveller/application details]
 * Advice: [what Arjun identified/advised]
 * Next step: [required action / escalation]
 */
export function generateCrmConversationSummary(
  messages: ArjunMessageForSummary[],
  escalationTicket?: string
): string {
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const assistantMessages = messages.filter((m) => m.role === 'assistant').map((m) => m.content);

  const combinedUser = userMessages.join(' ');
  const lastUser = userMessages[userMessages.length - 1] || '';
  const lastAssistant = assistantMessages[assistantMessages.length - 1] || '';

  // 1. Extract Enquiry
  let enquiry = lastUser.slice(0, 110);
  if (/dubai/i.test(combinedUser)) {
    enquiry = 'Enquired about Dubai visa requirements and pricing.';
  } else if (/france/i.test(combinedUser) || /schengen/i.test(combinedUser)) {
    enquiry = 'Enquired about France / Schengen tourist visa requirements and documents.';
  } else if (/status|track/i.test(combinedUser)) {
    enquiry = 'Checked the real-time processing status of visa application.';
  } else if (/refus|reject/i.test(combinedUser)) {
    enquiry = 'Reported prior visa refusal and asked for evaluation on next steps.';
  } else if (lastUser.length > 0) {
    enquiry = 'Partner asked: ' + lastUser.slice(0, 90).replace(/[\n\r]+/g, ' ') + '.';
  }

  // 2. Extract Context (travel dates, passport, applicant type)
  let context = 'Standard Indian passport traveller case.';
  const contextParts: string[] = [];
  if (/urgent|tomorrow|rush/i.test(combinedUser)) contextParts.push('Urgent travel timeline indicated');
  if (/refus/i.test(combinedUser)) contextParts.push('Case involves past refusal letter evaluation');
  if (/business/i.test(combinedUser)) contextParts.push('Business travel purpose');
  if (/touris/i.test(combinedUser)) contextParts.push('Tourism travel purpose');
  if (/child|family/i.test(combinedUser)) contextParts.push('Family travel');
  if (contextParts.length > 0) {
    context = contextParts.join('; ') + '.';
  }

  // 3. Extract Advice given by Arjun
  let advice = 'Arjun provided live catalogue requirements and advised on documentation.';
  if (lastAssistant.includes('checklist') || lastAssistant.includes('Mandatory')) {
    advice = 'Arjun shared verified document checklist and flagged core required papers.';
  } else if (lastAssistant.includes('fee') || lastAssistant.includes('₹') || lastAssistant.includes('Govt')) {
    advice = 'Arjun detailed live fee breakdown (Govt visa fee, V-Visa service fee, GST).';
  } else if (lastAssistant.includes('status') || lastAssistant.includes('Milestone')) {
    advice = 'Arjun confirmed current application milestone and upcoming processing stages.';
  }

  // 4. Extract Next step
  let nextStep = 'Partner reviewing requirements before submitting application in portal.';
  if (escalationTicket) {
    nextStep = 'Ticket #' + escalationTicket + ' logged for V-Visa Operations Desk review.';
  } else if (/refus/i.test(combinedUser)) {
    nextStep = 'Awaiting refusal letter / refusal grounds from partner.';
  } else if (/urgent/i.test(combinedUser)) {
    nextStep = 'Expedited review recommended if flight date is imminent.';
  }

  return [
    'Enquiry: ' + enquiry,
    'Context: ' + context,
    'Advice: ' + advice,
    'Next step: ' + nextStep,
  ].join('\n');
}

/**
 * Pushes the 3-4 line conversation summary to Zoho CRM Notes under the Travel Agent record.
 * Executes safely with audit logging and non-blocking error handling.
 */
export async function pushZohoCrmConversationNote(params: PushCrmNoteParams): Promise<{
  success: boolean;
  noteContent?: string;
  noteId?: string | null;
}> {
  if (!isMeaningfulConversation(params.messages)) {
    return { success: false };
  }

  const summary = generateCrmConversationSummary(params.messages, params.escalationTicket);
  const title = '[Arjun AI] ' + (params.categoryOrDestination || 'Visa Consultation') + ' Summary';

  let noteId: string | null = null;
  let success = false;

  try {
    const travelAgent = await findZohoTravelAgentByEmail(params.partnerEmail);
    if (travelAgent?.zohoRecordId) {
      const module = env.ZOHO_CRM_TRAVEL_AGENTS_MODULE || 'Travel_Agents';
      noteId = await createZohoCrmNote({
        parentModule: module,
        parentId: travelAgent.zohoRecordId,
        title,
        content: summary,
      });
      success = Boolean(noteId);
    }
  } catch (err) {
    console.warn('[ZOHO CRM NOTE] Non-fatal CRM note push warning:', err);
  }

  // Record Audit Log event for observability
  if (params.agencyId) {
    try {
      await auditLog({
        agencyId: params.agencyId,
        actorUserId: params.userId ?? null,
        action: 'ARJUN_CRM_NOTE_CREATED',
        resourceType: 'CrmNote',
        resourceId: noteId || 'local-summary',
        metadata: {
          partnerEmail: params.partnerEmail,
          vvisaUid: params.vvisaUid,
          escalationTicket: params.escalationTicket,
          noteSummary: summary,
        },
      });
    } catch (auditErr) {
      console.warn('[ZOHO CRM NOTE] Audit log warning:', auditErr);
    }
  }

  return { success, noteContent: summary, noteId };
}
