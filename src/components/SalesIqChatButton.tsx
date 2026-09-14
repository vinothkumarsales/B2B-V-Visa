'use client';

import { MessageCircle } from 'lucide-react';

declare global {
  interface Window {
    $zoho?: {
      salesiq?: {
        chat?: {
          start?: () => void;
          show?: () => void;
        };
        floatwindow?: {
          visible?: (value: 'show' | 'hide') => void;
        };
      };
    };
  }
}

export function SalesIqChatButton() {
  const openSalesIq = () => {
    const salesiq = window.$zoho?.salesiq;
    salesiq?.floatwindow?.visible?.('show');
    salesiq?.chat?.show?.();
    salesiq?.chat?.start?.();
  };

  return (
    <button
      type="button"
      onClick={openSalesIq}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-vvisa-text-secondary transition-colors hover:bg-vvisa-surface hover:text-foreground"
    >
      <MessageCircle className="size-4 text-primary" />
      <span>
        <span className="block text-[11px] text-vvisa-text-muted">Text with us</span>
        Connect with live support
      </span>
    </button>
  );
}
