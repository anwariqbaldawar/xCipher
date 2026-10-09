// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "https://067023f72a5da2a14bab2616a85aaa41@o4512125796876288.ingest.us.sentry.io/4512220592603136",

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
