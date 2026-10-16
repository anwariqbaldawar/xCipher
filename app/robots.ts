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
// ─────────────────────────────────────────────────────────────────────────────

const DISALLOWED_PATHS = [
  '/admin/',
  '/api/',
  '/search',
  '/preview',
  '/invite',
  '/unsubscribe',
  '/_next/',
  '/*?_rsc=*',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
      // Social link unfurlers.
      //
      // These are listed explicitly rather than left to the `*` group for one
      // reason: a share preview is the first thing most readers ever see of a
      // story, and a site that has drifted into blocking one of these
      // user-agents (a WAF rule, a bot-fight mode, an over-eager rule added
      // during an attack) will silently render shared links as bare text with
      // no error anywhere. Naming them here makes that policy auditable, and
      // the token paths stay closed even to a crawler.
      {
        userAgent: [
          'Twitterbot', // X link previews (twitter:card)
          'facebookexternalhit', // Facebook + Threads unfurls
          'WhatsApp', // WhatsApp link previews
          'LinkedInBot',
          'Slackbot',
          'TelegramBot',
          'Discordbot',
        ],
        allow: '/',
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
