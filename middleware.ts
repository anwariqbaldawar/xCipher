import NextAuth from "next-auth";
import { createAuthConfig, isLocalHostname } from "@/lib/auth.config";
import type { Role } from "@/lib/types";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth: edgeAuth } = NextAuth(createAuthConfig());

// ─────────────────────────────────────────────────────────────────────────────
// Security headers with a per-request CSP nonce.
//
// The CSP used to live in next.config.ts with 'unsafe-inline' for scripts,
// which lets any injected inline script run. Now the middleware generates a
// nonce per request, sends it to the app as the x-csp-nonce request header
// (server components read it via headers()), and returns a CSP that only
// allows inline scripts carrying that nonce on dynamic/admin routes, while
// static/ISR public pages retain 'unsafe-inline' so Next.js SSG hydration
// scripts are not blocked. style-src keeps 'unsafe-inline' because React
// style attributes cannot carry a nonce.
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_SCRIPT_HOSTS = [
  "https://www.tiktok.com",
  "https://static.cloudflareinsights.com",
  "https://pagead2.googlesyndication.com",
  "https://adservice.google.com",
  "https://tpc.googlesyndication.com",
].join(" ");

const ALLOWED_FRAME_HOSTS = [
  "https://www.youtube-nocookie.com",
  "https://www.tiktok.com",
  "https://googleads.g.doubleclick.net",
  "https://tpc.googlesyndication.com",
  "https://www.google.com",
].join(" ");

