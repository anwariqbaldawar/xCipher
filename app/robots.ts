import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

// ─────────────────────────────────────────────────────────────────────────────
// robots.txt
//
// Audit updates (2026-10-13):
//  - CRW-003: /invite/* and /unsubscribe/* carry single-use tokens and were
//    neither disallowed here nor noindexed on the page. Both are covered now.
//  - GEO-002: AI crawler policy is explicit instead of implicit. The active
//    policy is Option A (visibility-first): every major AI crawler is allowed
//    so citations and search visibility are maximised while training is a
//    deliberate trade-off the owner accepted. To switch to Option B (block
//    training crawlers, keep search/retrieval), change the last group's
//    `allow: '/'` to `disallow: '/'` for the listed user agents.
//  - SEO-2026-10-17: `/_next/` and `/*?_rsc=*` are NO LONGER disallowed.
//    Blocking /_next/ stopped Googlebot's headless renderer from fetching
//    the stylesheets, web fonts and JavaScript chunks a page needs to
//    render, and blocking the RSC query param stopped it from fetching
//    client-side navigation payloads — the crawler saw unstyled, broken
//    HTML and mobile-friendliness tanked. Next.js assets under
//    /_next/static/ and optimised images under /_next/image are public
//    build output with no private data, so every crawler is now allowed
//    them explicitly. Disallow is reserved for private administration,
//    internal API and single-use token endpoints.
// ─────────────────────────────────────────────────────────────────────────────

// Private administration, internal API and token-bearing endpoints only.
// Everything else is crawlable.
const DISALLOWED_PATHS = [
  '/admin/',
  '/api/admin/',
  '/api/auth/',
  '/auth/',
  '/preview/',
  '/invite',
  '/unsubscribe',
];

// Build output and public assets every renderer must be able to fetch:
// stylesheets, fonts, JavaScript chunks and optimised images.
const PUBLIC_ASSETS = ['/', '/_next/static/', '/_next/image'];

// The user agents the search and social rendering path depends on. Each
// gets its own group so the Allow rules are explicit and auditable
// rather than inherited from the wildcard. Threads rides along with
// the link-preview agents: it renders cards from the same surface.
const SEARCH_AND_SOCIAL_CRAWLERS = [
  'Googlebot',
  'Googlebot-Image',
  'Twitterbot',
  'facebookexternalhit',
  'WhatsApp',
  'LinkedInBot',
  'Threads',
];

// ─────────────────────────────────────────────────────────────────────────────
// Social preview crawlers (2026-10-16)
//
// These agents are what build the link preview on X, Facebook, Threads,
// WhatsApp, LinkedIn and Slack, and none of them executes JavaScript or follows
// a client-side redirect. If one is blocked — or is served a page whose
// `og:image` it cannot fetch — the share renders as a bare text URL or a plain
// black placeholder card, which is exactly the failure this group exists to
// prevent.
//
// They are declared explicitly rather than relying on the `*` group for two
// reasons: it records the intent, and a future tightening of the wildcard rule
// (a common reaction to scrapers) then cannot silently break every share of the
// site. `/api/og` stays allowed here even though `/api/` is disallowed for
// everyone else: the generated fallback card is an image endpoint, and blocking
// it would leave every article without a featured image with no preview at all.
// ─────────────────────────────────────────────────────────────────────────────
const SOCIAL_CRAWLERS = [
  'Twitterbot',
  'facebookexternalhit',
  'facebookcatalog',
  'WhatsApp',
  'Threads',
  'LinkedInBot',
  'Slackbot',
  'Slackbot-LinkExpanding',
  'Discordbot',
  'TelegramBot',
  'Pinterestbot',
  'redditbot',
  'Embedly',
  'SkypeUriPreview',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: PUBLIC_ASSETS,
        disallow: DISALLOWED_PATHS,
      },
      // Search and social rendering crawlers: explicit, auditable
      // allow rules for the Next.js build assets (stylesheets, web
      // fonts, JavaScript chunks), the image optimiser endpoint
      // and the generated social card they must fetch to render
      // pages and link previews faithfully.
      {
        userAgent: SEARCH_AND_SOCIAL_CRAWLERS,
        allow: [...PUBLIC_ASSETS, '/api/og'],
        disallow: DISALLOWED_PATHS,
      },
      // Link-preview agents: full access to pages and image URLs, including the
      // generated social card at /api/og.
      {
        userAgent: SOCIAL_CRAWLERS,
        allow: ['/', '/_next/static/', '/_next/image', '/api/og'],
        disallow: DISALLOWED_PATHS,
      },
      // AI search / retrieval bots — these are what produce AI citations.
      {
        userAgent: [
          'OAI-SearchBot',
          'ChatGPT-User',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
          'Perplexity-User',
          'Applebot',
        ],
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      // AI training crawlers — explicitly allowed under the current
      // visibility-first policy (same effective behaviour as today, now on
      // the record). Flip each to `disallow: '/'` to opt out of training.
      {
        userAgent: [
          'GPTBot',
          'ClaudeBot',
          'CCBot',
          'Bytespider',
          'meta-externalagent',
          'Google-Extended',
          'Applebot-Extended',
        ],
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
