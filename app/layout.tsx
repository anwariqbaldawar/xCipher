import type { Metadata } from "next";
import Script from "next/script";
import { siteConfig, BRAND_ALTERNATE_NAMES } from "@/lib/seo";
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const kremlin = localFont({
  src: './fonts/kremlin.woff2',
  variable: '--f-kremlin',
  display: 'swap',
});
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { headers } from "next/headers";
import { GoogleAnalytics } from "@next/third-parties/google";

// ─────────────────────────────────────────────────────────────────────────────
// Type system — three roles, one family each.
//
//   headings    Cabinet Grotesk, falling back to Space Grotesk
//   body + UI   Plus Jakarta Sans
//   code + meta JetBrains Mono
//
// Cabinet Grotesk is a Fontshare release, not a Google font, so it cannot come
// through next/font/google — it has to be self-hosted. Its @font-face lives in
// globals.css and points at /public/fonts; see the note there for the files to
// drop in. Until they exist the headline stack falls through to Space Grotesk,
// which is the closest geometric grotesk available here and is loaded below for
// exactly that reason.
//
// Deliberately not next/font/local: that resolves paths at build time and fails
// the build outright when a file is missing, which would mean nobody can build
// this repo until the licensed files are committed. A plain @font-face just
// falls through instead.
//
// The Google families are variable, so each ships one file covering its whole
// weight range rather than a request per weight.
// ─────────────────────────────────────────────────────────────────────────────

// Headline fallback until Cabinet Grotesk is self-hosted, and the permanent
// second step of the display stack after that.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

// Reading text and interface. Tall x-height and open apertures keep body copy
// legible at the sizes this design uses, and hold up in dark mode where thin
// strokes tend to bloom against the background.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

// Code, and the metadata that should read as machine-precise: timestamps,
// kickers, tags. Designed for long code lines, with a tall x-height and
// disambiguated 0/O and 1/l/I.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  icons: {
    // Explicit, size-declared favicon set. Every raster is a
    // full-bleed opaque black square (see
    // scripts/generate-favicons.ts), so Google's circular
    // SERP mask has no transparent pixel to paint white —
    // the white halo around the old rounded-corner icon
    // cannot come back.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-144.png", type: "image/png", sizes: "144x144" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    other: [{ rel: "manifest", url: "/manifest.webmanifest" }],
  },
  // NOTE (MON-002): these meta tags are evaluated at BUILD time for the
  // statically generated pages, and `.env.*` is excluded from the Docker build
  // context (.dockerignore), so an env var set only in the host's
  // `.env.production` will NOT reach the rendered HTML.
  //   • Bing  → use public/BingSiteAuth.xml (file method) or a DNS TXT record.
  //   • Google→ use a DNS TXT record (google-site-verification=...) OR pass the
  //     value as a Docker build arg (Dockerfile ARG -> compose build.args).
  // The meta-tag path below still works when the value is present at build.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

const websiteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": siteConfig.name,
  // Same rationale as the Organization entity: every phonetic
  // variant and common misspelling of the brand name resolves
  // to this one website in the Knowledge Graph.
  "alternateName": BRAND_ALTERNATE_NAMES,
  "url": siteConfig.url,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${siteConfig.url}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string"
  }
}).replace(/</g, '\\u003c');

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Per-request CSP nonce from the middleware, forwarded to every inline
  // script below so the CSP can drop 'unsafe-inline' for script-src.
  const nonce = (await headers()).get("x-csp-nonce") || undefined;

  return (
    <html lang="en" suppressHydrationWarning className={`scroll-pt-28 lg:scroll-pt-32 ${spaceGrotesk.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${kremlin.variable}`}>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
        />
        {/* Carry a theme chosen under a previous brand over to the current storage key.
            In Next.js 15+ / React 19, inline scripts should be placed inside <head>
            as native <script> tags to avoid "Encountered a script tag" errors on the client.
            A native tag (rather than next/script) also lets the CSP nonce through. */}
        <script
          id="theme-migration"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="xsypher-theme";if(localStorage.getItem(k))return;var old=["xcipher-theme","gridx-theme"];for(var i=0;i<old.length;i++){var v=localStorage.getItem(old[i]);if(v){localStorage.setItem(k,v);return;}}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="system" storageKey="xsypher-theme" disableTransitionOnChange enableSystem nonce={nonce}>
          {children}
          <div id="toast-root" className="pointer-events-none fixed inset-0 z-[9999]" aria-live="assertive"></div>
        </ThemeProvider>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-MTVGJEQKS5"} nonce={nonce} />
      </body>
    </html>
  );
}