function buildCsp(nonce: string, isStaticPublic: boolean): string {
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isStaticPublic
    ? `script-src 'self' 'unsafe-inline' ${ALLOWED_SCRIPT_HOSTS}${isDev ? " 'unsafe-eval'" : ""}`
    : `script-src 'self' 'nonce-${nonce}' ${ALLOWED_SCRIPT_HOSTS}${isDev ? " 'unsafe-eval'" : ""}`;
    
  return [
    "default-src 'self'",
    scriptSrc,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `frame-src 'self' ${ALLOWED_FRAME_HOSTS}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https:",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, nonce: string, isStaticPublic: boolean): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce, isStaticPublic));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  );
  return response;
}

function checkIsLocalDev(hostname: string, urlHostname: string): boolean {
  if (process.env.IS_LOCAL_DEV === "true") return true;
  if (process.env.NEXTAUTH_URL) {
    try {
      if (isLocalHostname(new URL(process.env.NEXTAUTH_URL).hostname)) return true;
    } catch {
      if (isLocalHostname(process.env.NEXTAUTH_URL)) return true;
    }
  }
  return isLocalHostname(hostname) || isLocalHostname(urlHostname);
}

export default async function middleware(req: NextRequest) {
  // Web Crypto is available on the edge runtime; no node:crypto import here.
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-csp-nonce", nonce);
  
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const isLocalDev = checkIsLocalDev(hostname, url.hostname);

  const effectiveHostname = isLocalDev ? url.hostname : hostname;
  const isAdminSubdomain = !isLocalDev && (effectiveHostname === "admin.xsypher.com" || effectiveHostname.startsWith("admin.localhost"));
  const isStaticPublic = !isAdminSubdomain && !url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api");

  requestHeaders.set("Content-Security-Policy", buildCsp(nonce, isStaticPublic));

  const response = await route(req, requestHeaders);
  return applySecurityHeaders(response, nonce, isStaticPublic);
}

async function route(req: NextRequest, requestHeaders: Headers): Promise<NextResponse> {
    const url = req.nextUrl.clone();
    const hostname = req.headers.get("host") || "";
    const pathname = url.pathname;

    // Fast path: exit early for normal apex domain traffic that doesn't need protection or rewrites
    const isSpecialSubdomain = hostname.startsWith("admin.") || hostname.startsWith("preview.");
    if (!isSpecialSubdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/api/auth")) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const isLocalDev = checkIsLocalDev(hostname, url.hostname);

    if (!isLocalDev) {
      if (hostname) url.hostname = hostname;
      // Strip internal container port behind proxy to prevent :3000 from leaking into redirects/rewrites
      url.port = '';
      // Enforce HTTPS for production redirects to avoid mixed-content issues
      url.protocol = 'https:';
    }

    // In local development, ensure the URL retains the local host/port and doesn't get rewritten to live domains
    if (isLocalDev && (url.hostname === "xsypher.com" || url.hostname === "www.xsypher.com" || url.hostname === "admin.xsypher.com")) {
      const localBase = new URL(process.env.NEXTAUTH_URL || "http://localhost:8787");
      url.protocol = localBase.protocol;
      url.hostname = localBase.hostname;
      url.port = localBase.port;
    }

    const effectiveHostname = isLocalDev ? url.hostname : hostname;
    const isAdminSubdomain = !isLocalDev && (effectiveHostname === "admin.xsypher.com" || effectiveHostname.startsWith("admin.localhost"));
    const isPreviewSubdomain = !isLocalDev && (effectiveHostname === "preview.xsypher.com" || effectiveHostname.startsWith("preview.localhost"));
    const isApex = !isLocalDev && (effectiveHostname === "xsypher.com" || effectiveHostname === "www.xsypher.com");

    let effectivePath = pathname;

    // 1. Redirect public paths to apex domain if visited on admin subdomain (e.g. from relative links in dashboard)
    const publicPaths = ["/article", "/author", "/category", "/latest", "/page", "/search", "/series", "/tag"];
    if (isAdminSubdomain && publicPaths.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
      url.hostname = "xsypher.com";
      return NextResponse.redirect(url);
    }

    // 2. Subdomain rewriting
    if (isAdminSubdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/invite") && !pathname.startsWith("/api")) {
      effectivePath = `/admin${pathname === '/' ? '' : pathname}`;
    }

    // 2. Apex domain redirection for /admin (Production only)
    if (isApex && pathname.startsWith("/admin")) {
      url.hostname = "admin.xsypher.com";
      return NextResponse.redirect(url);
    }

    // 3. Authorization guard for protected routes
    const isAuthPublicRoute =
      effectivePath.startsWith("/admin/login") ||
      effectivePath.startsWith("/admin/setup") ||
      effectivePath.startsWith("/admin/forgot-password") ||
      effectivePath.startsWith("/admin/reset-password");

    const isProtected = effectivePath.startsWith("/admin") && !isAuthPublicRoute;
    // Both editor pages verify the active database user and their capabilities
    // themselves, and the authenticated layout also enforces console access.
    // Keep subdomain routing here without decoding their JWT a second time.
    const editorVerifiesSession =
      (req.method === "GET" || req.method === "HEAD") &&
      (effectivePath === "/admin/editor" || effectivePath.startsWith("/admin/editor/"));

    if (isProtected && !editorVerifiesSession) {
      // Public pages and auth entry points do not need JWT decoding. API
      // handlers are excluded below and verify their own sessions.
      const session = await edgeAuth();
      const token = session?.user;
      if (!token) {
        url.pathname = isAdminSubdomain ? "/login" : "/admin/login";
        url.searchParams.set("callbackUrl", `${url.origin}${effectivePath}${req.nextUrl.search}`);
        return NextResponse.redirect(url);
      }

      // Load the policy only for authenticated console requests; its query
      // scoping helpers should not initialize Drizzle on public page visits.
      const { authorize } = await import("@/lib/capabilities");
      if (!authorize(token.role as Role, "console.access")) {
        url.pathname = "/";
        url.hostname = isApex ? hostname : (process.env.NODE_ENV === "production" && !isLocalDev ? "xsypher.com" : "localhost:3000");
        return NextResponse.redirect(url);
      }
    }

    // 4. Perform the rewrite if it's the admin subdomain
    if (isAdminSubdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/invite") && !pathname.startsWith("/api")) {
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    // 5. Perform the rewrite if it's the preview subdomain
    if (isPreviewSubdomain && !pathname.startsWith("/preview")) {
      url.pathname = `/preview${pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Runs on everything except static assets so every HTML response carries a
     * per-request CSP nonce (and the rest of the security headers). The public
     * fast path in the middleware keeps the cost of a normal page view to a
     * header set. Subdomain routing for the console stays here for the paths
     * that match; host-based rewrites in next.config.ts cover the rest.
     */
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|txt|xml)$).*)",
  ],
};
