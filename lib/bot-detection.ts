// ─────────────────────────────────────────────────────────────────────────────
// Is this request a machine?
// ─────────────────────────────────────────────────────────────────────────────
//
// Used to keep non-human traffic out of the counters that write to Neon.
//
// The problem this solves is not vanity metrics, it is billing. Neon charges
// compute in CU-hours and suspends an idle compute after ~5 minutes, so a single
// `UPDATE "Article" SET views = views + 1` is not one statement's worth of cost:
// it wakes the compute and holds it awake for the next five minutes. Social
// unfurlers (facebookexternalhit, Twitterbot, LinkedInBot, WhatsApp) fetch every
// shared URL, search crawlers re-fetch the archive, and AI crawlers walk whole
// sites — and every one of them used to look exactly like a reader to the view
// counter on the article page.
//
// Deliberately a substring list rather than a regex library or a dependency:
// user-agent matching is a best-effort filter for *analytics*, never an
// authorization decision, and a list that can be read and audited in one screen
// is worth more here than exhaustive coverage. Anything missed costs one buffered
// Redis increment — the write path is already buffered (lib/article-views.ts), so
// this is a second, cheaper gate in front of it.
//
// A missing or blank user agent counts as a machine: browsers always send one,
// so an empty value is a script.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Substrings that identify a crawler, unfurler, monitor or scripted client.
 *
 * Grouped by why each one matters here, because the groups have different
 * consequences: the first group is what kept the database awake on a *published*
 * schedule (every share of every story), the second is what walks the whole
 * archive, and the third exists so that uptime probes and `curl` in a deploy
 * script cannot be counted as readership.
 */
export const CRAWLER_USER_AGENT_PATTERNS: readonly string[] = [
  // Search engines.
  "googlebot", "bingbot", "duckduckbot", "duckduckgo", "yandex", "baiduspider",
  "sogou", "exabot", "ia_archiver", "petalbot", "applebot", "seznam", "qwant",
  "bravebot", "mojeekbot", "ecosia", "naver", "yeti/",

  // Social unfurlers — these fire on every share, not on a crawl schedule.
  "facebookexternalhit", "facebookcatalog", "twitterbot", "linkedinbot",
  "whatsapp", "telegrambot", "discordbot", "slackbot", "pinterest",
  "redditbot", "embedly", "quora link preview", "skypeuripreview",
  "line-poker", "vkshare", "w3c_validator", "bitlybot",

  // AI / training crawlers and assistants.
  "gptbot", "oai-searchbot", "chatgpt-user", "ccbot", "anthropic-ai",
  "claudebot", "claude-web", "perplexitybot", "google-extended", "bytespider",
  "amazonbot", "applebot-extended", "diffbot", "omgili", "timpibot",
  "youbot", "cohere-ai", "meta-externalagent", "meta-externalfetcher",

  // SEO / analytics crawlers and monitors.
  "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "screaming frog",
  "siteauditbot", "serpstatbot", "dataforseo", "uptimerobot", "pingdom",
  "statuscake", "better uptime", "betterstack", "hetrixtools", "newrelicpinger",
  "datadog", "site24x7", "lighthouse", "pagespeed", "gtmetrix", "calibre",

  // Generic scripted clients. A browser never sends these prefixes.
  "curl/", "wget/", "python-requests", "python-urllib", "aiohttp", "httpx",
  "go-http-client", "java/", "okhttp", "axios/", "node-fetch", "undici",
  "libwww-perl", "apache-httpclient", "postmanruntime", "insomnia",
  "headlesschrome", "phantomjs", "puppeteer", "playwright",
];

/** True when the user agent belongs to a machine rather than a reader. */
export function isCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  const value = userAgent.toLowerCase().trim();
  if (!value) return true;
  return CRAWLER_USER_AGENT_PATTERNS.some(pattern => value.includes(pattern));
}
