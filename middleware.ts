import NextAuth from "next-auth";
import { createAuthConfig, isLocalHostname } from "@/lib/auth.config";
import { isDeletedSlug } from "@/lib/deleted-slugs";
import type { Role } from "@/lib/types";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth: edgeAuth } = NextAuth(createAuthConfig());

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 410 Gone for permanently deleted article slugs
// ─────────────────────────────────────────────────────────────────────────────
//
// A deleted article used to fall through to the article page, which
// queried Neon, missed, and rendered the 404 document. A 404 tells a
// crawler "not found right now — ask again later", so test documents
// and removed stories lingered in the index while Google kept
// retrying their URLs. HTTP 410 Gone is the explicit "permanently
// removed" answer, and it is what makes Google drop a URL on the
// next crawl instead of for weeks.
//
// The match runs in middleware, before any routing or database work:
//
//   • the compiled-in half of the tombstone registry
//     (lib/deleted-slugs.ts) is evaluated in-process with zero I/O,
//     so the known deleted test slugs answer 410 without waking
//     Neon PostgreSQL at all;
//   • the runtime half (slugs an admin deleted from the dashboard)
//     comes from the cached manifest at /api/deleted-slugs, never
//     from a per-request database query — the manifest is HTTP-cached
//     at the CDN and re-fetched here at most once per TTL window.
//
// Slugs that were never articles keep the standard 404 behaviour:
// the article page renders its not-found document exactly as before.
// ─────────────────────────────────────────────────────────────────────────────

/** /article/<slug> and /articles/<slug>, with an optional trailing slash. */
const DELETED_ARTICLE_PATH = /^\/articles?\/([^/?]+)\/?$/;

/**
 * How long the middleware keeps a fetched tombstone manifest in
 * memory. Short enough that a slug deleted from the dashboard
 * starts answering 410 within a minute, long enough that a crawl
 * burst never turns into a burst of manifest requests.
 */
const TOMBSTONE_MANIFEST_TTL_MS = 30_000;

let tombstoneManifest: { fetchedAt: number; slugs: Set<string> } | null = null;

/** Percent-decode a path segment; a malformed escape is used as-is. */
function safeDecodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Is this slug in the runtime half of the tombstone registry?
 *
 * Fail-open by design: an unreadable manifest caches an empty set
 * for one TTL window rather than retrying per request, and never
 * blocks or errors the article route itself.
 */
async function isManifestTombstone(slug: string, origin: string): Promise<boolean> {
  const now = Date.now();
  if (!tombstoneManifest || now - tombstoneManifest.fetchedAt > TOMBSTONE_MANIFEST_TTL_MS) {
    let slugs: string[] = [];
    try {
      const res = await fetch(`${origin}/api/deleted-slugs`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const body = (await res.json()) as { slugs?: unknown };
        if (Array.isArray(body?.slugs)) {
          slugs = body.slugs
            .map((entry) => String(entry).toLowerCase())
            .filter(Boolean);
        }
      }
    } catch (error) {
      console.warn("[middleware] tombstone manifest unavailable:", error);
    }
    tombstoneManifest = { fetchedAt: now, slugs: new Set(slugs) };
  }
  return tombstoneManifest.slugs.has(slug.trim().toLowerCase());
}

/**
 * The 410 document itself.
 *
 * Styled to match the publication's dark/light theme (the same
 * surface/ink/accent tokens globals.css defines, resolved through
 * prefers-color-scheme since a middleware response carries no
 * theme context), and carrying both the meta robots tag and the
 * X-Robots-Tag header so every crawler — HTML-reading and
 * header-reading alike — gets the noindex instruction.
 */
