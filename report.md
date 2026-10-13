# xSypher (xsypher.com) — Production Audit Report

**Audit Date:** 13 October 2026 | **Auditor:** Principal Website Audit (Arena Agent Mode) | **Scope:** Technical SEO · Content/E-E-A-T · Schema · AEO · GEO · Performance/CWV · Backend & Code · Security · Accessibility/UX · Editor/CMS · Analytics/Monitoring · Screenshot module

**Target:** `https://xsypher.com` · **Repo:** `github.com/anwariqbaldawar/xCipher` (full source access) · **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind + Drizzle/Postgres + NextAuth v5 + TipTap editor + Cloudflare R2 · **Deploy:** Oracle Cloud VPS (Docker, ARM64) behind Cloudflare (owner-confirmed) · **Monetization:** AdSense (owner-confirmed) · **Access:** server logs/admin panel available (GSC/analytics: not provided)

**Methodology:** Evidence-first. Har finding ke saath proof (live fetch output, file:line, command result). Confidence labels: `[Verified]` (khud test kiya) / `[Likely]` (strong indicators) / `[Hypothesis]` (data chahiye). Bina proof koi claim nahi. Tool limitations appendix mein saaf likhi hain. Audit **read-only** raha — koi production/code change nahi; fixes alag `fixes/` folder mein approval ke liye.

**Methodology note (tooling):** Audit sandbox se direct `curl`/Lighthouse xsypher.com par egress-policy se blocked tha; live checks `fetch_page` (rendered content + HTTP status), DNS-over-HTTPS (TXT records), aur web search se hue. Header dumps, TLS scan, CWV lab/field = "Not verified — access required" (Section 12.2).

---

## 1. Cover

| | |
|---|---|
| **Site** | xSypher — Independent Technology News, Analysis and Reviews |
| **URL** | https://xsypher.com (www → apex 308 ✓) |
| **Audit window** | 13 Oct 2026, ~01:10–02:10 UTC |
| **Corpus status** | 5 published articles, ~18 static pages, 8 categories (kuch khaali) |
| **Overall health** | **62/100 — "Theek hai, lekin do pipeline tooti hui hain"** (indexation sitemap + measurement/analytics) |

### Overall Score Gauge

```
Overall Score: 62 / 100 (Weighted; 2 of 10 categories Partial)
 ██████████████████████████░░░░░░░░░░░░░░░░  62%
```

---

## 2. Executive Summary (non-technical owner ke liye)

Aapki site **technical foundation kaafi mazboot** hai — modern stack, achhi security hygiene (557/557 tests pass, prod dependencies 0 vulnerabilities, login par rate-limiting + 2FA), complete trust pages, aur strong structured data. Lekin **do critical pipelines tooti hui hain** jo directly traffic aur revenue ko nuksan pohancha rahi hain.

**Sab se bari 5 khatray:**
1. **Public repo mein live API key exposed** (`sk-7...YbQW`, `.vscode/settings.json`) — abhi revoke karein, warna koi bhi aapke quota se khel sakta hai. **[Critical]**
2. **Main sitemap khaali hai** — `pages.xml` mein zero articles/categories/tags; Google ko aapka content sitemap se mil hi nahi raha (nayi site par yeh indexing seedha thokta hai). **[Critical]**
3. **Social share images dead hain** — `/api/og` production par 500 return karta hai; aur editor ka "Meta Title/Description + SERP preview" actually publish hi nahi hota (fields render path se juda hi nahi). **[High ×2]**
4. **`ads.txt` 404** — AdSense active hai lekin yeh file nahi hai → policy warning + revenue risk. **[High]**
5. **Koi analytics nahi** — traffic/conversions/index impact kuch measure nahi ho raha; GSC access bhi nahi diya. Andhere mein decisions. **[High]**

**Sab se bari 5 opportunities:**
1. Sitemap repair (S ka fix) + crawlable pagination → indexing pipeline turant theek.
2. SEO panel ko actually wire karo (metaTitle/ogImage/canonical) → jo editors optimize karein wo SERP mein aaye.
3. Entity/GEO build (Wikipedia-Wikidata nahi, lekin directories, LinkedIn company, sameAs links, consistent tagline) → AI answers mein citation ka foundation.
4. Analytics + GSC + Bing verify → har future fix ka impact measurable.
5. Content velocity (2-3 articles/week, pillar+cluster plan Section 8) → topical authority.

**Verdict:** Fix-first maamla hai, strategy-flawed nahi. Upar wale 10 quick wins (7 din) site ko "healthy pipeline" par le aate hain; 90-din plan se authority build hogi.

> **Update (13 Oct 2026, same day):** Audit ke foran baad **quick wins implement kar diye gaye** — 13 commits (Section 12.7). 21 findings `fix-applied` hain, 2 partial, 1 deferred (paginated crawlability — staging test chahiye). Ab bacha hua kaam: owner actions (key revoke, real pub ID, Bing token, DMARC, monitor, analytics account) + GSC/PSI screenshots jo metrics-based re-score unlock karein.

---

## 3. Scorecard

| Category | Weight | Score | Status | Justification |
|---|---:|---:|---|---|
| Technical SEO & Indexing | 15% | **55** | Scored | Canonicals/noindex/News-sitemap/SSR strong, lekin main sitemap broken + OG 500 + non-crawlable pagination. |
| Content & E-E-A-T | 10% | **62** | Scored | Trust pages complete, original data-rich articles; corpus sirf 5, brand messaging inconsistent. |
| Structured Data | 5% | **78** | Scored | WebSite+Organization+NewsArticle+Breadcrumb+Person+FAQ/HowTo — better than most; entity linkage gaps. |
| AEO | 8% | **70** | Scored | Answer-first structure + question headings + tables + FAQ/takeaway blocks; question-hub pages missing. |
| GEO | 7% | **45** | Scored | SSR clean + AI bots allowed; external entity presence zero, citation testing pending. |
| Performance & CWV | 15% | **60** | ⚠ Partial | Field/lab metrics verify nahi hue (PSI 429) — code-level review: LCP hero ✓, fonts ✓, ad CLS ✓; StoryRow sizes + bundle gaps. |
| Security | 20% | **62** | Scored | Auth/uploads/rate-limits strong, prod deps 0 vulns; lekin **exposed key (Critical)** + CSP weak spots + DMARC p=none. |
| Backend & Code Quality | 10% | **70** | Scored | tsc PASS, 557/557 tests, capability RBAC; lint failing + CI mein lint/build gate nahi + rollback nahi. |
| Accessibility & UX | 5% | **65** | ⚠ Partial | Skip-link/labels/aria/focus verified code se; axe/headless run pending. |
| Editor / CMS | 5% | **65** | Scored | Editor powerful (TipTap, revisions, workflow), lekin SEO panel ke primary fields no-op + quality gates adhoore. |

**Weighted Overall: 62/100** (partial categories ke liye code-level estimate use hua — metric-based re-score PSI/axe data aane par hoga).

---

## 4. Top 10 Quick Wins (high impact, low effort) & Top 5 Critical Risks

