'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Bot,
  User,
  AlertCircle,
  CheckCheck,
  ArrowDown,
  Compass,
  FileText,
  BadgeIndianRupee,
  LifeBuoy,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export interface ArjunCardPreview {
  type: 'visa_product' | 'document_checklist' | 'application_status' | 'escalation_ticket';
  title: string;
  subtitle?: string;
  badge?: string;
  details?: Array<{ label: string; value: string }>;
  ctaText?: string;
  ctaUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  quickReplies?: string[];
  card?: ArjunCardPreview;
}

const PERSISTENT_ACTIONS = [
  { label: 'Explore Visas', icon: Compass, prompt: 'Explore available visa options' },
  { label: 'Check Documents', icon: FileText, prompt: 'What documents are required for' },
  { label: 'Check Price', icon: BadgeIndianRupee, prompt: 'What is the visa fee for' },
  { label: 'Track Application', icon: Clock, prompt: 'Check application status for' },
  { label: 'Visa Rules', icon: ShieldCheck, prompt: 'What are the general visa rules for' },
];

const STARTER_PROMPTS = [
  'What is the all-inclusive price for a Dubai 30-day tourist visa?',
  'Client has an Indian passport and wants to travel to France — what are the document requirements?',
  'Check the status of my latest visa application',
  'Passport expiring in 4 months — can my client apply for a Singapore visa?',
];

