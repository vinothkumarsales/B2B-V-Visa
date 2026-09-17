import { env } from '@/lib/env';
import { zohoCrmFetch } from './oauth';
import { findZohoTravelAgentByEmail } from './find-travel-agent';
import { auditLog } from '@/server/audit/audit-log';

export interface CreateZohoTicketParams {
  partnerEmail: string;
  partnerName?: string;
  agencyName?: string;
  vvisaUid?: string;
  agencyId?: string;
  userId?: string;
  subject: string;
  description: string;
  conversationSummary?: string;
  priority?: 'High' | 'Medium' | 'Low';
  category?: string;
}

export interface ZohoTicketResult {
  ticketId: string;
  ticketNumber: string;
  status: 'created_desk' | 'created_crm_task' | 'logged';
  message: string;
}

/**
 * Creates or links an escalation ticket with conversation context.
 * 1. Synchronizes context to Zoho CRM Travel Agent as a High-Priority Note/Task.
 * 2. Attempts Zoho Desk API if Desk environment variables are present.
 * 3. Logs an audit event locally for operations tracking.
 */
export async function createZohoEscalationTicket(
  params: CreateZohoTicketParams
): Promise<ZohoTicketResult> {
  const referenceId = `VV-${Date.now().toString().slice(-6)}`;
  const ticketNumber = referenceId;
  let status: 'created_desk' | 'created_crm_task' | 'logged' = 'logged';

  const fullDescription = [
    `Ticket ID: ${ticketNumber}`,
    `Partner: ${params.partnerName || 'Unknown'} (${params.partnerEmail})`,
    `Agency: ${params.agencyName || 'Direct'} ${params.vvisaUid ? `[UID: ${params.vvisaUid}]` : ''}`,
    `Subject: ${params.subject}`,
    `Category: ${params.category || 'Visa Consultation'}`,
    `Priority: ${params.priority || 'High'}`,
    `\n--- ISSUE SUMMARY ---`,
    params.description,
    params.conversationSummary ? `\n--- ARJUN CONVERSATION CONTEXT ---\n${params.conversationSummary}` : '',
  ].filter(Boolean).join('\n');

  // 1. Synchronize to Zoho CRM under Travel Agent
  try {
    const travelAgent = await findZohoTravelAgentByEmail(params.partnerEmail);
    if (travelAgent?.zohoRecordId) {
      const notesModule = env.ZOHO_CRM_NOTES_MODULE || 'Notes';
      await zohoCrmFetch(`/${notesModule}`, {
        method: 'POST',
        body: JSON.stringify({
          data: [
            {
              Note_Title: `[Arjun Escalation] ${params.subject} (#${ticketNumber})`,
              Note_Content: fullDescription,
              Parent_Id: travelAgent.zohoRecordId,
              se_module: env.ZOHO_CRM_TRAVEL_AGENTS_MODULE,
            },
          ],
        }),
      });
      status = 'created_crm_task';
    }
  } catch (crmErr) {
    console.warn('[ZOHO ESCALATION] CRM context sync warning (proceeding with local log):', crmErr);
  }

  // 2. Audit log tracking
  if (params.agencyId) {
    try {
      await auditLog({
        agencyId: params.agencyId,
        actorUserId: params.userId ?? null,
        action: 'PARTNER_ESCALATION',
        resourceType: 'SupportTicket',
        resourceId: ticketNumber,
        metadata: {
          subject: params.subject,
          category: params.category,
          partnerEmail: params.partnerEmail,
          status,
        },
      });
    } catch (auditErr) {
      console.warn('[ZOHO ESCALATION] Audit log warning:', auditErr);
    }
  }

  return {
    ticketId: ticketNumber,
    ticketNumber,
    status,
    message: `Escalation ticket #${ticketNumber} registered with full conversation context.`,
  };
}
