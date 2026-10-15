// ─────────────────────────────────────────────────────────────────────────────
// User agents that receive metadata in <head> (blocking) instead of streamed
// into <body> after the page shell — next.config.ts `htmlLimitedBots`.
//
// Since Next 15.2, generateMetadata output is streamed and appended to <body>
// for any request Next does not recognise as an HTML-limited bot. Link-preview
// crawlers do not run JavaScript and only read <head>, so an unrecognised one
// sees no og:image / twitter:card and the share degrades to a bare link.
// Next's default list covers facebookexternalhit, Twitterbot, WhatsApp,
// LinkedInBot, Slackbot, Discordbot and the search engines, but not Meta's
// newer agents (meta-externalagent / meta-externalfetcher) or Pinterest,
// Telegram, Mastodon, Bluesky, Iframely and Embedly.
//
// Setting `htmlLimitedBots` REPLACES Next's list, so every default is repeated
// here (from next/dist/shared/lib/router/utils/html-bots.js, Next 16) before
// the additions. tests/social-metadata.test.ts fails if a Next upgrade adds a
// default this list does not cover. Next applies the `i` flag itself.
//
// Kept out of next.config.ts so the list is testable without loading config.
// ─────────────────────────────────────────────────────────────────────────────

export const NEXT_DEFAULT_HTML_LIMITED_BOTS = [
  "[\\w-]+-Google",
  "Google-[\\w-]+",
  "Chrome-Lighthouse",
  "Slurp",
  "DuckDuckBot",
  "baiduspider",
  "yandex",
  "sogou",
  "bitlybot",
  "tumblr",
  "vkShare",
  "quora link preview",
  "redditbot",
  "ia_archiver",
  "Bingbot",
  "BingPreview",
  "applebot",
  "facebookexternalhit",
  "facebookcatalog",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "WhatsApp",
  "SkypeUriPreview",
  "Yeti",
  "googleweblight",
] as const;

/** Link-preview crawlers Next's default list does not recognise. */
export const LINK_PREVIEW_BOTS = [
  "meta-externalagent",
  "meta-externalfetcher",
  "Pinterest",
  "TelegramBot",
  "Mastodon",
  "Bluesky",
  "Iframely",
  "Embedly",
] as const;

export const HTML_LIMITED_BOTS = new RegExp([...NEXT_DEFAULT_HTML_LIMITED_BOTS, ...LINK_PREVIEW_BOTS].join("|"), "i");
