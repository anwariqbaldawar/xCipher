// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

export function hasTelemetryConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("xsypher-cookie-consent") === "accepted";
  } catch {
    return false;
  }
}

export function initSentry(): void {
  const consentGranted = hasTelemetryConsent();
  const isProd = process.env.NODE_ENV === "production";

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://067023f72a5da2a14bab2616a85aaa41@o4512125796876288.ingest.us.sentry.io/4512220592603136",

    integrations: [
      ...(consentGranted
        ? [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })]
        : []),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],

    tracesSampleRate: isProd ? 0.1 : 1.0,
    replaysSessionSampleRate: consentGranted ? 0.05 : 0,
    replaysOnErrorSampleRate: consentGranted ? 0.5 : 0,

    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
  });
}

export function scheduleClientInstrumentation(): void {
  if (typeof window === "undefined") return;

  const win = window as unknown as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };

  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => initSentry(), { timeout: 3000 });
  } else if (typeof document !== "undefined" && document.readyState === "complete") {
    setTimeout(initSentry, 100);
  } else if (typeof win.addEventListener === "function") {
    win.addEventListener(
      "load",
      () => {
        setTimeout(initSentry, 100);
      },
      { once: true },
    );
  } else {
    setTimeout(initSentry, 100);
  }
}

if (typeof window !== "undefined") {
  scheduleClientInstrumentation();
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