function buildGoneResponse(slug: string): NextResponse {
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow" />
<title>410 Gone — xSypher</title>
<style>
  :root { color-scheme: light; --surface:#fcfcfc; --surface-2:#f2f2f2; --ink:#000000; --muted:#4a4a4a; --line:#e6e6e6; --accent:#e60000; }
  @media (prefers-color-scheme: dark) {
    :root { color-scheme: dark; --surface:#121212; --surface-2:#1a1a1a; --ink:#ffffff; --muted:#c4c4c4; --line:#2d2d2d; --accent:#ff1a1a; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--surface); font-family:ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { width:100%; max-width:32rem; padding:2rem; text-align:center; border:1px solid var(--line); background:var(--surface-2); border-radius:0.75rem; }
  .mark { display:inline-grid; grid-template-columns:repeat(2,1fr); gap:4px; width:44px; height:44px; margin-bottom:1.5rem; }
  .mark i { border-radius:3px; }
  .mark i:nth-child(1) { background:#ffffff; }
  .mark i:nth-child(2), .mark i:nth-child(3) { background:#ffffff; opacity:0.4; }
  .mark i:nth-child(4) { position:relative; background:#ffffff; opacity:0.4; }
  .mark i:nth-child(4)::before, .mark i:nth-child(4)::after { content:""; position:absolute; left:50%; top:50%; width:120%; height:3px; background:#f04552; border-radius:2px; }
  .mark i:nth-child(4)::before { transform:translate(-50%,-50%) rotate(45deg); }
  .mark i:nth-child(4)::after { transform:translate(-50%,-50%) rotate(-45deg); }
  h1 { margin:0 0 0.25rem; font-size:3.5rem; font-weight:800; letter-spacing:-0.02em; color:var(--ink); }
  h2 { margin:0 0 1rem; font-size:1rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink); }
  p { margin:0 0 2rem; color:var(--muted); line-height:1.6; }
  a { display:inline-block; padding:0.65rem 1.25rem; border-radius:0.75rem; font-size:0.875rem; font-weight:600; text-decoration:none; color:#ffffff; background:var(--accent); }
  code { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:0.8em; color:var(--muted); }
</style>
</head>
<body>
<main>
  <span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
  <h1>410</h1>
  <h2>// Gone for good</h2>
  <p>This article (<code>${slug.replace(/</g, "&lt;")}</code>) was permanently removed from xSypher. The page is gone and will not return, so search engines are asked to drop it for good.</p>
  <a href="/">Return to Base</a>
</main>
</body>
</html>`;

  return new NextResponse(body, {
    status: 410,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      // The 410 is itself cacheable: a crawler retrying a deleted URL
      // gets the same answer from the edge without re-invoking the
      // Worker or the origin.
      "Cache-Control": "public, max-age=60, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

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

// SEC-002: connect-src was `'self' https:` — any HTTPS endpoint could receive
// XHR/fetch data, so an injection had an open exfiltration channel. This is the
// explicit allowlist, built from Google's own CSP guidance for AdSense/Google
// Ads (developers.google.com/tag-platform/security/guides/csp) plus the third
// parties this site actually loads. Google uses regional adservice domains, so
// the locales our readers are in are listed explicitly (CSP cannot wildcard a
// TLD). If a new integration needs fetch access, add its host here — do not
// revert to `https:`.
const ALLOWED_CONNECT_HOSTS = [
  // Google ad + measurement surfaces (documented set)
  "https://pagead2.googlesyndication.com",
  "https://tpc.googlesyndication.com",
  "https://www.googletagmanager.com",
  "https://www.googleadservices.com",
  "https://partner.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://ad.doubleclick.net",
  "https://*.g.doubleclick.net",
  "https://www.google.com",
  "https://*.google.com",
  "https://*.google-analytics.com",
  "https://*.adtrafficquality.google",
  "https://fundingchoicesmessages.google.com",
  // Regional AdSense domains for our main audiences
  "https://*.google.com.pk",
  "https://*.google.co.uk",
  "https://*.google.co.in",
  "https://*.google.ca",
  "https://*.google.com.au",
  "https://*.google.ie",
  "https://*.google.de",
  "https://*.google.com.sg",
  "https://*.google.ae",
  "https://*.google.com.sa",
  // First-party services
  "https://*.sentry.io",
  "https://cloudflareinsights.com",
  "https://static.cloudflareinsights.com",
  // Embeds
  "https://www.tiktok.com",
  "https://react-tweet.vercel.app",
  "https://*.twimg.com",
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
    `connect-src 'self' ${ALLOWED_CONNECT_HOSTS}`,
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

    const isLocalDev = checkIsLocalDev(hostname, url.hostname);

    if (!isLocalDev && hostname === "www.xsypher.com") {
      url.protocol = "https:";
      url.hostname = "xsypher.com";
      url.port = "";
      return NextResponse.redirect(url, 308);
    }

    // HTTP 410 Gone for permanently deleted article slugs.
    // Checked before the fast path so it runs for every public
    // article view, and before any routing/auth work so a
    // tombstoned URL never reaches the article page (and so
    // never wakes Neon PostgreSQL to discover it is gone).
    const deletedSlugMatch = DELETED_ARTICLE_PATH.exec(pathname);
    if (deletedSlugMatch) {
      const slug = safeDecodeSlug(deletedSlugMatch[1]);
      const gone = isDeletedSlug(slug) || (await isManifestTombstone(slug, url.origin));
      if (gone) {
        return buildGoneResponse(slug);
      }
    }

    // Fast path: exit early for normal apex domain traffic that doesn't need protection or rewrites
    const isSpecialSubdomain = hostname.startsWith("admin.") || hostname.startsWith("preview.");
    if (!isSpecialSubdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/api/auth")) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

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
