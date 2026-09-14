'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const ENGAGEMENT_THRESHOLD_SECONDS = 15;
const IDLE_TIMEOUT_MS = 10_000; // 10 seconds without interaction counts as idle

export function PartnerEngagementTracker() {
  const pathname = usePathname();
  const activeSecondsRef = useRef(0);
  const isEngagedRef = useRef(false);
  const lastInteractionRef = useRef(Date.now());
  const engagedFiredRef = useRef(false);

  // Send page view on route change
  useEffect(() => {
    if (!pathname) return;
    try {
      fetch('/api/portal/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventType: 'PAGE_VIEW',
          page: pathname,
        }),
      }).catch(() => {});
    } catch {}
  }, [pathname]);

  // 15-Second Genuine Engagement Tracking
  useEffect(() => {
    // Check if already fired in this browser session
    const sessionKey = 'vvisa_15s_engagement_fired';
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      engagedFiredRef.current = true;
    }

    const onUserInteraction = () => {
      lastInteractionRef.current = Date.now();
      isEngagedRef.current = true;
    };

    // User activity listeners
    window.addEventListener('mousemove', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('scroll', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });

    const interval = setInterval(() => {
      // Must be visible and user must have interacted recently
      const isVisible = document.visibilityState === 'visible';
      const isNotIdle = Date.now() - lastInteractionRef.current < IDLE_TIMEOUT_MS;

      if (isVisible && isNotIdle) {
        activeSecondsRef.current += 1;

        if (activeSecondsRef.current >= ENGAGEMENT_THRESHOLD_SECONDS && !engagedFiredRef.current) {
          engagedFiredRef.current = true;
          try {
            sessionStorage.setItem(sessionKey, 'true');
          } catch {}

          // Fire 15-second engagement qualification
          fetch('/api/portal/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              eventType: '15S_ENGAGEMENT_QUALIFIED',
              page: window.location.pathname,
              activeSeconds: activeSecondsRef.current,
            }),
          }).catch(() => {});
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('scroll', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
    };
  }, []);

  return null;
}
