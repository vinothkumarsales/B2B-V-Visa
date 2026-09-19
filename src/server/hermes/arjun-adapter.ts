import { streamHermesCompletion } from './hermes-inference-boundary';
import {
  searchVisaCatalogue,
  getVisaDocumentRequirements,
  getVisaPricingDetails,
  lookupApplicationStatus,
} from './arjun-tools';
import { createZohoEscalationTicket } from '../integrations/zoho/desk';
import { pushZohoCrmConversationNote } from '../integrations/zoho/crm-notes';

export interface ArjunMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ArjunCardPreview {
  type: 'visa_product' | 'document_checklist' | 'application_status' | 'escalation_ticket';
  title: string;
  subtitle?: string;
  badge?: string;
  details?: Array<{ label: string; value: string }>;
  ctaText?: string;
  ctaUrl?: string;
}

export type ArjunStreamEvent =
  | { type: 'chunk'; content: string }
  | { type: 'metadata'; quickReplies: string[]; card?: ArjunCardPreview };

export interface ArjunChatOptions {
  messages: ArjunMessage[];
  userContext?: {
    userId?: string;
    userName?: string;
    userEmail?: string;
    agencyId?: string;
    agencyName?: string;
    agencyUid?: string;
  };
  signal?: AbortSignal;
}

/**
 * Arjun System Behavior & Personality Configuration across 9 Specific Operational Intents.
 */
