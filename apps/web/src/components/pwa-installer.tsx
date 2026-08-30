"use client";

import { useEffect } from "react";

const VAPID_PUBLIC_KEY: string | null = null; // set via /api/v1/push/vapid-key once configured

/**
 * Registers the service worker for offline + push support.
 * Runs once on the client; degrades gracefully in unsupported browsers.
 */
export function PwaInstaller() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // service worker registration failed — non-fatal
    });

    if (
      "Notification" in window &&
      "PushManager" in window &&
      VAPID_PUBLIC_KEY
    ) {
      // Placeholder for push subscription flow — requires a real VAPID key.
      void Notification.requestPermission().catch(() => {});
    }
  }, []);

  return null;
}