### Top 10 Quick Wins (sab S effort)
| # | Kaam | Finding | Impact |
|---|---|---|---|
| 1 | API key **revoke** + repo se history purge + `.gitignore` | SEC-001 | Financial/security |
| 2 | Sitemap `Promise.all` split + authors query `authorId` par | CRW-001 | Indexing |
| 3 | `public/ads.txt` banao (publisher ID ke saath) | AD-001 | Revenue |
| 4 | `generateMetadata`: `metaTitle \|\| seoTitle`, ogImage/canonical wire | TSEO-002/003 | SEO/Editor trust |
| 5 | `/api/og` 500 root-cause (log grep) + featured-image fallback | TSEO-001 | Social CTR |
| 6 | `StoryRow` fill images mein `sizes` add | PERF-001 | Mobile perf |
| 7 | robots.txt: `/invite`, `/unsubscribe` block + AI-bot policy (decision) | CRW-003, GEO-002 | Security/GEO |
| 8 | DMARC `p=quarantine` + `rua` (phir `p=reject`) | SEC-003 | Brand safety |
| 9 | Analytics (Plausible/GA4) + GSC + Bing verification | MON-001/002 | Measurement |
| 10 | CI mein lint + `next build` gate | BE-001 | Quality |

### Top 5 Critical Risks
1. **SEC-001** — Live API key public GitHub repo mein (active abuse possible).
2. **CRW-001** — Main sitemap zero content URLs par = discovery/indexing pipeline broken.
3. **TSEO-001 + TSEO-002** — og:image 500 (social dead) + editor SEO fields publish hi nahi (silent SEO failure).
4. **AD-001** — ads.txt 404 = AdSense policy/revenue risk.
5. **MON-001** — Koi analytics nahi = na traffic na impact measurement (blind operations).

---

## 5. Detailed Findings (category-wise, FINDING FORMAT)

> Machine-readable sabhi 39 findings `findings.json` mein hain. Yahan har category ka complete set:

### 5.1 Crawlability & Indexing