export default function ArjunChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const accumulatedContentRef = useRef<string>('');
  const isNearBottomRef = useRef(true);

  // Check whether scroll is near bottom
  const checkScrollPosition = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isNearBottomRef.current = isNearBottom;
    setShowScrollBottom(!isNearBottom);
    if (isNearBottom) {
      setUnreadWhileScrolled(0);
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
      setUnreadWhileScrolled(0);
    }
  }, []);

  // Auto-scroll when messages update, but only if user was already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom('smooth');
    } else if (isStreaming) {
      const frame = requestAnimationFrame(() => {
        setUnreadWhileScrolled((prev) => prev + 1);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [messages, isWaitingForFirstToken, scrollToBottom, isStreaming]);

  // Adjust textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsWaitingForFirstToken(false);
  };

  const handleResetConversation = () => {
    handleStop();
    setMessages([]);
    setError(null);
    setInput('');
    setUnreadWhileScrolled(0);
    setShowScrollBottom(false);
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Initial state: waiting for the first token chunk
    setIsStreaming(true);
    setIsWaitingForFirstToken(true);
    isNearBottomRef.current = true; // Snap to bottom on sending user message
    scrollToBottom('smooth');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const assistantMessageId = `asst-${Date.now()}`;
    accumulatedContentRef.current = '';

    try {
      const response = await fetch('/api/arjun/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errMsg = 'Unable to reach Arjun right now. Please try again.';
        try {
          const data = await response.json();
          if (data?.error?.message) {
            errMsg = data.error.message;
          }
        } catch {
          // Keep generic error message
        }
        throw new Error(errMsg);
      }

      if (!response.body) {
        throw new Error('No response body returned from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            setIsStreaming(false);
            setIsWaitingForFirstToken(false);
            return;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }

              // Handle streaming token chunks
              if (typeof data.chunk === 'string' && data.chunk.length > 0) {
                accumulatedContentRef.current += data.chunk;
                const currentText = accumulatedContentRef.current;
                setIsWaitingForFirstToken(false);

                setMessages((prev) => {
                  const existingIdx = prev.findIndex((m) => m.id === assistantMessageId);
                  if (existingIdx >= 0) {
                    const updated = [...prev];
                    updated[existingIdx] = {
                      ...updated[existingIdx],
                      content: currentText,
                    };
                    return updated;
                  }
                  return [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: 'assistant',
                      content: currentText,
                      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ];
                });
              }

              // Handle metadata events (contextual quick replies & rich card preview)
              if (data.quickReplies || data.card) {
                setMessages((prev) => {
                  const existingIdx = prev.findIndex((m) => m.id === assistantMessageId);
                  if (existingIdx >= 0) {
                    const updated = [...prev];
                    updated[existingIdx] = {
                      ...updated[existingIdx],
                      quickReplies: data.quickReplies || updated[existingIdx].quickReplies,
                      card: data.card || updated[existingIdx].card,
                    };
                    return updated;
                  }
                  return prev;
                });
              }
            } catch (err: unknown) {
              if (err instanceof Error && err.message.includes('Arjun encountered')) {
                throw err;
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      const errorMessage =
        (err as Error)?.message ||
        'Arjun encountered a temporary connection issue. Please try again.';
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
      setIsWaitingForFirstToken(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleRetryLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      const lastUserIdx = messages.lastIndexOf(lastUser);
      setMessages(messages.slice(0, lastUserIdx));
      void sendMessage(lastUser.content);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-5.5rem)] max-w-4xl flex-col space-y-1.5 sm:space-y-2.5 sm:pb-2 w-full">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between rounded-none sm:rounded-2xl border-x-0 sm:border border-y sm:border-y border-vvisa-border-subtle bg-white px-3.5 py-2 sm:px-5 sm:py-2.5 shadow-xs dark:bg-[#111b21]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Bot className="size-4 sm:size-5" />
            <span className="absolute bottom-0 right-0 size-2 sm:size-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#111b21]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm font-semibold text-foreground sm:text-lg truncate">Arjun</h1>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                Senior Visa Consultant
              </Badge>
            </div>
            <p className="text-[10px] sm:text-[11px] text-vvisa-text-muted truncate">
              Live V-Visa Catalogue • Document Rules • Desk Escalation
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetConversation}
            disabled={isStreaming}
            className="h-7 sm:h-8 gap-1 rounded-lg border-vvisa-border px-2 text-xs text-vvisa-text-secondary hover:bg-vvisa-surface hover:text-foreground shrink-0"
          >
            <RotateCcw className="size-3" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        )}
      </div>

      {/* Persistent Quick Action Toolbar */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto px-3 sm:px-0 py-1 no-scrollbar">
        {PERSISTENT_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => void sendMessage(action.prompt)}
              disabled={isStreaming}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-vvisa-border-subtle bg-white px-2.5 sm:px-3 py-1 text-xs font-medium text-vvisa-text-secondary shadow-2xs transition-colors hover:border-primary/40 hover:bg-neutral-50 hover:text-foreground disabled:opacity-50 dark:bg-[#111b21] dark:hover:bg-[#202c33]"
            >
              <Icon className="size-3.5 text-primary" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Conversation Container — WhatsApp Web Style */}
      <Card className="relative flex flex-1 flex-col overflow-hidden rounded-none sm:rounded-2xl border-x-0 sm:border-x border-b-0 sm:border-b border-t border-[#d1d7db] bg-[#efeae2] shadow-xs dark:border-[#2a3942] dark:bg-[#0b141a]">
        <CardContent className="flex flex-1 flex-col justify-between overflow-hidden p-0">
          {/* Scrollable Message List */}
          <div
            ref={chatContainerRef}
            onScroll={checkScrollPosition}
            className="flex-1 overflow-y-auto px-3 py-3.5 sm:px-6 space-y-3"
          >
            {messages.length === 0 ? (
              /* Empty State */
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <div className="mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Sparkles className="size-7" />
                </div>
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                  Hi, I&apos;m Arjun.
                </h2>
                <p className="mt-1.5 max-w-md text-xs sm:text-sm text-vvisa-text-muted leading-relaxed">
                  Your senior visa consultant inside V-Visa. Ask me anything about visa prices, document requirements, or your live applications.
                </p>

                {/* Quick Starter Suggestions */}
                <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2 text-left">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-xl border border-vvisa-border-subtle bg-white/90 p-3 text-xs text-vvisa-text-secondary transition-all hover:border-emerald-500/40 hover:bg-white hover:text-foreground dark:bg-[#111b21] dark:hover:bg-[#202c33] shadow-xs"
                    >
                      <span className="font-medium">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages Area */
              <>
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`flex items-end gap-2 max-w-[92%] sm:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Bubble */}
                        <div
                          className={`relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                            isUser
                              ? 'rounded-lg rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]'
                              : 'rounded-lg rounded-tl-none bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border-none'
                          }`}
                        >
                          {/* Content */}
                          <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.content}</div>

                          {/* Timestamp + WhatsApp Double Checkmarks */}
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isUser ? 'text-[#667781] dark:text-[#8696a0]' : 'text-[#667781] dark:text-[#8696a0]'
                          }`}>
                            <span>{m.createdAt}</span>
                            {isUser && <CheckCheck className="size-3.5 text-[#53bdeb] inline-block" />}
                          </div>
                        </div>
                      </div>

                      {/* Rich Preview Card if returned from verified tools */}
                      {!isUser && m.card && (
                        <div className="mt-2 w-full max-w-[92%] sm:max-w-[80%]">
                          <Card className="overflow-hidden border border-vvisa-border-subtle bg-white shadow-xs dark:bg-[#111b21]">
                            <div className="border-b border-vvisa-border-subtle bg-neutral-50/70 px-3.5 py-2 dark:bg-[#202c33]/50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {m.card.type === 'visa_product' && <Compass className="size-4 text-primary" />}
                                {m.card.type === 'document_checklist' && <FileText className="size-4 text-primary" />}
                                {m.card.type === 'application_status' && <Clock className="size-4 text-primary" />}
                                {m.card.type === 'escalation_ticket' && <LifeBuoy className="size-4 text-emerald-600" />}
                                <span className="text-xs font-semibold text-foreground">{m.card.title}</span>
                              </div>
                              {m.card.badge && (
                                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary">
                                  {m.card.badge}
                                </Badge>
                              )}
                            </div>
                            <div className="p-3 text-xs space-y-2">
                              {m.card.subtitle && (
                                <p className="text-vvisa-text-muted font-medium">{m.card.subtitle}</p>
                              )}
                              {m.card.details && m.card.details.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-vvisa-border-subtle/60">
                                  {m.card.details.map((detail, idx) => (
                                    <div key={idx} className="space-y-0.5">
                                      <span className="text-[10px] text-vvisa-text-muted uppercase font-medium">{detail.label}</span>
                                      <p className="text-xs font-semibold text-foreground truncate">{detail.value}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {m.card.ctaUrl && m.card.ctaText && (
                                <div className="pt-2">
                                  <Link
                                    href={m.card.ctaUrl}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                                  >
                                    <span>{m.card.ctaText}</span>
                                    <ExternalLink className="size-3" />
                                  </Link>
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}

                      {/* Contextual Quick Replies Chips */}
                      {!isUser && m.quickReplies && m.quickReplies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%] sm:max-w-[80%]">
                          {m.quickReplies.map((reply, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => void sendMessage(reply)}
                              disabled={isStreaming}
                              className="rounded-full border border-[#00a884]/40 bg-white px-3.5 py-1 text-xs font-medium text-[#00a884] shadow-xs transition-all hover:bg-[#00a884] hover:text-white disabled:opacity-50 dark:bg-[#202c33] dark:text-[#00a884] dark:hover:bg-[#00a884] dark:hover:text-white"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* "Arjun is typing..." State (before the first token chunk arrives) */}
                {isWaitingForFirstToken && (
                  <div className="flex items-start gap-2">
                    <div className="relative rounded-2xl rounded-tl-none border border-vvisa-border-subtle bg-white px-3.5 py-2.5 text-xs font-medium text-vvisa-text-secondary shadow-xs dark:bg-[#202c33]">
                      <div className="flex items-center gap-1.5">
                        <span>Arjun is typing</span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active streaming cursor indicator */}
                {isStreaming && !isWaitingForFirstToken && (
                  <div className="flex items-center gap-1.5 text-[11px] text-vvisa-text-muted pl-2">
                    <span className="inline-block size-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Arjun is writing...</span>
                  </div>
                )}
              </>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryLast}
                  className="h-7 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Scroll to Bottom Button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-[#111b21] shadow-md border border-[#d1d7db] hover:bg-neutral-50 transition-transform active:scale-95 dark:bg-[#202c33] dark:border-[#2a3942] dark:text-[#e9edef]"
            >
              <ArrowDown className="size-3.5" />
              <span>Scroll to latest</span>
              {unreadWhileScrolled > 0 && (
                <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {unreadWhileScrolled}
                </span>
              )}
            </button>
          )}

          {/* Composer Box */}
          <div className="relative z-10 border-t border-[#d1d7db] bg-[#f0f2f5] p-2 sm:p-3 dark:border-[#2a3942] dark:bg-[#202c33]">
            <div className="relative flex items-end gap-2 rounded-xl bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xs dark:bg-[#2a3942]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? 'Arjun is responding...' : 'Message Arjun about visa rules, fees, status, or cases...'}
                disabled={isStreaming}
                rows={1}
                className="max-h-32 sm:max-h-36 flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-vvisa-text-muted focus:outline-none disabled:opacity-60 py-1"
              />

              {isStreaming ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleStop}
                  className="size-8 sm:size-9 shrink-0 rounded-full p-0 shadow-sm flex items-center justify-center"
                  aria-label="Stop generating"
                >
                  <Square className="size-3 sm:size-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim()}
                  className="size-8 sm:size-9 shrink-0 rounded-full p-0 shadow-xs bg-[#00a884] hover:bg-[#008f6f] text-white disabled:opacity-40 transition-colors flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send className="size-3.5" />
                </Button>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between px-1 text-[10px] sm:text-[11px] text-vvisa-text-muted">
              <span>Press <kbd className="rounded border border-vvisa-border px-1 py-0.2 text-[9px] sm:text-[10px]">Enter</kbd> to send, <kbd className="rounded border border-vvisa-border px-1 py-0.2 text-[9px] sm:text-[10px]">Shift+Enter</kbd> for newline</span>
              <span className="hidden sm:inline">Powered by Hermes AI</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
