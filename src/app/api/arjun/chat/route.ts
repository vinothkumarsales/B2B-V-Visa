import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { streamArjunResponse, ArjunMessage } from '@/server/hermes/arjun-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: NextRequest) {
  // 1. Authenticate session
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required to consult Arjun.' } },
      { status: 401 }
    );
  }

  // 2. Validate request body
  let body: { messages?: ArjunMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON payload.' } },
      { status: 400 }
    );
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: 'Messages array is required.' } },
      { status: 400 }
    );
  }

  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: `Conversation history exceeds maximum of ${MAX_MESSAGES} turns.` } },
      { status: 400 }
    );
  }

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: `Message at index ${i} has invalid role.` } },
        { status: 400 }
      );
    }
    if (typeof m.content !== 'string' || m.content.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: `Message at index ${i} has empty content.` } },
        { status: 400 }
      );
    }
    if (m.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: `Message at index ${i} exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.` } },
        { status: 400 }
      );
    }
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: 'Last message must be from user.' } },
      { status: 400 }
    );
  }

  // 3. User context derived strictly from authenticated session
  const userContext = {
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    userEmail: session.user.email ?? undefined,
    agencyId: session.activeMembership?.agencyId ?? session.activeMembership?.agency?.id ?? undefined,
    agencyName: session.activeMembership?.agency?.name ?? undefined,
    agencyUid: session.activeMembership?.agency?.vvisaUid ?? undefined,
  };

  // 4. Stream response via Server-Sent Events (SSE)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamArjunResponse({
          messages,
          userContext,
          signal: req.signal,
        })) {
          if (event.type === 'chunk' && event.content) {
            const ssePayload = `data: ${JSON.stringify({ chunk: event.content })}\n\n`;
            controller.enqueue(encoder.encode(ssePayload));
          } else if (event.type === 'metadata') {
            const ssePayload = `data: ${JSON.stringify({
              quickReplies: event.quickReplies,
              card: event.card,
            })}\n\n`;
            controller.enqueue(encoder.encode(ssePayload));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: unknown) {
        const error = err as Error;
        console.error('[ARJUN API] Streaming error:', error.message);
        // Avoid leaking provider errors, API keys, or raw stack traces to the client
        const safeErrorPayload = `data: ${JSON.stringify({
          error: 'Arjun encountered a temporary connection issue. Please try again in a moment.'
        })}\n\n`;
        controller.enqueue(encoder.encode(safeErrorPayload));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
