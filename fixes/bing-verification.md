# MON-002 — Bing Webmaster Tools verification (file method)

**Status:** code-side ready · **owner action:** paste token + redeploy · **Effort:** S

## Why not a `<meta>` tag (important)

`NEXT_PUBLIC_*` verification tags are evaluated at **build time** for statically
generated pages (home, article, category). In this project the Docker build
context **excludes** `.env.*` (`.dockerignore`), and `docker-compose.prod.yml`
only passes `.env.production` at **container runtime** (`env_file:`), not at
build time. So setting `NEXT_PUBLIC_BING_SITE_VERIFICATION` on the host would
never reach the rendered HTML.

The file method below has **zero** env/build dependency, so it just works.

## A. File method (recommended)

1. Bing Webmaster Tools → **Add site** → `xsypher.com` → choose **XML file** verification.
2. Bing shows a token, e.g. `30F4A7B9C2D1E5F8A3B6C9D2E5F8A1B4`.
3. Replace the placeholder in `public/BingSiteAuth.xml`:

```xml
<users>
	<user>30F4A7B9C2D1E5F8A3B6C9D2E5F8A1B4</user>
</users>
```

4. Commit → redeploy (this file is copied into the image at build time).
5. Confirm it is live: `https://xsypher.com/BingSiteAuth.xml` → then click **Verify** in Bing.
6. Bing → **Sitemaps** → submit `https://xsypher.com/sitemap.xml`
   (+ `sitemap/pages.xml`, `sitemap/articles.xml`).

## B. DNS TXT alternative (no redeploy needed)

Cloudflare → DNS → Add record:

| Type | Name | Content | TTL |
|---|---|---|---|
| TXT | `@` (or `xsypher.com`) | `<the token Bing gives you>` | Auto |

Then pick **DNS** verification in Bing. IndexNow pings (`INDEXNOW_KEY`) already
work independently — no extra setup needed for them.

## C. If you later want the meta-tag path (also needed for a `NEXT_PUBLIC_*` analytics ID)

Pass the value as a **Docker build arg** so it exists during `npm run build`:

`docker-compose.prod.yml`

```yaml
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_BING_SITE_VERIFICATION: ${NEXT_PUBLIC_BING_SITE_VERIFICATION:-}
```

`Dockerfile` (builder stage, before `npm run build`)

```dockerfile
ARG NEXT_PUBLIC_BING_SITE_VERIFICATION
ENV NEXT_PUBLIC_BING_SITE_VERIFICATION=$NEXT_PUBLIC_BING_SITE_VERIFICATION
```

The variable must be exported in the host shell (or in the compose-level `.env`,
which Compose reads for interpolation) **before** `docker compose build`.
`.env.production` alone is not enough — it is runtime-only.

> Simpler alternative for analytics (MON-001): put the Plausible/GA4 site ID in a
> TypeScript constant (e.g. `lib/analytics-config.ts`) instead of an env var, so
> the build never depends on shell environment.

## Verification checklist

- [ ] `https://xsypher.com/BingSiteAuth.xml` returns 200 with your token (curl/browser)
- [ ] Bing Webmaster Tools shows the site as **Verified**
- [ ] Sitemaps submitted, 0 fetch errors in Bing
- [ ] (Optional) `INDEXNOW_KEY` set → check `[indexnow]` has no warning in worker logs
