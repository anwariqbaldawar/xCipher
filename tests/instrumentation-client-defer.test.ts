import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import {
  hasTelemetryConsent,
  initSentry,
  scheduleClientInstrumentation,
} from "@/instrumentation-client";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: "Replay" })),
  consoleLoggingIntegration: vi.fn(() => ({ name: "ConsoleLogging" })),
  captureRouterTransitionStart: vi.fn(),
}));

describe("client instrumentation deferral", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("checks telemetry consent from localStorage safely", () => {
    const getItemMock = vi.fn().mockReturnValue("accepted");
    vi.stubGlobal("window", {
      localStorage: { getItem: getItemMock },
    });

    expect(hasTelemetryConsent()).toBe(true);
    expect(getItemMock).toHaveBeenCalledWith("xsypher-cookie-consent");
  });

  it("returns false if consent is rejected or absent", () => {
    const getItemMock = vi.fn().mockReturnValue(null);
    vi.stubGlobal("window", {
      localStorage: { getItem: getItemMock },
    });

    expect(hasTelemetryConsent()).toBe(false);
  });

  it("defers initialization via requestIdleCallback when supported", () => {
    const requestIdleCallbackMock = vi.fn((cb: () => void) => {
      cb();
      return 1;
    });

    vi.stubGlobal("window", {
      requestIdleCallback: requestIdleCallbackMock,
      localStorage: { getItem: () => null },
    });

    scheduleClientInstrumentation();

    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });

  it("falls back to window load listener when requestIdleCallback is absent", () => {
    const addEventListenerMock = vi.fn((event: string, handler: () => void) => {
      if (event === "load") {
        handler();
      }
    });

    vi.stubGlobal("window", {
      addEventListener: addEventListenerMock,
      localStorage: { getItem: () => null },
    });
    vi.stubGlobal("document", {
      readyState: "loading",
    });

    vi.useFakeTimers();
    scheduleClientInstrumentation();

    expect(addEventListenerMock).toHaveBeenCalledWith(
      "load",
      expect.any(Function),
      { once: true },
    );

    vi.runAllTimers();
    expect(Sentry.init).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