export const ARJUN_SYSTEM_PROMPT = `You are Arjun, the Senior AI Visa Consultant inside the V-Visa B2B portal.
You communicate like a seasoned visa and immigration consultant with 10+ years of practical, hands-on experience advising travel agents, immigration desks, and V-Visa partners.

You are NOT a restrictive chatbot or an FAQ redirector.
You are NOT a bureaucrat who deflects to embassy websites.
You are a knowledgeable, authoritative, and approachable Senior Visa Consultant who genuinely knows the rules, processes, and practical realities of visa applications worldwide.

Your goal is to make every travel agent feel: "Okay, Arjun really knows his stuff and gives me clear, actionable guidance."

YOUR DEEP VISA & IMMIGRATION EXPERTISE:
1. AUSTRALIA PR & SKILLED MIGRATION:
   - Subclass 189 (Skilled Independent): Points-tested permanent visa for occupations on the Medium and Long-term Strategic Skills List (MLTSSL). No sponsorship required.
   - Subclass 190 (Skilled Nominated): Permanent visa requiring nomination by an Australian State or Territory government (+5 points on points test).
   - Subclass 491 (Skilled Work Regional Provisional): 5-year provisional visa requiring regional state nomination or eligible family sponsorship (+15 points). Leads to Subclass 191 PR after 3 years.
   - Points Test Factors: Age (max 30 pts for 25-32), English (Competent: 0, Proficient 7+ IELTS/65+ PTE: 10 pts, Superior 8+ IELTS/79+ PTE: 20 pts), Education (PhD: 20, Bachelor/Master: 15, Trade/Diploma: 10), Overseas/Australian Work Experience, NAATI CCL credential (5 pts), Partner points (up to 10 pts). Minimum passing score is 65 points, though competitive cutoffs for 189 are typically 85-95+.
   - Process Flow: Skills Assessment (ACS for IT, VETASSESS for general occupations, Engineers Australia for engineers, CPA/CA for accountants) → English Test (PTE/IELTS) → Expression of Interest (EOI) in SkillSelect → State Nomination (for 190/491) → Invitation to Apply (ITA) → Visa Lodgement with Department of Home Affairs (DHA).

2. UK VISAS:
   - Standard Visitor Visa (6 months, 2-year, 5-year, 10-year): Tourist, business meetings, family visit.
   - Core Requirements: Valid passport (>6 months), 6 months bank statements with consistent average balance (flag and explain any sudden large deposits), 3 years ITRs with computation, 3-6 months salary slips, employer NOC / leave approval letter, day-by-day travel itinerary, flight/hotel bookings, cover letter explaining purpose and strong ties to India.
   - Common Refusal Grounds (Paragraph V 4.2 of Appendix V): Lack of genuine intention to return, unexplained cash deposits into bank accounts, discrepancies between declared income and bank balances, weak family/employment ties in India. Always advise explaining every deposit and maintaining funds steadily.

3. SCHENGEN VISAS (France, Germany, Switzerland, Italy, Spain, etc.):
   - Main Destination Rule: Apply to the country where the applicant spends the maximum nights. If equal nights, apply to the first country of entry.
   - 90/180-Day Rule: Maximum stay of 90 days in any rolling 180-day window.
   - Standard Checklist: Passport valid >3 months past intended departure with 2 blank pages, completed application form, 2 biometric photos (35x45mm, 80% face coverage, white background), travel medical insurance (€30,000 coverage valid across all Schengen states with repatriation), confirmed round-trip flight reservation, confirmed hotel bookings for all nights, 3-6 months bank statements (original stamped or bank seal), 3 years ITRs, leave approval letter / NOC on company letterhead.
   - Refusal Grounds: Clause 2 (justification for the purpose and conditions of the intended stay was not provided) and Clause 10 (reasonable doubts as to intention to leave the territory of Member States before visa expiry). Remind agents that a detailed day-by-day itinerary and proof of employment/ties in India are vital.

4. CANADA IMMIGRATION & VISAS:
   - Express Entry: Federal Skilled Worker (FSW), Canadian Experience Class (CEC), Federal Skilled Trades (FST). Comprehensive Ranking System (CRS) score based on age, education (ECA from WES), language (IELTS General / CELPIP), and work experience.
   - Provincial Nominee Programs (PNP): Express Entry-aligned streams (Ontario OINP, British Columbia BCPNP, Alberta AAIP, Saskatchewan SINP) granting +600 CRS points upon nomination.
   - Temporary Resident Visa (TRV / Visitor Visa): Proof of funds, strong ties to India (property, job, family), detailed invitation letter (if visiting family/friends), itinerary.

5. US VISAS (B1/B2 Tourist & Business):
   - DS-160 confirmation, MRV fee receipt, interview appointment letter.
   - Overcoming INA Section 214(b): By US law, all applicants are presumed to have immigrant intent until they establish strong, binding socio-economic ties to their home country (stable career, family roots, property/investments). Advise agents to prepare their clients to speak confidently, clearly, and concisely about their specific trip purpose and return obligations.

6. REFUSAL MITIGATION STRATEGY:
   - Always analyze the exact refusal notice and clauses.
   - Never simply re-apply with the exact same paperwork.
   - Directly refute each cited ground with fresh, verifiable evidence (e.g., CA statement + property valuation for ties; detailed source of funds letter + bank manager certificate for financial queries; revised clear itinerary).

CRITICAL DISTINCTION: GENERAL KNOWLEDGE vs LIVE PORTAL TRACKING:
- General Visa Knowledge, Checklists, Pathways, Rules, & Refusal Advice:
  ALWAYS answer thoroughly, authoritatively, and practically! Provide the actual steps, document lists, and professional advice. NEVER say "I don't have that info connected" or "Please visit the official website" for general visa knowledge.
- Live Portal Data / Specific Application Tracking:
  Only when an agent asks about a specific application ID (e.g. #VV-1234), tracking number, or their live wallet balance — if live lookup in the system returns no record, state honestly:
  "I don't see an active application record for [ID] in your portal right now. Double check the ID or tracking number, or check the Applications tab."

CONSULTING METHODOLOGY:
1. Deliver the core answer / checklist / pathway clearly with well-structured bullet points.
2. Follow up with ONE dynamic, profile-focused question to evaluate the specific applicant's case.
   - For PR: Ask about the applicant's occupation and estimated points score.
   - For Visitor/Tourist: Ask about the applicant's employment profile (salaried vs self-employed) or travel timeline.
   - For Refusals: Ask which specific clause was checked on the refusal letter.
3. Be conversational, energetic, and professional:
   - "Yep, got it 👍"
   - "Sure, let's break down the requirements."
   - "One thing I'd check first on this profile..."
   - "That's a very common question — here's exactly how it works."

ESCALATION & HUMAN DESK POLICY:
- "Talk to human" is strictly a LAST RESORT.
- Never suggest human escalation for general inquiries, checklists, or standard visa rules.
- Only escalate if:
  * The enquiry involves an active portal payment discrepancy, passport emergency / loss, or active rejected visa case needing manual filing by the operations team.
  * The agent explicitly asks: "Connect me to a person" or "Talk to human".
- When escalation is triggered, confirm with:
  "Done. I've passed the details along to our operations desk with the full chat context so you won't need to explain everything again."

FORBIDDEN ROBOTIC AI PHRASES:
- Never say: "As an AI language model...", "I apologize for any inconvenience...", "I don't have access to visa information...", "Please visit the embassy website for more info.", "I'd be happy to assist you with...", "Kindly provide...", "Rest assured."
- Communicate like a senior visa specialist chatting with a B2B partner on WhatsApp: sharp, warm, knowledgeable, and reliable.`;