**CRW-001 — Main sitemap pages.xml mein zero dynamic URLs** · Severity: **Critical** · Confidence: `[Verified]`
- **Affected:** `https://xsypher.com/sitemap/pages.xml` (generator: `app/sitemap/pages.xml/route.ts:57-102`)
- **Evidence:** Do live fetches (13 Oct): sirf 19 static paths, saare `lastmod = 2026-10-01` (hardcoded fallback, route.ts:66). Sitemap index ka alag lastmod (2026-10-12T23:38) DB se aaya = DB reachable.
- **Impact:** Google/Bing ko articles/categories/tags/authors sitemap se naye milte hi nahi. Naye site (5 articles, kam backlinks) ke liye indexing speed directly suffer.
- **Root cause:** Saari 4 queries ek `Promise.all` (line 57) mein — ek fail = chup-chaap sab khaali. `[Likely]` authors query legacy `"_ArticleToAuthor"` table (line 84) use karti hai jo Drizzle schema (`lib/db/schema.ts`) mein **exist hi nahi karti**.
- **Fix:** `fixes/sitemap-pages.patch` — per-query try/catch + `Article.authorId` based authors query + alert on failure.
- **Effort:** S · **Verification:** `curl sitemap/pages.xml` → articles URLs + aaj ka lastmod → GSC Sitemaps submit.
- **References:** [sitemaps.org](https://www.sitemaps.org/) · [Google sitemaps docs](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)

**CRW-002 — Listing pagination crawlable nahi ("Load More" client-side only)** · **High** · `[Verified]`
- **Affected:** `components/article/PaginatedFeed.tsx:37-94` (/latest, /category)
- **Evidence:** Button → server action `getMoreArticles(offset)`; koi `<a href="?page=2">` nahi. `/latest` par koi page param link nahi (grep).
- **Impact:** Bots ko sirf pehle ~20 rows; CRW-001 ke saath compound = archive unreachable.
- **Fix:** Anchor links (page 2, 3…) server-rendered karo (tag page `?page=` pattern repo mein already hai). **Effort:** M · **Verification:** view-source + GSC inspection.

**CRW-003 — `/invite/*` + `/unsubscribe/*` token URLs block/noindex nahi** · **Medium** · `[Verified]`
- **Evidence:** `app/robots.ts` disallow list in; invite/unsubscribe pages par `robots` meta = 0 matches (preview page par hai ✓).
- **Impact:** Token URLs index ho sakte hain → unsubscribe/invite token leak. **Fix:** `fixes/robots.ts.patch`. **Effort:** S.

**CRW-004 — Internal links redirect par** (`/page/privacy`, `/page/editorial`) · **Low** · `[Verified]` — `NewsletterSignup.tsx:99`, `Sidebar.tsx:59` → final URLs seedha lagao. **Effort:** S.

**CRW-005 — IndexNow key fallback `'xsypher-key'`** · **Low** · `[Likely]` — `lib/google-indexing.ts:104`; `.env` mein `INDEXNOW_KEY` set karo, fallback hatao. **Effort:** S.

**CRW-006 — 404 page homepage title inherit** · **Info** · `[Verified]` — `app/not-found.tsx` mein metadata nahi; `title: 'Page not found — xSypher'` + `noindex` add karo. **Effort:** S.

**Positive (evidence):** robots.txt syntax valid + sitemap reference ✓ · `/search` blocked **aur** `noindex` ✓ (`search/page.tsx:22-26`) · self-referencing canonicals har public page ✓ · empty category/author auto-noindex ✓ · tag pagination per-page canonical ✓ · www→apex 308 (`middleware.ts:118-124` + next.config) · SSR full-content ✓ (fetch se rendered content mila) · Google News sitemap (48h, `news:news` ns) ✓ · IndexNow + Google Indexing API pings wired (`workflow.ts:554`) · historical slugs auto-redirect (`previousSlugs`) ✓.

### 5.2 Technical SEO

**TSEO-001 — `/api/og` production par 500** · **High** · `[Verified]`
- **Evidence:** `GET /api/og?title=Test` → **HTTP 500**; `GET /api/og` → **HTTP 500** (route ka catch: "Failed to generate image", `app/api/og/route.tsx:126-130`). Har article isko `og:image` banata hai (`article/[slug]/page.tsx:82-96`).
- **Impact:** Social shares par image nahi → CTR down; editor ka OG upload bhi iske peeche.
- **Root cause:** `[Hypothesis]` — server log se confirm karein: grep `'[og]'` ya `'Failed to generate image'`. Candidates: ARM64/alpine resvg native binary, satori font load, ya Redis corrupt cache.
- **Fix:** Fallback = featured image serve karo (200), phir root cause. **Effort:** M · **Verification:** `curl -I /api/og?title=t` → 200 image/png + FB Sharing Debugger.

**TSEO-002 — SEO panel ke primary fields publish hi nahi hote** · **High** · `[Verified]`
- **Evidence:** Editor `metaTitle`/`metaDescription` par counters + Google SERP Preview (`ArticleEditor.tsx:1725-1775`), save `actions/article.ts:223` — lekin live metadata: `title: article.seoTitle || article.title` (`article/[slug]/page.tsx:89-90`). Editor mein `seoTitle` ko "Legacy" label kiya gaya — fallback chains **ulti** hain. SERP preview jhoot dikhata hai.
- **Impact:** Jo meta editors likhte hain wo kabhi SERP mein nahi aata — poora SEO workflow silently ineffective.
- **Fix:** `fixes/generateMetadata-meta-fields.patch` (`metaTitle || seoTitle || title` order). **Effort:** S.

**TSEO-003 — `ogImage` + `canonicalUrl` fields bhi no-op** · **Medium** · `[Verified]`
- **Evidence:** Editor OG upload UI text: "featured image is used" — render par hamesha `/api/og` (`page.tsx:86`), `ogImage` grep = 0. `canonicalUrl` save (`actions/article.ts:227`) lekin canonical hamesha self (`page.tsx:92`).
- **Fix:** `image: article.ogImage || ogUrl` (fallback chain), `canonical: article.canonicalUrl || self` (URL validate karke). **Effort:** S.

**TSEO-004 (delegated to CON-002)** — brand naming inconsistency.

**Positives:** `<title>` templates + OG/Twitter cards code ✓ · favicon/icon.svg/apple-icon ✓ · `lang="en"` ✓ · clean URL patterns (`/article|/category|/author|/page`) ✓ · no date-in-URLs ✓ · hreflang N/A (single language) ✓ · mobile viewport default Next ✓.

### 5.3 Content Quality & E-E-A-T

**CON-001 — Corpus sirf 5 articles** · **Medium** · `[Verified]` — feed.xml (limit 20) = 5 items; kuch categories khaali (defensive noindex code mein ✓). Topical authority + cluster coverage abhi shuru nahi. Plan: Section 8. **Effort:** L.

**CON-002 — Brand messaging 3 jagah inconsistent** · **Medium** · `[Verified]` — `<title>` "Independent Technology News…" vs RSS "Advanced Tech & Security Insights" vs About H1 "Decoding the Future of Technology". Ek tagline lock karo. **Effort:** S.

**CON-003 — Author/About polish issues** · **Low** · `[Verified]` — typo "Software & Web Developmen", PGP "Not Available" block, public "36 total reads" (inverted social proof), About par generic `https://github.com/` link. **Effort:** S.

**CON-004 — Author page ISR staleness** · **Low** · `[Likely]` — author page "1 published" vs homepage/RSS 2 articles (revalidate 600s + publish par revalidatePath nahi). `revalidatePath('/author/'+slug)` publish action mein add karo. **Effort:** S.

**E-E-A-T strengths (evidence):** Trust pages complete (`/page/privacy-policy`, `terms-of-use`, `cookie-policy`, `disclaimer`, `editorial-policy`, `editorial-standards`, `corrections`, `transparency`, `accessibility` — sab sitemap mein) ✓ · team bios + credentials + socials ✓ · editorial review workflow (`reviewedAt/approvedAt` + admin review UI) ✓ · affiliate block auto `rel="sponsored noopener noreferrer"` ✓ · articles mein original data/tables/decision-frameworks (information gain ✓) · answer-first opening paragraphs (AEO ✓).

**Note:** About page ka "140+ Countries Reached" claim — analytics se back karo ya hatao (abhi analytics hai hi nahi → unverifiable claim). `[Verified from render]`

### 5.4 Structured Data (Schema)

**Inventory (code-level `[Verified]`):** `WebSite + SearchAction` (root layout) · `Organization @id/#organization + logo + sameAs` (public layout, har page) · `NewsArticle` → `TechArticle` conversion + `FAQPage/HowTo/Review/Product` graph editorial blocks se (`lib/article-schema.ts`) · `BreadcrumbList` (articles) · `Person + sameAs` (authors) · microdata `itemScope` fallback on article.

**SCH-001 — Entity linkage gaps** · **Low** · `[Verified]` — `NewsArticle.publisher` inline Organization (bina `@id` link), `Organization.sameAs` sirf X (GitHub/LinkedIn About page par hain schema mein nahi), category/tag pages par `BreadcrumbList` nahi. Fix: `publisher: {'@id': url+'/#organization'}` + sameAs + breadcrumbs. **Effort:** S.

**SCH-002 — FAQ/HowTo/SearchAction rich results deprecated** · **Info** · `[Verified]` (guidelines) — FAQ rich results restricted (2023), HowTo removed for most (Sep 2023), sitelinks searchbox retired (2024). **Schema rakho — semantic/AEO value hai; rich-result guarantee mat maano.**

**Verification plan:** Fix ke baad [Rich Results Test](https://search.google.com/test/rich-results) + Schema.org validator on 1 article + 1 category.

### 5.5 AEO (Answer Engine Optimization)

**Structure audit (sampled):** Opening paragraph = 60-90 word direct answer `[Verified — live article]` ✓ · question-style H3s ("Questions estate managers ask…", "Can a device skip Year 1…") ✓ · tables (cost comparison) ✓ · bold key numbers ✓ · editor blocks: FAQ (auto FAQPage schema), Key Takeaway callout, TOC, comparison, pros/cons, spec-sheet, score-breakdown, howto ✓ (`lib/editorial-blocks.ts`).

**Gaps:**
1. **No question-hub/PAA-target pages** (e.g., `/guide/windows-10-esu`, glossary, "vs" hubs) — corpus ki wajah se. `[Hypothesis vs competitors]`
2. Definition/quick-answer boxes article-level hain, **hub-level nahi**.
3. SERP/PAA ownership ka koi tracking nahi (GSC queries access chahiye).

**Action:** Section 8 ke top 30 questions — har cluster ka ek hub page; existing articles ko question-H2 se enrich karo.

### 5.6 GEO (Generative Engine Optimization)

**GEO-002 — AI crawler policy** · **Info** · `[Verified]` live robots.txt `User-Agent: * Allow: /` → **sab AI bots allowed**. 2026 official token list (web-verified): `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot`, `Applebot-Extended`, `CCBot`, `Bytespider`, `meta-externalagent/fetcher`, `Amazonbot`.
- **Training vs search:** retrieval/search bots (OAI-SearchBot, PerplexityBot, Claude-SearchBot, ChatGPT-User, Claude-User) **allow rakho** — yeh GEO visibility dete hain. Training bots (GPTBot, ClaudeBot, CCBot, Google-Extended, Bytespider, meta-externalagent, Applebot-Extended) **aapka business decision** — dono options `fixes/` mein. Cloudflare WAF bot rules bhi check karwana (screenshots pending) — CDN par accidental block code ke through nahi dikhega.

**GEO-001 — Entity presence zero** · **Medium** · `[Verified]` — brand search: sirf founder ka GitHub. Wikipedia/Wikidata/directories/reviews/koi mention nahi. Plan Section 6.3.

**GEO-003 — llms.txt absent** · **Info** · `[Experimental]` — emerging convention, major engines ke liye proven impact nahi. Optional template `fixes/llms.txt`.

**GEO-004 — AI citation test pending** · `[Hypothesis]` — interactive engines access se bahar; 15-query manual protocol Section 6.4 (screenshots bhejein → SS module).

**Citation-worthiness (code `[Verified]`):** SSR clean semantic HTML ✓ (AI crawlers JS execute nahi karte — aapka site plain fetch se full content deta hai) · original statistics/quotable statements ✓ · author attribution ✓ · TTFB/ISR caching designed ✓ (metrics pending) · content interactions ke peeche nahi (sirf "Load More" progressive ✓).

### 5.7 Performance & Core Web Vitals

> **PERF-003 [High|Hypothesis] — CWV lab+field NOT verified** (PSI API 429 quota; sandbox Lighthouse blocked). Koi metric guess nahi kiya gaya. Baseline ke liye Section 12.1 ka screenshot list bhejein.

**Code-level audit (Verified from code):**
| Signal | Status | Evidence |
|---|---|---|
| LCP hero image priority + sizes | ✅ | `article/[slug]/page.tsx:259-260`, `page.tsx:156-157` |
| AVIF/WebP formats | ✅ | `next.config.ts images.formats` |
| Fonts self-hosted + `display:swap` | ✅ | `app/layout.tsx` (4 fonts), `app/fonts/` |
| Immutable asset caching | ✅ | `/_next/static` → `max-age=31536000, immutable` |
| Ad slots CLS reservation | ✅ | `globals.css:1132-1162` min-height per size |
| Code splitting (mermaid/charts/hljs) | ✅ | `ArticleBody.tsx:9-11` dynamic |
| **StoryRow `fill` bina `sizes`** | ❌ PERF-001 | `StoryRow.tsx:58-65` → 100vw default; category feat `:127` |
| **EditorialBlockViewer static (react-tweet)** | ❌ PERF-002 | `ArticleBody.tsx:12` vs dynamic neighbors |
| ISR/force-static | ✅ | article `revalidate 3600` + `force-static`; latest `force-static` |
| Cloudflare HTML cache rules | ❓ not verified | CF dashboard screenshots chahiye |
| ISR miss → R2 fetch TTFB | `[Likely]` risk | `fetchFromR2` per cold render |

**Estimates (label: estimate):** `sizes` fix listing pages par ~100–400KB/page mobile bacha sakta hai; `EditorialBlockViewer` dynamic se article first-load JS ~50–150KB (gzip) kam ho sakta hai — dono ko PSI se verify karna.

### 5.8 Backend & Code Review

| Check | Result | Evidence |
|---|---|---|
| TypeScript | ✅ PASS | `npx tsc --noEmit` exit 0 |
| Unit tests | ✅ 557/557 (47 files) | `npm test` exit 0 |
| ESLint | ❌ 351 errors/100 warnings | BE-001 (285 `no-explicit-any`, 91 unused vars…) |
| CI gates | ⚠ tsc+test+prod-audit; **lint/build gate nahi** | `.github/workflows/deploy.yml` |
| Prod dependencies | ✅ 0 vulnerabilities | `npm audit --omit=dev` |
| Dev dependencies | ⚠ 33 (3 critical — vitest UI) | BE-004 |
| Deploy safety | ⚠ no health-gate/rollback; host `npm install`; `--no-cache` builds | BE-002 |
| Proxy health coupling | ⚠ Caddy `health_uri /api/health` = 503 on Redis degrade → site-wide 502 risk | BE-007 |
| Migrations | ⚠ dual-path `migrate.mjs` + `drizzle/` | BE-003 |
| RBAC/authz | ✅ Capability layer (`lib/capabilities.ts`), `buildArticleScope` | AGENTS + code |
| Health/observability | ✅ `/api/health` (DB+Redis, 503 degrades), Sentry wired (10% trace sampling) | `app/api/health`, `sentry.server.config.ts` |
| Error handling | ✅ actions structured errors, no stack traces to users (sampled) | actions/*.ts |
| DB design | ✅ GIN FTS index, status/published composite indexes; search ILIKE risk INFO | `schema.ts`, BE-006 |

### 5.9 Security (OWASP mindset)

**SEC-001 — API key public repo mein** · **Critical** · `[Verified]` — details upar (Section 4). **Rahi turant.**

**SEC-002 — CSP weak on static public pages** · **Medium** · `[Verified]` — `middleware.ts:40-42` `script-src 'self' 'unsafe-inline'` (nonce sirf dynamic/admin par); `connect-src 'self' https:` bahut broad (`:56`). Draft: `fixes/csp-draft.txt`.

**SEC-003 — DMARC p=none, SPF ~all** · **Medium** · `[Verified via DoH]` — `v=DMARC1; p=none;` + SPF `~all`; DKIM (`resend._domainkey`) ✓ present. Upgrade path Section 4/#8.

**SEC-004 — Password min-8 + deactivated-account error distinct** · **Low** · `[Verified]` — `password-reset.ts:65`, `auth.ts:81`.

**BE-005 — Sentry DSN hardcoded fallback** · **Info** · `[Verified]` — env-only karo.

**Security strengths (Verified from code):**
- **Auth:** NextAuth v5 JWT, `__Secure-` cookie prefix + `HttpOnly + SameSite=Lax + Secure` (`auth.config.ts:47-68`), IP+email+2FA rate limits (20/5/5 per 15min), uniform errors, bcrypt 12 rounds, TOTP + backup codes.
- **Uploads:** auth + capability + rate-limit + MIME sniff + **sharp re-encode to WebP** (polyglot killer) + pixel limits + **SVG deliberately excluded** (`upload-constraints.ts:22-33`).
- **Headers (code):** HSTS `max-age=31536000; includeSubDomains; preload`, `X-Frame-Options: DENY` + `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo/cohort/topics off) — `middleware.ts:60-70`.
- **Secrets:** koi `.env` tracked nahi, DB creds pattern-scan clean (sirf SEC-001 mili).
- **Infra:** web container `127.0.0.1` only, Redis password + no public port, non-root Docker, resource limits, admin apex se `admin.xsypher.com` par redirect + middleware auth guard, admin/preview hosts par `X-Robots-Tag: noindex`.
- **CORS:** fixed origin `https://admin.xsypher.com` (koi `*` nahi).

**Not verified (access chahiye):** TLS config (testssl/SSL Labs blocked), live header dump, HSTS preload list submission status, Cloudflare WAF/bot rules, session maxAge value, GraphQL (n/a — REST/actions only).

### 5.10 Accessibility, UX & Trust

**AX-001 — WCAG 2.2 AA full run pending** · **Medium** · `[Hypothesis]` — axe/headless unavailable. Code signals: skip-link ✓ (`public/layout:32-34`), form labels ✓, `aria-live` ✓, focus-visible ✓, motion-reduce ✓, alt fallback ✓, tap-target/contrast rendered-test chahiye.

**UX positives:** custom 404 (design + links) ✓, breadcrumbs on articles ✓, TOC ✓, newsletter consent-gated ✓, dark mode (next-themes) ✓, sticky/interstitial: code mein koi intrusive popup nahi (ad slots fixed min-height) — rendered check pending.

**Trust pages:** complete set ✓ (Section 5.3). `security.txt` live ✓ (contact+privacy+expires).

### 5.11 Editor / CMS Audit (Section 11 Matrix)

Legend: **P** = Present · **PA** = Partial · **M** = Missing · **N/A**

| # | Feature | Status | Evidence / Priority |
|---|---|---|---|
| **A** | **Writing experience** | | |
| A1 | Block editor (TipTap) + Markdown mode | **P** | TipTap starter + `tiptap-markdown` (import/export) |
| A2 | Autosave | **P** | debounce + in-flight race guard (`ArticleEditor:837-841`) |
| A3 | Draft/schedule/publish workflow | **P** | statuses + `scheduleArticle` (`workflow.ts:589`) |
| A4 | Live preview (desktop+mobile) | **PA** | Preview button + `preview.xsypher.com`; mobile-viewport preview missing |
| A5 | Revision history + restore | **P** | `articleRevision` + `restoreRevision` (`article.ts:486`) |
| A6 | Undo/redo + shortcuts | **P** | TipTap defaults |
| A7 | Word/reading-time count | **P** | CharacterCount extension |
| A8 | Distraction-free mode | **M** | Low priority — `M` |
| **B** | **Tech-content blocks** | | |
| B1 | Code blocks (lang select + copy) | **P** | code-block-lowlight + copy buttons (`ArticleBody` effect) + filename? **PA** (filename label/line numbers: `PA`) |
| B2 | Inline code / tables | **P** | starter-kit + table ext |
| B3 | Callouts (note/warning/tip…) | **P** | 7 types (`Callout.ts:7`) |
| B4 | Comparison/specs, pros/cons, steps, FAQ, TL;DR | **P** | editorial-blocks + takeaway callout + howto |
| B5 | Embeds (YouTube/GitHub/X/TikTok) | **PA** | Tweet + TikTok + social blocks; YouTube/GitHub embed path check karo |
| B6 | Gallery, collapsible sections, TOC auto | **P/PA** | gallery ✓, TOC ✓, collapsible `PA` |
| B7 | Changelog/"Last updated" | **PA** | `updatedAt` auto + update callout; visible "last updated" on page? `PA` |
| **C** | **SEO panel** | | |
| C1 | SEO title + desc w/ counters | **P (broken)** | counters+preview hain **lekin publish nahi hota → TSEO-002 (High)** |
| C2 | SERP preview | **P (lying)** | preview `metaTitle` se, site `seoTitle` se |
| C3 | Focus keyword + related entities | **PA** | field exists, koi scoring/analysis nahi |
| C4 | Slug control | **P** | auto-slugify + manual lock + `previousSlugs` auto-redirect |
| C5 | Canonical override | **M (no-op)** | field save, render nahi → TSEO-003 |
| C6 | Robots index/noindex toggle (per article) | **M** | sirf auto-rules; manual toggle missing → Priority M |
| C7 | OG/Twitter preview | **PA** | OG image upload exists (no-op → TSEO-003); preview component hai |
| C8 | Schema type selector | **PA** | auto (NewsArticle/TechArticle/FAQ/HowTo); manual selector nahi |
| C9 | Breadcrumb control | **M** | auto only |
| C10 | Internal link suggestions / broken link checker | **M** | Priority M |
| C11 | Heading-hierarchy validator (single H1) | **M** | Priority S |
| C12 | Readability score | **M** | Priority M |
| C13 | Duplicate/cannibalization warning | **M** | Priority L (DB check easy) |
| C14 | Redirect manager (manual 301) | **PA** | slug changes auto (`previousSlugs`) ✓; arbitrary URL redirects nahi |
| **D** | **AEO/GEO helpers** | | |
| D1 | Question-heading suggestions | **M** | |
| D2 | "Direct answer" field/first-para guidance | **PA** | editorial guidelines + takeaway; dedicated field `M` |
| D3 | FAQ schema generation | **P** | faq-block → FAQPage (`article-schema.ts`) |
| D4 | Source/citation fields | **M** | Priority M (journalism credibility) |
| D5 | Author-expert attribution | **P** | byline + authorModel + Person schema |
| D6 | Entity tagging | **PA** | tags/categories exist; entity (Wikidata-style) fields `M` |
| D7 | Freshness reminders | **PA** | updatedAt; stale-content reminder `M` |
| **E** | **Media** | | |
| E1 | Media library | **P** | `/admin/media` |
| E2 | Auto compression + WebP | **P** | sharp re-encode (`upload/route.ts:24-40`) |
| E3 | Mandatory alt | **PA** | field exists, optional (`featuredImageAlt`) → gate CMS-001 |
| E4 | Required width/height | **P** | sharp metadata enforced |
| E5 | Focal-point crop | **P** | `react-easy-crop` dep + crop UI |
| E6 | Featured image requirement | **PA** | not enforced on publish |
| E7 | Safe SVG | **P (by exclusion)** | SVG upload disabled deliberately ✓ |
| E8 | Alt/caption/credit fields | **P** | `featuredImageCaption/Credit` |
| E9 | Copyright/source field | **PA** | credit field; license field `M` |
| **F** | **Editorial / E-E-A-T** | | |
| F1 | Author profile (bio, credentials, socials) | **P** | Author table: bio/expertise/socialLinks/verifiedTitle |
| F2 | Reviewer field | **P** | `reviewedById` + ReviewWorkspace decisions |
| F3 | Byline | **P** | byline components + personas |
| F4 | Published + modified dates (separate) | **P** | `publishedAt`/`updatedAt` (NewsArticle datePublished/Modified) |
| F5 | Sources list | **M** | Priority M |
| F6 | Affiliate/sponsored/AI disclosure toggles | **PA** | affiliate block w/ disclosure ✓; sponsored post + "AI-assisted" global toggles `M` |
| F7 | Correction/update notes | **P** | `/page/corrections` + update/editor-note callouts |
| F8 | Pre-publish validation gate | **PA** | title/deck/50-words only → CMS-001 |
| **G** | **Taxonomy & organization** | | |
| G1 | Categories/tags w/ SEO control | **P** | slugs + descriptions + parent/child |
| G2 | Topic clusters/pillar support | **PA** | categories exist; explicit cluster mapping `M` |
| G3 | Related posts logic | **P** | `getArticleRecommendations` |
| G4 | Series support | **P** | `/series` + series field |
| G5 | Content calendar/status board | **PA** | dashboard + scheduledFor; visual calendar `M` |
| G6 | Bulk edit | **M** | |
| G7 | Content inventory + performance data | **PA** | views in admin; GSC data join `M` (analytics pehle MON-001) |
| **H** | **Roles & editor security** | | |
| H1 | RBAC | **P** | capability layer + role hierarchy (`capabilities.ts`) |
| H2 | 2FA | **P** | TOTP + backup codes + rate limits |
| H3 | Audit log | **P** | `AuditLog` + `/admin/audit-logs` |
| H4 | HTML sanitization (XSS-safe) | **P** | DOMPurify + sanitize-html allowlists (`lib/sanitize.ts`) |
| H5 | Safe embeds | **P/PA** | embeds allowlisted; broad `PA` |
| H6 | Upload restrictions | **P** | MIME allowlist + re-encode |
| H7 | Session timeout | **PA** | JWT config default (maxAge explicit nahi) → confirm |
| H8 | IP/device alerts | **M** | |
| H9 | Expiring draft preview tokens | **PA** | preview subdomain auth-based (token nahi) — expiry N/A; risk low |
| **I** | **Publishing automation** | | |
| I1 | Sitemap auto-update | **PA** | 1h revalidate ✓ lekin current sitemap broken → CRW-001 |
| I2 | IndexNow + Google ping | **P** | `enqueueGoogleIndexing` on publish (`workflow.ts:554`) |
| I3 | Social auto-share | **M** | |
| I4 | RSS/Atom quality | **P** | `feed.xml` guid/pubDate/author ✓ (title inconsistency CON-002) |
| I5 | Cache purge on publish | **P** | `revalidatePath/Tag` in workflow |
| I6 | Canonical/OG regen | **PA** | dynamic metadata ✓; OG generator broken → TSEO-001 |
| I7 | Scheduled republish/refresh workflow | **PA** | schedule publish ✓; "refresh old post" flow `M` |
| **J** | **Monetization controls** | | |
| J1 | Ad slot placement controls | **PA** | locations exist; sab ek hi slot (AD-002) |
| J2 | ads.txt management | **M** | **404 → AD-001 (High)** |
| J3 | Affiliate link manager + auto sponsored | **P** | affiliate block auto `rel="sponsored"` ✓ |
| J4 | Disclosure auto-insert | **PA** | block-level disclosure; site-wide disclosure banner `PA` |
| **K** | **Quality gates** | | |
| K1 | Broken link check | **M** | |
| K2 | Missing alt gate | **M** | → CMS-001 |
| K3 | Missing meta gate | **M** | (aur meta publish hi nahi hota → TSEO-002) |
| K4 | Thin content warning | **PA** | 50-word minimum only |
| K5 | Duplicate title warning | **M** | |
| K6 | Readability | **M** | |
| K7 | Plagiarism | **M** | (external service lagana parega) |
| K8 | Accessibility check | **M** | |

**Build priority (editor):** P1 = wire existing fields (C1/C2/C5/C7 → TSEO-002/003 fixes, sirf code wiring) · P2 = gates K2/K3/K4 + C6 noindex toggle + B1 filename/line-numbers · P3 = C10/C11/C12 + D1/D4 · P4 = rest.

### 5.12 Analytics, Monitoring & Operations

- **MON-001 (High):** Analytics **bilkul nahi** (code grep + layout). Policies mein "Google Analytics/Plausible" ka zikr bhi inaccurate. Fix Section 4/#9.
- **MON-002 (Low):** Bing Webmaster verification missing (IndexNow pings ✓, verification tag ✗). **Ab:** `public/BingSiteAuth.xml` file-method ready hai (env/meta path is Docker setup mein kaam nahi karta — neeche §12.7 note dekhein).
- **MON-003 (Low):** `/api/health` ready; external monitor configure unknown → BetterStack/UptimeRobot + alerting.
- **Backups:** DB managed (Neon/Supabase assumption — managed snapshots) + R2 versioning unknown `[Not verified]`; deploy rollback nahi (BE-002).
- **KPI dashboard (recommend):** GSC (impressions/clicks/queries) + PSI field (CWV) + Plausible/GA4 (engagement) + AdSense RPM + uptime — Section 11 monitoring plan.

---

## 6. Competitor Gap Analysis (SEO + AEO + GEO)

> **Auto-detect note:** aapne competitor list nahi di; niche ("independent tech news, analysis, reviews") ke basis par ye 5 select kiye. Koi bhi number/metric guess nahi — qualitative gap analysis `[Likely/Hypothesis]`, live SERP/AI tests pending (GEO-004).

| # | Competitor | Why (overlap) | SEO/AEO edge over xSypher | GEO edge |
|---|---|---|---|---|
| 1 | **BleepingComputer** | Cybersecurity news, high publish rate | Massive topical depth, E-E-A-T (cited by Google), schema everywhere | Frequently cited by AI answers for security queries |
| 2 | **The Hacker News** | Security analysis, newsletters | Domain authority, original reporting links, fast news cycle | Strong entity presence, cited in AI security answers |
| 3 | **TechCrunch** | Tech news/reviews, funding | Scale + news sitemap + author pages with credentials | Wikipedia-level entity, universal AI citation |
| 4 | **Ars Technica** | Deep technical analysis (aapke articles ka tone closest) | Evergreen guides, hub/cluster structure, community | High citation-worthiness (original testing/data) |
| 5 | **ProPakistani (tech section)** | PK/IN audience geo-overlap | Local SEO + Urdu/English mix + local backlinks | Regional AI answers mein local sources |

**Gaps jo abhi hain (evidence-based):**
1. **Scale/trust:** inke paas thousands of articles + external mentions; aapke paas 5 + 0 mentions (GEO-001). → Wo har AI answer mein isi liye cite hote hain.
2. **Structure:** inke paas evergreen hubs (Ars "deals", THN "breaking") — aapke paas hubs nahi (AEO gap). Lekin **article-level structure aapka unse competitive hai** (answer-first + tables) — sirf distribution/authority missing.
3. **News cycle:** News sitemap ✓ hai lekin publish velocity 5 articles/maheene se match nahi hoti (CON-001).
4. **Entity:** unke paas Wikipedia/KB/panels; aapke paas sirf GitHub (GEO-001).

**Winning plan (asymmetric):** unke against scale se nahi — **depth-per-topic** se: har cluster mein 1 definitive guide (2000+ words, original data, benchmarks) jo AI engines ko cite karna pare.

---

## 7. Editor/CMS Checklist Matrix

Section 5.11 ka full matrix (A–K, 90+ items) — wahi authoritative list hai. Summary: **P: 38 · PA: 26 · M: 24** (counts approx). P1 priorities: SEO field wiring, ads.txt, quality gates.

---

## 8. Keyword / Topic Opportunity Map (Top 30 Questions + Clusters)

> Method: site ke existing categories + articles + tech-news intent se derive kiya (GSC query data aane par re-rank hoga `[Not verified — access required]`). Har cluster = 1 pillar + 4-8 spokes.

**Cluster 1 — Windows/Enterprise (existing pillar: ESU article)**
1. Windows 10 ESU Year 2 cost per device? 2. Can you skip Year 1 ESU? 3. ESU vs Windows 11 upgrade cost? 4. Windows 11 TPM 2.0 requirements explained? 5. Windows 10 end-of-life what happens now?

**Cluster 2 — AI running locally (existing pillar: Local AI vs Cloud)**
6. Local AI vs cloud AI cost comparison? 7. Best LLM for 16GB RAM? 8. Ollama vs cloud API privacy? 9. When does local AI make sense for business? 10. AI inference cost per token explained?

**Cluster 3 — Security ops buying (existing: EDR/MDR, CRA)**
11. EDR vs MDR vs XDR difference? 12. MDR pricing per seat? 13. What is CRA Article 14 reporting? 14. PSIRT runbook 24-hour exploited vuln process? 15. EU Cyber Resilience Act who must comply?

**Cluster 4 — AI support/CS automation (existing: support agents pricing)**
16. How much does an AI support agent cost? 17. Fin vs Zendesk AI pricing? 18. AI chatbot vs human support quality? 19. Help Scout vs Freshdesk small teams? 20. When AI support tickets automation fails?

**Cluster 5 — Evergreen tech fundamentals (naye — hub opportunities)**
21. What is CSP in web security? 22. How does ISR work in Next.js? 23. PostgreSQL full-text search vs dedicated engine? 24. What is edge caching and TTFB? 25. Docker security best practices 2026? 26. What is prompt injection? 27. How to read a CVE score? 28. Zero trust architecture explained? 29. WebAuthn/passkeys vs passwords? 30. What is supply-chain attack (npm)? 

**Format rule (AEO):** har spoke ka pehla paragraph = 40-60 word direct answer; H2 = question; table ya list jahan applicable; pillar page internal links sab spokes ko (hub/spoke).

---

## 9. Impact vs Effort Matrix (2×2)

```
                    HIGH IMPACT
                        │
     QUICK WINS         │        BIG BETS
  (do pehle)            │   (schedule karo)
 • SEC-001 key revoke   │ • Content velocity (CON-001)
 • CRW-001 sitemap fix  │ • GEO entity build (GEO-001)
 • AD-001 ads.txt       │ • Editor quality gates (CMS-001)
 • TSEO-002/003 wiring  │ • Crawlable pagination (CRW-002)
 • MON-001 analytics    │ • CSP hardening (SEC-002)
 • TSEO-001 og fallback │ • BE-002 deploy gates
LOW EFFORT ─────────────┼──────────────── HIGH EFFORT
 • CRW-003/004/005/006  │ • CMP/TCF for EEA (AD-002)
 • CON-002/003 polish   │ • Search index (BE-006) >1k
 • PERF-001/002 sizes   │ • Manual redirect manager
 • SEC-003 DMARC        │ • Social auto-share
     FILL-INS           │        EXPLORATORY
                        │
                    LOW IMPACT
```

---

## 10. Roadmap

### 7-din (Quick wins — sab S effort, ~2 dev-din total)
| Day | Kaam | Owner |
|---|---|---|
| D1 | **SEC-001:** key revoke + git history purge + .gitignore; GitHub secret scanning on | Owner |
| D1 | AD-001 ads.txt (`pub-XXXX` se replace) | Dev |
| D2 | CRW-001 sitemap patch (fixes/sitemap-pages.patch) + deploy + GSC submit | Dev |
| D2 | TSEO-002/003 metadata wiring patch | Dev |
| D3 | TSEO-001: og 500 log-grep → fix/fallback | Dev |
| D4 | CRW-003 robots add + GEO-002 decision (robots option apply) | Owner+Dev |
| D5 | MON-001 analytics install + GSC/Bing verify (MON-002: `public/BingSiteAuth.xml` mein token paste) | Owner+Dev |
| D5 | PERF-001 sizes fix | Dev |
| D6 | SEC-003 DMARC quarantine + rua | Owner |
| D7 | BE-001 CI lint+build gate; CON-002/003 polish pass | Dev |

### 30-din (Pipeline + measurement)
- CRW-002 crawlable pagination (page links) — Dev M
- MON-001→ KPI dashboard (GSC+Plausible+AdSense+uptime MON-003) — Owner
- PERF baseline: PSI/GSC screenshots bhejo → main re-score karunga; PERF-002 dynamic import
- CMS-001 gates P1 (alt/meta/desc required on publish)
- BE-002 deploy health-gate + rollback + `npm ci` on host
- SEC-002 CSP draft apply (staging/perm ke saath) + BE-004 dev-dep upgrades
- Content: 8-10 naye articles (Clusters 1-4 spokes)

### 60-din (Authority)
- Cluster 5 pillar + spokes (5-6 evergreen guides, original data)
- GEO-001: Wikidata item, LinkedIn company page, directories (Product Hunt/HN/IndieHackers), sameAs expansion (SCH-001)
- GEO-004: AI citation test round 1 (15 queries) → gap report
- Editor P2 gates (C11 heading validator, C6 noindex toggle, K5 duplicate title)
- Session timeout explicit (H7), social auto-share (I3)

### 90-din (Compound)
- Content: 25-30 articles total, har cluster ka pillar complete; category pages ≥8 articles
- AI citation re-test round 2 + measure share vs 5 competitors (Section 6)
- AdSense optimization: per-slot units (AD-002), RPM experiments
- Backups/DR documented (R2 versioning + DB PITR verify), incident runbook
- Re-audit (full score re-baseline) + GSC trend review

---

## 11. Monitoring Plan

| Kya | Kahan | Kitni dafa |
|---|---|---|
| Index coverage (Crawled-not indexed reasons) | GSC → Pages | Weekly (nayi site: har publish ke baad) |
| Sitemaps status + discovered URLs | GSC → Sitemaps | Har deploy ke baad + weekly |
| Core Web Vitals (field) | GSC → CWV + PSI | 2-week interval |
| Query/page performance (CTR, position) | GSC → Performance | Weekly |
| AI citations (15 queries) | ChatGPT/Perplexity/AI Overviews | Monthly (Section 6.4 protocol) |
| Uptime + TTFB | BetterStack → `/api/health` | Continuous (30s) |
| Error rates | Sentry (aapke paas access hai) | Daily glance + alert on spike |
| ads.txt + AdSense policy | AdSense → Sites/Policy | Weekly |
| Dependency vulns | `npm audit` (CI mein hai ✓) + renovate | Weekly auto |
| DMARC reports | rua inbox | Weekly first month, then monthly |
| Security headers regression | CI: `curl -I` smoke test on deploy | Every deploy |

**KPIs (30 din ke baad):** GSC impressions ↑, indexed pages = sitemap URLs, CWV "Good" % ≥ 75, ad sessions RPM, uptime 99.9%, AI citation share (0 → measurable).

---

## 12. Appendix

### 12.1 Screenshot Analysis Module — abhi tak received: NONE
Koi screenshot is session mein nahi aaya (koi SS-ID nahi bana). Upar wale "access required" items jaldi se jaldi cover karne ke liye **ye bhejein** (SS-01 se catalog banunga, Section 13.4 format mein analysis):
1. **GSC → Pages (indexing reasons list)** + Sitemaps tab + CWV (mobile/desktop) + Performance (3-6 months)
2. **PSI:** home + ek article — mobile & desktop, Opportunities/Diagnostics ke saath
3. **DevTools:** article page Console + Network (size/time sort) + Lighthouse tab
4. **Full-page screenshots:** home, article, category, search, 404 (mobile+desktop)
5. **Editor:** article edit → SEO panel, media upload, roles page
6. **Cloudflare dashboard:** SSL/TLS mode, cache rules, WAF/bot settings, DNS records page
7. **Server logs:** `/api/og` 500 wali log line (`grep -E '\[og\]|Failed to generate image'`) + sitemap warn line (`grep 'Failed to fetch dynamic entries'`)
8. **Analytics/AdSense:** Policy Center + ads.txt status (jab setup ho)
9. **SERP/AI answers:** Section 6.4 ki 15 queries ke results (ChatGPT/Perplexity/AI Overview screenshots)

Protocol: har screenshot par type/page/device/date; sensitive data blur karke (SS-13.2 rules). Mera analysis: quick triage (5-8 line) → full findings (location + severity + root cause + fix + verification).

### 12.2 "Not verified — access required" (complete list)
| Item | Kya chahiye |
|---|---|
| CWV lab+field (LCP/INP/CLS/TTFB numbers) | PSI/GSC screenshots ya API key |
| Live response headers (CSP/HSTS/Cache verbatim) | DevTools Network screenshot ya curl server se |
| TLS config/ciphers/cert chain | testssl/SSL Labs (sandbox blocked) ya ssllabs.com test screenshot |
| GSC: coverage reasons, manual actions, queries | GSC access/screenshots |
| Cloudflare cache/WAF/bot rules, SSL mode | CF dashboard screenshots |
| /api/og 500 exact root cause | Server log line (12.1 #7) |
| AI-engine citations | Manual test protocol (GEO-004) |
| External uptime monitor status | Monitor dashboard |
| DB backups/PITR, R2 versioning | Neon/Supabase + R2 console screenshots |
| SPF/DKIM deliverability (record existence ✓ verified) | mail-tester.com test |
| HSTS preload list status | https://hstspreload.org/search?domain=xsypher.com screenshot |

### 12.3 Raw evidence / commands used
```
# Live (via fetch_page — sandbox curl blocked by egress policy)
GET https://xsypher.com/robots.txt            → wildcard allow + disallows + sitemap
GET https://xsypher.com/sitemap.xml           → index (pages.xml + articles.xml)
GET https://xsypher.com/sitemap/pages.xml     → ONLY 19 static URLs, lastmod=2026-10-01 (×2)
GET https://xsypher.com/sitemap/articles.xml  → 1 NewsArticle (48h window)
GET https://xsypher.com/api/og?title=Test     → HTTP 500 (×2)
GET https://xsypher.com/ads.txt               → HTTP 404
GET https://xsypher.com/this-page-...-test    → custom 404 (title=homepage fallback)
GET https://xsypher.com/.well-known/security.txt → 200 valid
GET https://xsypher.com/feed.xml              → 5 items (site corpus = 5)

# DNS (dns.google DoH JSON)
TXT xsypher.com               → v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all
TXT _dmarc.xsypher.com        → v=DMARC1; p=none;
TXT resend._domainkey         → p=MIGf... (DKIM present)

# Repo
npx tsc --noEmit              → PASS (exit 0)
npm test                      → 557/557 PASS (47 files)
npm run lint                  → FAIL: 451 problems (351 errors, 100 warnings)
npm audit --package-lock-only → 33 vulns (3 critical, 21 high, 8 moderate, 1 low) — ALL dev
npm audit --omit=dev          → 0 vulns (CI gate ✓)
gh repo view                  → isPrivate: false (PUBLIC)
git ls-files | secret-scan    → HIT: .vscode/settings.json (sk-7...YbQW REDACTED)
```

### 12.4 Assumptions (owner confirmations + audit assumptions)
1. Deploy = Oracle Cloud VPS Docker + Cloudflare proxy — **owner-confirmed** (repo mein conflicting AGENTS.md "Cloudflare Workers" note milta hai — docs drift, `BE` backlog item).
2. Staging = none (owner: "i dont know") → production par sirf passive tests.
3. Access = logs/admin panel available; GSC/analytics/screenshots abhi nahi.
4. Niche/audience: global English tech news (PK founder) — assumption.
5. Monetization: AdSense — **owner-confirmed**.
6. Competitors auto-detected (Section 6) — assumption, aap badal sakte hain.
7. DB = managed Postgres (Neon/Supabase per README) + R2 = hybrid model — assumption for backup claims.

### 12.5 Glossary (Roman Urdu mein simple)
- **Crawlability:** Google bot aapke pages tak asaani se pohanch sakta hai ya nahi.
- **Canonical:** page ka "asli version" batane wala tag — duplicate penalties se bachata hai.
- **Sitemap:** search engines ko diya gaya URL-list — discovery ka index card.
- **LCP/INP/CLS:** page ki loading speed (bada content), interaction ka jawab-kitna fast, layout ka hilna — Google ki 3 web vitals metrics.
- **E-E-A-T:** Experience, Expertise, Authoritativeness, Trust — content ki credibility ke signals.
- **AEO:** aise tareeqe jinse aapka jawab Google ke featured snippets/PAA mein aaye.
- **GEO:** AI chatbots/answers (ChatGPT, Perplexity) mein aapka content cite hone ke tareeqe.
- **JSON-LD/Schema:** search engines ko structured data dene ka format (news, author, breadcrumbs).
- **CSP:** browser ko batata hai kaunsi scripts/origins trustworthy hain — XSS rokne ki layer.
- **DMARC/SPF/DKIM:** email authentication — aapke domain se fake email rokne ke rules.
- **TCF/CMP:** consent framework jo EU visitors ki tracking permission manage karta hai.
- **ISR:** Incremental Static Regeneration — page ko waqfe waqfe se fresh karte hain bina full rebuild.
- **Information gain:** content mein naya/original data hona jo doosron ke paas nahi.
- **Citation-worthiness:** AI engines ke liye aapka content itna reliable ke woh source bana sakein.

### 12.7 Implementation Log (13 Oct 2026 — audit ke baad same-day fixes)

Owner ne "DO everything" approve kiya; yeh sab **`arena/80f1fb0b-xcipher` branch** par alag-alag commits hain (koi production deploy nahi hua — aap deploy karenge):

| # | Commit | Fix | Findings |
|---|---|---|---|
| 1 | `9ff83e4` | Exposed API key hatai gayi (.vscode/settings.json) + ignore guard | SEC-001 (repo-side) |
| 2 | `e385452` | Sitemap: per-query isolation + `Article.authorId` authors query | CRW-001 |
| 3 | `3b3faf2` | Editor ke primary meta fields + ogImage/canonical wire | TSEO-002, TSEO-003 |
| 4 | `7eca1f1` | `/api/og` fail-open: fallback brand card (5-min TTL) + materialised render | TSEO-001 |
| 5 | `675ad42` | robots (invite/unsubscribe + AI groups), IndexNow key, tagline centralisation, 404 metadata, internal links, generic login error | CRW-003/004/005/006, GEO-002, CON-002, SEC-004 |
| 6 | `41719cd` | Image `sizes` (StoryRow 118px + category feature), react-tweet client-only dynamic | PERF-001, PERF-002 |
| 7 | `5a4ac71` | RSS test fixture siteConfig ke real shape par | (test) |
| 8 | `e3da25a` | `public/ads.txt` serve (publisher ID placeholder) | AD-001 |
| 9 | `a861b27` | CI build gate + non-blocking lint, deploy health gate, `/api/healthz` liveness, Caddyfile update | BE-001, BE-002, BE-007 |
| 10 | `9456e7f` | Featured-image alt required on submit/publish | CMS-001 (P1) |
| 11 | `1b7d8fa` | CSP `connect-src` explicit allowlist (Google CSP guide ke mutabiq) | SEC-002 |
| 12 | `12fdbe9` | Safe `eslint --fix` (3 × prefer-const) | BE-001 (partial) |
| 13 | `d9c2336` | Publisher `@id` link, Person `worksFor`, Organization sameAs (GitHub) | SCH-001 |
| 14 | *(is turn)* | Bing verification file-method (`public/BingSiteAuth.xml`) + env/meta path remove; build-time env caveat documented | MON-002 |

**Verification (is sandbox mein chalaya):** `npx tsc --noEmit` PASS · `npm test` **557/557 PASS** · deploy.yml YAML valid · OG renderer ka local smoke test PASS (20KB PNG). **Note:** `npm run build` yahan sandbox ki egress limit (fonts.googleapis.com) ki wajah se nahi chali — CI (GitHub) par build gate ab isay cover karta hai.

**Owner actions (jo sirf aap kar sakte hain):**
1. **SEC-001:** agentrouter key **revoke** karein + git history purge (`git filter-repo`/BFG) — repo public hai.
2. `public/ads.txt` mein real `pub-...` ID daalein.
3. **Bing verification (MON-002):** `public/BingSiteAuth.xml` mein apna Bing token paste karein (ya DNS TXT record use karein) — details `fixes/bing-verification.md`. **Env var wala rasta kaam nahi karta:** `NEXT_PUBLIC_*` build-time inline hota hai aur `.dockerignore` mein `.env.*` excluded hai, yani host ki `.env.production` build ke waqt nazar hi nahi aati. Bing ki `XML file` ya `DNS` verification chunein.
4. `INDEXNOW_KEY` env set karein (`bash fixes/indexnow-key.sh`).
5. DNS: DMARC `p=quarantine` → `p=reject` (fixes/dmarc-recommendation.txt).
6. Analytics account (Plausible/GA4) + `/api/healthz` par uptime monitor.
7. Deploy ke baad: browser console mein CSP violations check karein (SEC-002) + `/api/og?title=test` ka 200 verify karein.

**Known limitation (build-time env):** `NEXT_PUBLIC_*` values build ke waqt inline hote hain. Docker build context se `.env.*` excluded hai aur `docker-compose.prod.yml` env sirf runtime par deta hai, is liye host ki `.env.production` build ko nahi milti. Iska asar: (a) Bing verification — file/DNS method use karein (fix applied); (b) Google verification meta tag aur (c) koi bhi `NEXT_PUBLIC_*` analytics ID — in ke liye ya DNS/hardcoded constant use karein, ya Docker build-args add karein (`fixes/bing-verification.md` section C).

**Deferred (deliberately):** CRW-002 crawlable pagination (staging + real DB data ke saath test karna hai — `/latest` aur `/category` ka render model badalta hai).

### 12.6 Quality check (pre-delivery)
- [x] Duplicate findings merge (brand naming ek jagah; OG issues cross-referenced)
- [x] Har Critical/High dobara verify (SEC-001 git+gh se; CRW-001 do fetches; TSEO-001 do fetches; AD-001 live 404; TSEO-002 code cross-check ×2)
- [x] Koi secret redacted nahi chhoda (API key `sk-7...YbQW`, Sentry DSN `o451...3136`)
- [x] Saari 12 sections covered ya "Not verified + reason" likha
- [x] Guidelines cross-check (web search 2026): FAQ/HowTo/SearchAction deprecation honestly labeled; INP≠FID (koi purana advice nahi); llms.txt "experimental"; meta keywords ka koi zikr nahi (ignore hota hai)
- [x] Language: Roman Urdu + English technical terms + English code/paths
