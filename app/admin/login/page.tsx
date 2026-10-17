"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff, Mail, KeyRound, ShieldCheck } from "lucide-react";
import Logo, { LogoIcon } from "@/components/common/Logo";
import BrandLoader from "@/components/common/BrandLoader";

function LoginForm({
  loading,
  setLoading,
}: {
  loading: boolean;
  setLoading: (value: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const emailInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("from") || "/admin";
  const setupSuccess = searchParams?.get("setup") === "success";

  // Auto-focus email input on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      otp: otp || undefined,
    });

    if (res?.error) {
      if (res.error.toLowerCase().includes("two-factor")) {
        // Password was correct; the account has 2FA enabled. Ask for the code.
        setNeedsOtp(true);
        setError("Enter the 6-digit code from your authenticator app.");
      } else {
        setError("Invalid email or password");
      }
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
      {setupSuccess && (
        <div
          className="flex items-start gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg text-sm"
          role="status"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <p className="font-medium text-xs sm:text-sm leading-relaxed">
            Setup complete! You may now log in with your new Owner account.
          </p>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-3 p-3.5 bg-bad/10 border border-bad/25 text-bad rounded-lg text-sm"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-bad" />
          <p className="font-medium text-xs sm:text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {/* Email Form Group */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail className="auth-field-icon" aria-hidden="true" />
          <input
            id="email"
            type="email"
            ref={emailInputRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="editor@xsypher.com"
            required
            autoComplete="email"
            className="auth-field"
          />
        </div>
      </div>

      {/* Password Form Group */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
          >
            Password
          </label>
          <Link
            href="/admin/forgot-password"
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors focus:outline-none focus-visible:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <KeyRound className="auth-field-icon" aria-hidden="true" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            autoComplete="current-password"
            className="auth-field auth-field-has-action"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="auth-field-action"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication Code (shown after a correct password) */}
      {needsOtp && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="otp"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]"
          >
            Authenticator Code
          </label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            required
            autoFocus
            className="auth-field auth-field-otp"
          />
          <p className="text-[11px] text-[var(--muted)]">
            Open your authenticator app and enter the 6-digit code. A backup code also works.
          </p>
        </div>
      )}

      {/* Primary CTA Action */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={loading}
          className="auth-submit"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="auth-submit-spinner" aria-hidden="true" />
              <span>Verifying credentials…</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Sign In</span>
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  const [authenticating, setAuthenticating] = useState(false);

  return (
    <div className="auth-shell">
      {/* High-Performance Animated Tech Background — theme-aware
          via the console variables, so light mode gets the same
          architectural grid and crimson ambience at lower ink. */}
      <div className="auth-bg" aria-hidden="true">
        {/* Layer 1: Subtle Tech Grid with drifting animation */}
        <div className="auth-bg-grid animate-tech-grid" />

        {/* Layer 2: Ambient Deep Crimson Breathing Glow */}
        <div className="auth-bg-glow animate-ambient-pulse" />

        {/* Layer 3: Soft Radial Vignette */}
        <div className="auth-bg-vignette" />

        {/* Layer 4: Giant brand-mark watermark. The vector mark
            is the same four squares and cross the header renders,
            so there is one brand graphic in the repository
            instead of two that disagree. */}
        <div className="auth-bg-mark">
          <LogoIcon className="w-[90vw] max-w-[900px] h-auto" style={{ height: "auto" }} />
        </div>
      </div>

      {/* Editorial Auth Card */}
      <div className="auth-card-wrap">
        <div className="auth-card">
          {/* Header Section with Brand Mark — the signature
              Kremlin display wordmark, exactly as the console
              top bar and the publication header carry it. */}
          <div className="flex flex-col items-center mb-6 text-center w-full">
            <div className="flex items-center gap-2.5 mb-3">
              <Logo variant="brand" className="text-[22px]" />
              <span className="auth-badge">
                Editorial Console
              </span>
            </div>

            <h1 className="sr-only">Sign In to xSypher Editorial Console</h1>
            <p className="text-xs sm:text-sm font-normal tracking-wide text-[var(--muted)]">
              Sign in to access editorial newsroom &amp; CMS
            </p>
          </div>

          <Suspense
            fallback={
              <div className="py-12">
                <BrandLoader status="INITIALIZING SECURE SESSION…" mode="inline" />
              </div>
            }
          >
            <LoginForm loading={authenticating} setLoading={setAuthenticating} />
          </Suspense>
        </div>
      </div>

      {/* Return Link & Footer */}
      <div className="auth-footer">
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL || "https://www.xsypher.com"}
          className="auth-return group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
          <span>Return to publication</span>
        </a>
        <p className="text-[11px] tracking-wider uppercase text-[var(--muted)]">
          &copy; {new Date().getFullYear()} xSypher Media Network · Authorized Editorial Staff Only
        </p>
      </div>

      {/* Full-viewport brand loader while the console
          authenticates the session. */}
      {authenticating && <BrandLoader status="VERIFYING CREDENTIALS…" />}
    </div>
  );
}
