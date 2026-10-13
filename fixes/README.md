# fixes/ — xSypher Audit Fixes (approval ke liye)

> **Rule:** Audit read-only tha. In files ko apply karne se pehle apni approval dein.
> Har fix ko `arena/80f1fb0b-xcipher` branch par alag commit karke review karein.
> Production par deploy se pehle local `npm run lint && npx tsc --noEmit && npm test` chalayein.

| File | Fixes | Finding | Effort |
|---|---|---|---|
| `ads.txt` | AdSense ads.txt (404 → 200) | AD-001 | S |
| `robots-visibility-first.txt` | robots.txt Option A (sab AI bots allowed, explicit) | GEO-002 | S |
| `robots-training-block.txt` | robots.txt Option B (training bots block, search allow) | GEO-002 | S |
| `app-robots.ts.txt` | `app/robots.ts` replacement (+/invite,/unsubscribe) | CRW-003 | S |
| `sitemap-pages.route.ts.txt` | Full replacement `app/sitemap/pages.xml/route.ts` (per-query isolation + authorId fix) | CRW-001 | S |
| `article-metadata.diff` | generateMetadata: metaTitle/metaDesc/ogImage/canonical wire | TSEO-002, TSEO-003 | S |
| `storyrow-sizes.diff` | Listing thumbnails `sizes` attr | PERF-001 | S |
| `not-found-metadata.diff` | 404 title + noindex | CRW-006 | S |
| `csp-draft.txt` | CSP hardened draft (nonce-first, tight connect-src) | SEC-002 | M |
| `caddy-headers.conf` | Caddy proxy security headers + health-coupling NOTE (BE-007) | SEC-005, BE-007 | S |
| `dmarc-recommendation.txt` | DMARC/SPF upgrade steps | SEC-003 | S |
| `indexnow-key.sh` | IndexNow key generate + env set | CRW-005 | S |
| `jsonld-templates.md` | Ready JSON-LD (Organization/@id publisher, Breadcrumb for categories, Person sameAs) | SCH-001 | S |
| `ci-gate.yml` | CI mein lint + build gate snippet | BE-001 | S |
| `deploy-health-gate.sh` | Deploy ke baad health check + rollback snippet | BE-002 | M |
| `llms.txt` | Optional (EXPERIMENTAL convention) | GEO-003 | S |

## Apply (example)
```bash
cp fixes/ads.txt public/ads.txt
cp fixes/sitemap-pages.route.ts.txt app/sitemap/pages.xml/route.ts
cp fixes/app-robots.ts.txt app/robots.ts
git apply fixes/article-metadata.diff   # ya manually review karke
# robots.txt: ek option chuno
cp fixes/robots-visibility-first.txt fixes/active-robots.txt
```
