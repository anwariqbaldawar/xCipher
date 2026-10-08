"use client";

import { useState } from "react";
import { showToast } from "@/lib/utils";
import {
  disableTwoFactor,
  startTwoFactorSetup,
  verifyTwoFactorSetup,
} from "@/app/actions/two-factor";
import { ShieldCheck, ShieldOff, KeyRound, Loader2 } from "lucide-react";

type SetupState =
  | { kind: "idle" }
  | { kind: "setup"; secret: string; otpauthUri: string; qrDataUrl: string | null }
  | { kind: "backup"; codes: string[] };

/**
 * Two-factor authentication (TOTP) management for the Account Security tab.
 *
 * Enabled accounts show a disable form (password required). Disabled accounts
 * show a setup flow: scan the QR (or enter the secret manually), enter one code
 * to confirm, then the single-use backup codes are shown exactly once.
 */
export default function TwoFactorForm({ user }: { user: { totpEnabled?: boolean | null } }) {
  const [isPending, setIsPending] = useState(false);
  const [setup, setSetup] = useState<SetupState>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const enabled = Boolean(user?.totpEnabled);

  const handleStartSetup = async () => {
    setIsPending(true);
    try {
      const res = await startTwoFactorSetup();
      if (res.success && res.secret) {
        setSetup({
          kind: "setup",
          secret: res.secret,
          otpauthUri: res.otpauthUri || "",
          qrDataUrl: res.qrDataUrl || null,
        });
      } else {
        showToast(`Error: ${res.error || "Failed to start setup"}`);
      }
    } catch (err: unknown) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to start setup"}`);
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(code.trim())) {
      showToast("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setIsPending(true);
    try {
      const res = await verifyTwoFactorSetup(code.trim());
      if (res.success && res.backupCodes) {
        setSetup({ kind: "backup", codes: res.backupCodes });
        setCode("");
        showToast("Two-factor authentication enabled.");
        // The session user prop is stale until the next navigation; the
        // enabled state flips when the backup-code screen is dismissed.
        window.setTimeout(() => window.location.reload(), 4000);
      } else {
        showToast(`Error: ${res.error || "Invalid code"}`);
      }
    } catch (err: unknown) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to verify"}`);
    } finally {
      setIsPending(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      showToast("Enter your password to disable two-factor authentication.");
      return;
    }
    setIsPending(true);
    try {
      const res = await disableTwoFactor(password);
      if (res.success) {
        showToast("Two-factor authentication disabled.");
        setPassword("");
        window.setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(`Error: ${res.error || "Failed to disable"}`);
      }
    } catch (err: unknown) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed to disable"}`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        padding: "20px",
        marginTop: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        {enabled ? (
          <ShieldCheck className="w-5 h-5" style={{ color: "var(--accent)" }} />
        ) : (
          <ShieldOff className="w-5 h-5" style={{ color: "var(--muted)" }} />
        )}
        <h2 style={{ fontSize: "16px", margin: 0 }}>Two-Factor Authentication</h2>
      </div>
      <p className="cs-sub" style={{ marginTop: 0 }}>
        {enabled
          ? "Enabled. Sign-in requires a code from your authenticator app in addition to your password."
          : "Add a second factor: after your password, sign-in also asks for a 6-digit code from your authenticator app."}
      </p>

      {enabled ? (
        <form onSubmit={handleDisable} style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "420px", marginTop: "16px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your account password"
            autoComplete="current-password"
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
            }}
          />
          <button
            type="submit"
            disabled={isPending}
            className="btn btn-ghost"
            style={{ padding: "8px 14px", borderRadius: "6px", alignSelf: "flex-start", color: "var(--bad, #dc2626)" }}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable Two-Factor Authentication"}
          </button>
        </form>
      ) : setup.kind === "idle" ? (
        <button
          type="button"
          onClick={handleStartSetup}
          disabled={isPending}
          className="btn btn-primary"
          style={{ padding: "8px 14px", borderRadius: "6px", marginTop: "16px" }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Up Two-Factor Authentication"}
        </button>
      ) : setup.kind === "setup" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
          {setup.qrDataUrl && (
            <div style={{ background: "#fff", padding: "10px", borderRadius: "10px", alignSelf: "flex-start" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qrDataUrl} alt="QR code for your authenticator app" width={180} height={180} />
            </div>
          )}
          <div>
            <p style={{ fontSize: "12px", margin: "0 0 6px" }}>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password…).
              If you cannot scan it, enter this code manually:
            </p>
            <code
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "var(--surface-2)",
                letterSpacing: "0.15em",
                fontFamily: "var(--font-jetbrains-mono, monospace)",
              }}
            >
              {setup.secret}
            </code>
          </div>
          <form onSubmit={handleVerifySetup} style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "280px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              6-Digit Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--ink)",
                textAlign: "center",
                letterSpacing: "0.5em",
              }}
            />
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary"
              style={{ padding: "8px 14px", borderRadius: "6px" }}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify and Enable"}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <KeyRound className="w-4 h-4" />
            <strong style={{ fontSize: "14px" }}>Your backup codes</strong>
          </div>
          <p style={{ fontSize: "12px" }}>
            Each code can be used once if you lose access to your authenticator app. Store them somewhere safe —
            they are shown only now.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "6px 16px",
              maxWidth: "320px",
              margin: "12px 0",
              fontFamily: "var(--font-jetbrains-mono, monospace)",
              fontSize: "13px",
            }}
          >
            {setup.codes.map((c) => (
              <code key={c} style={{ padding: "4px 8px", background: "var(--surface-2)", borderRadius: "4px" }}>
                {c}
              </code>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ padding: "8px 14px", borderRadius: "6px" }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