/**
 * Sanitizes the opening chunk/sentence of a response to eliminate robotic AI openings.
 */
export function sanitizeLeadIn(text: string): string {
  let cleaned = text;

  const replacements: Array<[RegExp, string]> = [
    [/^Certainly[!.,]?\s*/i, 'Sure. '],
    [/^Certainly,\s*/i, 'Sure, '],
    [/^Absolutely[!.,]?\s*/i, 'Yep! '],
    [/^As an AI (language )?model,?\s*/i, ''],
    [/^Based on the information provided,?\s*/i, ''],
    [/^I('d| would) be happy to (assist|help) you( with that)?[.!:]?\s*/i, 'Yep, I can help with that. '],
    [/^Thank you for reaching out[!.,]?\s*/i, ''],
    [/^I understand your concern[.!:]?\s*/i, "Yeah, I get why you're checking this. "],
    [/^Here is the information you requested:?\s*/i, ''],
    [/^Rest assured,?\s*/i, ''],
    [/^At your earliest convenience,?\s*/i, ''],
    [/^Kindly provide\s*/i, 'Could you share '],
    [/^Could you please elaborate\??\s*/i, 'Could you tell me a bit more about that? '],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, replacement);
    }
  }

  // Strip leading standalone markdown headers like "### Requirements\n" or "## Overview\n"
  cleaned = cleaned.replace(/^#{1,4}\s+[^\n]+\n+/g, '');

  return cleaned;
}

/**
 * Sanitizes the tail of a response to remove formulaic robotic sign-offs.
 */
export function sanitizeTrailing(text: string): string {
  let cleaned = text;
  const trailingBoilerplates = [
    /\s*(?:I hope this helps!?\s*)?(?:Feel free to (?:ask|reach out) if you (?:have|need) (?:any )?(?:further |more )?questions!?\.?)\s*$/i,
    /\s*(?:Please )?(?:don't hesitate|do not hesitate) to ask if you (?:have|need) (?:any )?more (?:help|questions)!?\.?\s*$/i,
    /\s*Let me know if you (?:have|need) (?:any )?(?:further |other )?questions!?\.?\s*$/i,
    /\s*Have a great day!?\.?\s*$/i,
  ];

  for (const pattern of trailingBoilerplates) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trimEnd();
}

/**
 * Response-Style Layer stream transformer.
 */
export async function* applyArjunStyleLayer(
  stream: AsyncGenerator<string, void, unknown>
): AsyncGenerator<string, void, unknown> {
  let buffer = '';
  let isLeadInProcessed = false;
  const LEAD_IN_BUFFER_SIZE = 100;
  const TRAILING_BUFFER_SIZE = 70;

  for await (const rawChunk of stream) {
    buffer += rawChunk;

    if (!isLeadInProcessed) {
      if (buffer.length >= LEAD_IN_BUFFER_SIZE || buffer.includes('\n') || /[.!?]/.test(buffer)) {
        buffer = sanitizeLeadIn(buffer);
        isLeadInProcessed = true;
      }
    }

    if (isLeadInProcessed && buffer.length > TRAILING_BUFFER_SIZE) {
      const emitLength = buffer.length - TRAILING_BUFFER_SIZE;
      const toEmit = buffer.slice(0, emitLength);
      buffer = buffer.slice(emitLength);
      yield toEmit;
    }
  }

  if (!isLeadInProcessed) {
    buffer = sanitizeLeadIn(buffer);
  }
  buffer = sanitizeTrailing(buffer);

  if (buffer.length > 0) {
    yield buffer;
  }
}

/**
 * Resolves context, queries read-only database tools, handles Zoho escalation,
 * and formats verified facts for Arjun.
 */
export interface ToolContextData {
  isDoc?: boolean;
  isPrice?: boolean;
  isStatus?: boolean;
  isHighImportance?: boolean;
  destination?: string;
  ticketNumber?: string;
}

/**
 * Resolves context, queries read-only database tools, handles Zoho escalation,
 * and formats verified facts for Arjun.
 */
export async function resolveContextAndTools(
  messages: ArjunMessage[],
  userContext?: ArjunChatOptions['userContext']
): Promise<{
  factsSummary: string;
  card?: ArjunCardPreview;
  toolContext: ToolContextData;
}> {
  const fullText = messages.map((m) => m.content).join(' ').toLowerCase();
  const lastUserText = messages[messages.length - 1]?.content.toLowerCase() || '';

  // 1. Explicit Human Escalation Intent vs Confirmation
  const explicitEscalationKeywords = [
    'talk to human', 'let me talk to someone', 'connect me to a person',
    'need a human', 'speak to a human', 'human agent', 'raise a ticket',
    'support ticket', 'support desk', 'urgent help', 'talk to someone',
    'connect me to support', 'escalate this'
  ];
  const isExplicitEscalation = explicitEscalationKeywords.some((kw) => lastUserText.includes(kw));

  // Check if partner is confirming a previous offer to escalate
  const prevAssistantMessage = messages.length >= 2 ? messages[messages.length - 2] : null;
  const isConfirmingEscalation = Boolean(
    prevAssistantMessage?.role === 'assistant' &&
    /want me to send this to our team|better handled by the team|look at the actual case/i.test(prevAssistantMessage.content) &&
    /^(yes|please|connect me|send it|sure|okay|proceed|do it|yeah)/i.test(lastUserText.trim())
  );

  if (isExplicitEscalation || isConfirmingEscalation) {
    const summary = messages.slice(-4).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const ticketResult = await createZohoEscalationTicket({
      partnerEmail: userContext?.userEmail || 'partner@vvisa.in',
      partnerName: userContext?.userName,
      agencyName: userContext?.agencyName,
      vvisaUid: userContext?.agencyUid,
      agencyId: userContext?.agencyId,
      userId: userContext?.userId,
      subject: `Partner Assistance Request: ${lastUserText.slice(0, 60)}...`,
      description: lastUserText,
      conversationSummary: summary,
      priority: 'High',
    });

    return {
      factsSummary: `--- VERIFIED ACTION: TICKET LOGGED ---
Ticket Reference: #${ticketResult.ticketNumber}
Status: Successfully logged and linked to partner record.
Instructions: Tell the partner directly: "Done. I've passed the details along to our team (Ticket #${ticketResult.ticketNumber}) with the full chat context so you won't need to explain everything again."`,
      card: {
        type: 'escalation_ticket',
        title: `Ticket #${ticketResult.ticketNumber}`,
        subtitle: 'Escalated to V-Visa Operations Desk',
        badge: 'High Priority',
        details: [
          { label: 'Agency', value: userContext?.agencyName || 'Direct Partner' },
          { label: 'Status', value: 'Queued for human review' },
          { label: 'Context', value: 'Full chat transcript attached' },
        ],
        ctaText: 'Back to Dashboard',
        ctaUrl: '/dashboard',
      },
      toolContext: {
        ticketNumber: ticketResult.ticketNumber,
      },
    };
  }

  // 2. High-importance situation detection (visa refusal, flight tomorrow, payment issue)
  // We do NOT immediately create a ticket. Arjun advises first and offers human review naturally.
  const isHighImportance = [
    'refus', 'reject', 'flight tomorrow', 'flight is tomorrow',
    'payment fail', 'money debited', 'stuck in review', 'passport damaged'
  ].some((kw) => lastUserText.includes(kw));

  // 3. Application Status Intent
  const statusKeywords = ['status', 'track', 'application', 'where is my', 'submission'];
  const isStatus = statusKeywords.some((kw) => lastUserText.includes(kw));

  if (isStatus && userContext?.agencyId) {
    const words = lastUserText.split(/\s+/);
    const candidateId = words.find((w) => w.length >= 4 && !['what', 'where', 'status', 'check', 'the', 'my'].includes(w));

    const appStatus = await lookupApplicationStatus({
      identifier: candidateId,
      agencyId: userContext.agencyId,
    });

    if (appStatus) {
      return {
        factsSummary: `--- VERIFIED DATABASE RECORD: APPLICATION STATUS ---
Application ID: ${appStatus.internalId || appStatus.applicationId}
Destination: ${appStatus.destination} (${appStatus.visaType})
Status: ${appStatus.statusLabel} (${appStatus.statusCode})
Progress: ${appStatus.progressPercent}%
Submitted: ${appStatus.submittedAt || 'Recent'}
Applicants: ${appStatus.applicants.join(', ') || '1 traveller'}
${appStatus.statusDescription ? `Milestone: ${appStatus.statusDescription}` : ''}`,
        card: {
          type: 'application_status',
          title: `${appStatus.destination} Visa Application`,
          subtitle: appStatus.internalId || appStatus.applicationId,
          badge: appStatus.statusLabel,
          details: [
            { label: 'Status', value: appStatus.statusLabel },
            { label: 'Progress', value: `${appStatus.progressPercent}%` },
            { label: 'Applicants', value: appStatus.applicants.join(', ') || '1 traveller' },
          ],
          ctaText: 'View in Applications',
          ctaUrl: `/${userContext?.agencyUid || ''}/applications`,
        },
        toolContext: {
          isStatus: true,
          destination: appStatus.destination,
        },
      };
    }
  }

  // 4. Country / Destination Detection for Catalogue, Documents, and Pricing
  const commonDestinations = [
    'dubai', 'uae', 'france', 'united kingdom', 'uk', 'singapore', 'germany',
    'italy', 'spain', 'switzerland', 'australia', 'united states', 'usa',
    'japan', 'thailand', 'malaysia', 'indonesia', 'vietnam', 'schengen', 'canada',
  ];

  const matchedDestination = commonDestinations.find((d) => fullText.includes(d));

  if (matchedDestination) {
    const isDocEnquiry = ['document', 'documents', 'checklist', 'passport', 'photo', 'bank'].some((kw) => lastUserText.includes(kw));
    const isPriceEnquiry = ['price', 'pricing', 'fee', 'cost', 'how much', 'rate', 'charge'].some((kw) => lastUserText.includes(kw));

    // A. Document Enquiry
    if (isDocEnquiry) {
      const docResult = await getVisaDocumentRequirements(matchedDestination);
      if (docResult && docResult.documents.length > 0) {
        const mandatory = docResult.documents.filter((d) => d.isMandatory).map((d) => d.documentName).join(', ');
        const optional = docResult.documents.filter((d) => d.isOptional).map((d) => d.documentName).join(', ');

        return {
          factsSummary: `--- VERIFIED V-VISA DATABASE: DOCUMENT REQUIREMENTS ---
Product: ${docResult.productName} (${docResult.destination})
Mandatory Documents: ${mandatory || 'Passport scan, photograph'}
${optional ? `Optional/Supporting: ${optional}` : ''}
Note: Confirmed from real V-Visa catalogue requirements.`,
          card: {
            type: 'document_checklist',
            title: `${docResult.destination} Document Requirements`,
            subtitle: docResult.productName,
            badge: `${docResult.documents.filter((d) => d.isMandatory).length} Mandatory`,
            details: docResult.documents.slice(0, 3).map((d) => ({
              label: d.documentName,
              value: d.isMandatory ? 'Mandatory' : 'Optional',
            })),
            ctaText: 'View in Explore',
            ctaUrl: '/explore',
          },
          toolContext: {
            isDoc: true,
            destination: docResult.destination,
          },
        };
      }
    }

    // B. Pricing Enquiry
    if (isPriceEnquiry) {
      const priceResult = await getVisaPricingDetails(matchedDestination);
      if (priceResult) {
        return {
          factsSummary: `--- VERIFIED V-VISA DATABASE: PRICING BREAKDOWN ---
Product: ${priceResult.productName} (${priceResult.destination})
Total Cost: ₹${priceResult.totalAmountInr.toLocaleString('en-IN')} ${priceResult.currency}
Breakdown: Govt Visa Fee ₹${priceResult.visaFeeInr.toLocaleString('en-IN')}, V-Visa Service Fee ₹${priceResult.vvisaServiceFeeInr.toLocaleString('en-IN')}, GST ₹${priceResult.gstInr.toLocaleString('en-IN')}.
Note: Confirmed from real active V-Visa price lines.`,
          card: {
            type: 'visa_product',
            title: `${priceResult.destination} Visa`,
            subtitle: priceResult.productName,
            badge: `₹${priceResult.totalAmountInr.toLocaleString('en-IN')}`,
            details: [
              { label: 'Govt Fee', value: `₹${priceResult.visaFeeInr.toLocaleString('en-IN')}` },
              { label: 'Service Fee', value: `₹${priceResult.vvisaServiceFeeInr.toLocaleString('en-IN')}` },
              { label: 'GST', value: `₹${priceResult.gstInr.toLocaleString('en-IN')}` },
            ],
            ctaText: 'Apply in Explore',
            ctaUrl: '/explore',
          },
          toolContext: {
            isPrice: true,
            destination: priceResult.destination,
          },
        };
      }
    }

    // C. General Catalogue Query for Destination
    const products = await searchVisaCatalogue({ destination: matchedDestination, limit: 3 });
    if (products.length > 0) {
      const p = products[0];
      return {
        factsSummary: `--- VERIFIED V-VISA DATABASE: PRODUCT CATALOGUE ---
Destination: ${p.destination}
Primary Product: ${p.name}
Validity: ${p.validity}, Stay: ${p.duration}, Entry: ${p.entry}
Processing Time: ${p.processingTime}
All-inclusive Price: ₹${p.amountInr.toLocaleString('en-IN')}
${p.shortDescription ? `Summary: ${p.shortDescription}` : ''}`,
        card: {
          type: 'visa_product',
          title: `${p.destination} - ${p.name}`,
          subtitle: `${p.validity} Validity • ${p.duration} Stay`,
          badge: `₹${p.amountInr.toLocaleString('en-IN')}`,
          details: [
            { label: 'Entry Type', value: p.entry },
            { label: 'Processing', value: p.processingTime },
            { label: 'Category', value: p.category },
          ],
          ctaText: 'View in Explore',
          ctaUrl: '/explore',
        },
        toolContext: {
          destination: p.destination,
        },
      };
    }
  }

  return {
    factsSummary: isHighImportance ? '--- SENSITIVE / HIGH IMPORTANCE SITUATION ---\nHandle with calm, practical empathy. Advise first and offer human desk handoff if complex.' : '',
    toolContext: {
      isHighImportance,
    },
  };
}

/**
 * Derives contextual quick replies dynamically based on Arjun's actual response,
 * the user's latest query, and tool context.
 * "Talk to human desk" is strictly excluded unless human escalation was specifically offered.
 */
export function deriveContextualQuickReplies(
  accumulatedResponse: string,
  lastUserText: string,
  messages: ArjunMessage[],
  toolContext?: ToolContextData
): string[] {
  const respLower = (accumulatedResponse || '').toLowerCase();
  const userLower = (lastUserText || '').toLowerCase();

  // 1. Ticket was created
  if (toolContext?.ticketNumber || /#vv-\d+/i.test(accumulatedResponse)) {
    return ['Continue visa consultation', 'Back to dashboard'];
  }

  // 2. Arjun offered human escalation ("want me to send this to our team", "better handled by the team", "look at the actual case")
  if (
    respLower.includes('want me to send this to our team') ||
    respLower.includes('want me to send the conversation') ||
    respLower.includes('better handled by the team') ||
    respLower.includes('look at the actual case') ||
    respLower.includes('send this to the team')
  ) {
    return ['Yes, connect me to team', "No, let's continue here"];
  }

  // 3. Arjun asks about trip type / purpose
  // e.g. "What type of trip is it?", "tourism, business, or something else", "main purpose"
  if (
    respLower.includes('tourism, business') ||
    respLower.includes('type of trip') ||
    respLower.includes('main purpose') ||
    respLower.includes('purpose of travel') ||
    respLower.includes('purpose of the visit')
  ) {
    // If Schengen was mentioned
    if (respLower.includes('schengen') || userLower.includes('schengen')) {
      return ['Tourism', 'Business', 'France', 'Germany', 'Switzerland'];
    }
    return ['Tourism', 'Business', 'Study', 'Visiting Family'];
  }

  // 4. Arjun asks which Schengen country
  if (respLower.includes('which schengen country') || respLower.includes('schengen country') || respLower.includes('which schengen')) {
    return ['France', 'Germany', 'Switzerland', 'Italy', 'Spain'];
  }

  // 5. Arjun asks which country / destination in general
  if (
    respLower.includes('which country') ||
    respLower.includes('which destination') ||
    respLower.includes('where are they travelling') ||
    respLower.includes('where is the client going')
  ) {
    return ['Dubai / UAE', 'France', 'United Kingdom', 'Singapore', 'Switzerland'];
  }

  // 6. Arjun asks about travel dates / timeline
  if (
    respLower.includes('when is the client planning') ||
    respLower.includes('when are they travelling') ||
    respLower.includes('travel date') ||
    respLower.includes('travel dates') ||
    respLower.includes('roughly when') ||
    respLower.includes('planning to fly')
  ) {
    return ['Next 2 weeks', 'Next month', 'In 2–3 months', 'Dates not fixed yet'];
  }

  // 7. Arjun asks about applicant profile / passport / employment
  if (
    respLower.includes('employed or self-employed') ||
    respLower.includes('passport validity') ||
    respLower.includes('nationality') ||
    respLower.includes('applicant')
  ) {
    return ['Employed with ITR', 'Self-employed / Business', 'Valid for > 6 months'];
  }

  // 8. Visa refusal discussion
  if (userLower.includes('refus') || respLower.includes('refusal letter')) {
    return ['Refusal was Schengen', 'Refusal was UK', 'Have refusal letter ready'];
  }

  // 9. Document checklist just explained
  if (
    toolContext?.isDoc ||
    respLower.includes('standard checklist') ||
    respLower.includes('mandatory documents') ||
    respLower.includes('document checklist')
  ) {
    const dest = toolContext?.destination ? ` for ${toolContext.destination}` : '';
    return [`Check visa fees${dest}`, 'Check processing time', 'Check another country'];
  }

  // 10. Pricing just explained
  if (
    toolContext?.isPrice ||
    respLower.includes('all-inclusive price') ||
    respLower.includes('service fee') ||
    respLower.includes('govt visa fee')
  ) {
    const dest = toolContext?.destination ? ` for ${toolContext.destination}` : '';
    return [`Check documents${dest}`, 'How to apply in portal', 'Check another visa'];
  }

  // 11. Application status just explained
  if (toolContext?.isStatus || respLower.includes('milestone') || respLower.includes('progress:')) {
    return ['Check required documents', 'Track another application', 'View in applications'];
  }

  // 12. Specific destination query (e.g. user asked about Dubai or Singapore)
  if (toolContext?.destination) {
    return [
      `Check documents for ${toolContext.destination}`,
      `Check price breakdown for ${toolContext.destination}`,
      'Check processing time',
    ];
  }

  // 13. Clean Contextual Fallback (NEVER includes "Talk to human desk")
  return [
    'Check visa requirements',
    'Check visa fees',
    'Check required documents',
  ];
}

/**
 * Main stream generator: runs tool lookup, injects verified context,
 * streams inference through Hermes, applies the style layer, derives contextual quick replies,
 * and emits metadata events while asynchronously saving CRM summaries.
 */
export async function* streamArjunResponse(options: ArjunChatOptions): AsyncGenerator<ArjunStreamEvent, void, unknown> {
  const sanitizedMessages = (options.messages || [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content.trim(),
    }));

  if (sanitizedMessages.length === 0) {
    throw new Error('At least one user message is required.');
  }

  // 1. Tool Resolution & Verified Context Lookup
  const { factsSummary, card, toolContext } = await resolveContextAndTools(
    sanitizedMessages,
    options.userContext
  );

  let systemPrompt = ARJUN_SYSTEM_PROMPT;

  if (options.userContext?.agencyName || options.userContext?.userName) {
    const partnerName = options.userContext.userName || 'Partner';
    const agency = options.userContext.agencyName ? ` at ${options.userContext.agencyName}` : '';
    systemPrompt += `\n\nYou are currently speaking with ${partnerName}${agency}.`;
  }

  if (factsSummary) {
    systemPrompt += `\n\n${factsSummary}\n\nUse these confirmed facts naturally in your response. Never invent facts beyond this.`;
  }

  const hermesPayload = [
    { role: 'system' as const, content: systemPrompt },
    ...sanitizedMessages,
  ];

  // 2. Upstream LLM Stream
  const rawStream = streamHermesCompletion({
    messages: hermesPayload,
    temperature: 0.35,
    maxTokens: 1200,
    signal: options.signal,
  });

  // 3. Apply Human Response-Style Layer & Accumulate Output
  let accumulatedResponse = '';
  for await (const chunk of applyArjunStyleLayer(rawStream)) {
    if (chunk) {
      accumulatedResponse += chunk;
      yield { type: 'chunk', content: chunk };
    }
  }

  // 4. Derive Dynamic Contextual Quick Replies Based on Actual Query & Generated Response
  const lastUserText = sanitizedMessages[sanitizedMessages.length - 1]?.content || '';
  const quickReplies = deriveContextualQuickReplies(
    accumulatedResponse,
    lastUserText,
    sanitizedMessages,
    toolContext
  );

  // 5. Emit Contextual Quick Replies & Card Preview
  yield {
    type: 'metadata',
    quickReplies,
    card,
  };

  // 6. Asynchronously Push 3-4 Line CRM Conversation Summary to Zoho CRM
  if (options.userContext?.userEmail) {
    pushZohoCrmConversationNote({
      partnerEmail: options.userContext.userEmail,
      partnerName: options.userContext.userName,
      agencyName: options.userContext.agencyName,
      agencyId: options.userContext.agencyId,
      userId: options.userContext.userId,
      vvisaUid: options.userContext.agencyUid,
      messages: [
        ...sanitizedMessages,
        { role: 'assistant', content: accumulatedResponse },
      ],
      escalationTicket: toolContext.ticketNumber,
      categoryOrDestination: toolContext.destination,
    }).catch((err) => {
      console.warn('[ARJUN] CRM note sync non-fatal warning:', err);
    });
  }
}
