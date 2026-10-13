# xSypher — SSH Deploy Runbook (AI agent ke liye copy-paste prompt)

> **Owner ke liye (Roman Urdu):** Neeche `===== AGENT PROMPT START =====` se `===== AGENT PROMPT END =====`
> ke darmiyan poora text copy karke apne SSH-wale AI agent ko dein. Jo cheezein `<<< >>>` mein hain
> woh pehle fill karein. Agar Cloudflare/UptimeRobot ka access nahi dena chahte to un 2 sections ko
> khaali chhor dein — agent sirf instructions likh kar de dega, DNS ko haath nahi lagega.

===== AGENT PROMPT START =====

You are an infrastructure agent with SSH access to the production server of **xsypher.com** (a Next.js 16 editorial news CMS). Your job is a **controlled production deployment plus post-deploy verification**. Follow this runbook exactly. It is written to be safe on a live site: every mutation must be reversible.

## 0. Ground rules (non-negotiable)

1. **Production system.** Before any change, create the rollback point (Step 2). Never continue past a failed step — stop and report.
2. **Never run:** `git filter-repo` or any history rewrite, `git push --force`, `git reset --hard` outside the documented deploy step, `docker system prune -a`, `docker volume prune`, deletion of `.env.production` or any `.env*` file, load tests / stress tests / brute-force attempts, DB schema changes other than the project's own `node migrate.mjs`.
3. **Never print secret values.** Do not `cat .env.production`. Check variables with existence tests only, e.g. `grep -q '^INDEXNOW_KEY=' .env.production && echo "set" || echo "missing"`. In your final report, redact everything except the key name.
4. **Cloudflare / DNS:** only touch DNS if `CLOUDFLARE_API_TOKEN` is provided below. Otherwise output the exact records for the owner to add manually.
5. If a step needs a value you do not have (`<<<...>>>` placeholders left unfilled), **skip that step, mark it BLOCKED, and continue with the rest.**
6. Keep a log of every command you run and its exit code. Report honestly — a "not verified" is better than a guess.

## 1. Inputs (filled by the owner)

```
BING_TOKEN=<<< paste the Bing Webmaster token, or leave as-is to skip >>>
ADSENSE_PUB_ID=<<< pub-0000000000000000, or leave as-is to skip >>>
CLOUDFLARE_API_TOKEN=<<< optional >>>
CLOUDFLARE_ZONE_ID=<<< optional, required with the token >>>
UPTIMEROBOT_API_KEY=<<< optional >>>
OWNER_APPROVED_MANUAL_DEPLOY=<<< yes/no — may you deploy with the host commands if CI did not run? >>>
```

## 2. System facts (do not rediscover — verify, then trust)

| Item | Value |
|---|---|
| Repo checkout on host | `/home/ubuntu/apps/xsypher` |
| Compose file | `docker-compose.prod.yml`, services: `xsypher-web` (bound to `127.0.0.1:3000`), `xsypher-worker`, `redis` |
| Runtime env file | `/home/ubuntu/apps/xsypher/.env.production` (read by **both** app containers at start, not at build) |
| Reverse proxy | **Caddy systemd service**, config `/etc/caddy/Caddyfile` — *not* in Docker |
| Deploy trigger | push to `main` → GitHub Actions `.github/workflows/deploy.yml` → SSH deploy (git reset, `npm ci`, `node migrate.mjs`, `docker compose build && up -d`, health gate) |
| Liveness | `GET /api/healthz` → 200 always while the app serves (**use for probes/deploy gate**) |
| Readiness | `GET /api/health` → 503 if Redis/DB degrade (**use only for uptime dashboards, never as a proxy probe**) |
| Host arch | Oracle Cloud ARM64 (aarch64) |

## 3. Steps

### Step 1 — Pre-flight: is the release on `main`?

```bash
cd /home/ubuntu/apps/xsypher
git status --porcelain          # must be EMPTY; if dirty, STOP and report
git fetch origin
git log -1 --oneline origin/main
```

The expected content is the merge of branch `arena/80f1fb0b-xcipher`; the tip must be at or after commit **`0c1dd41`** (`fix(seo): Bing verification via public/BingSiteAuth.xml`).

- If `origin/main` does **not** contain it → **STOP**. Report: "BLOCKED: PR not merged yet — merge `arena/80f1fb0b-xcipher` into `main` first." (Only if you have authenticated `gh` CLI access AND the owner listed this in the prompt may you create/merge the PR yourself.)
- If it does contain it but the site still serves the old build → continue; the deploy either did not run or failed.

### Step 2 — Rollback point (do this before anything else)

```bash
cd /home/ubuntu/apps/xsypher
git rev-parse HEAD | sudo tee /home/ubuntu/deploy-rollback-sha.txt 2>/dev/null || git rev-parse HEAD > /home/ubuntu/deploy-rollback-sha.txt
TS=$(date +%Y%m%d-%H%M%S)
docker tag xsypher-web:latest    xsypher-web:rollback-$TS    || true
docker tag xsypher-worker:latest xsypher-worker:rollback-$TS || true
docker images --format '{{.Repository}}:{{.Tag}}' | grep rollback
echo "$TS" > /home/ubuntu/deploy-rollback-tag.txt
```

Optional (only if `pg_dump` exists and `DATABASE_URL` is a local/managed Postgres you can reach): take a dump. If the DB is managed (Neon/Supabase) with snapshots, skip and say so.

### Step 3 — Repo files that MUST be committed (host-side edits get wiped)

The deploy does `git reset --hard origin/main`, so editing files only on the server is pointless — they vanish on the next deploy. If `BING_TOKEN` / `ADSENSE_PUB_ID` were provided, write them **in the repo checkout and commit** (this also triggers the CI deploy):

```bash
cd /home/ubuntu/apps/xsypher
# 3a. Bing verification file (only with a real token)
if [ -n "<<<BING_TOKEN>>>" ]; then cat > public/BingSiteAuth.xml <<XML
<?xml version="1.0"?>
<users>
	<user><<<BING_TOKEN>>></user>
</users>
XML
fi

# 3b. AdSense ads.txt (only with a real publisher ID)
if [ -n "<<<ADSENSE_PUB_ID>>>" ]; then
  sed -i 's/pub-XXXXXXXXXXXXXXXX/<<<ADSENSE_PUB_ID>>>/' public/ads.txt
fi

git diff --stat
git add public/BingSiteAuth.xml public/ads.txt
git commit -m "chore(seo): real AdSense publisher ID + Bing Webmaster verification token" || echo "nothing to commit"
git push origin main        # ⚠️ this triggers the production deploy
```

If you have **no push rights**, do not commit: revert your edits (`git checkout -- public/`), and report that the owner must commit these two files.

### Step 4 — `INDEXNOW_KEY` in `.env.production`

```bash
cd /home/ubuntu/apps/xsypher
cp .env.production .env.production.bak-$(date +%Y%m%d-%H%M%S)
KEY=$(openssl rand -hex 16)
if grep -q '^INDEXNOW_KEY=' .env.production; then
  sed -i "s|^INDEXNOW_KEY=.*|INDEXNOW_KEY=${KEY}|" .env.production
else
  printf '\nINDEXNOW_KEY=%s\n' "$KEY" >> .env.production
fi
grep -c '^INDEXNOW_KEY=' .env.production    # expect: 1
```

Do **not** echo `$KEY`. Tell the owner it now lives only in `.env.production` (runtime-only; no public key file is needed for `api.indexnow.org` GET pings).

### Step 5 — Caddy probe must use the liveness endpoint (audit BE-007)

```bash
grep -n 'health_uri' /etc/caddy/Caddyfile
```

- If it says `/api/health` → back it up and switch to `/api/healthz`:

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
sudo sed -i 's|health_uri /api/health$|health_uri /api/healthz|' /etc/caddy/Caddyfile
grep -n 'health_uri' /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy && echo RELOADED
```

- If it already says `/api/healthz` → nothing to do, report "already correct".
- If you lack sudo → report BLOCKED with the exact command for the owner.

Why: `/api/health` returns 503 whenever Redis degrades, which would make Caddy drop the only upstream and 502 the whole site over a cache blip.

### Step 6 — Deploy

**Preferred:** the push in Step 3 already triggered GitHub Actions. Watch it if `gh` is available:

```bash
gh run list --workflow "Deploy Production" --limit 3
gh run watch $(gh run list --workflow "Deploy Production" --limit 1 --json databaseId --jq '.[0].databaseId')
```

**Fallback — only if `OWNER_APPROVED_MANUAL_DEPLOY=yes`** (reproduces the CI deploy exactly):

```bash
cd /home/ubuntu/apps/xsypher
git fetch origin main && git reset --hard origin/main
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
npm ci --no-audit --no-fund
node migrate.mjs
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Post-deploy health gate (~60s)
ok=0
for i in $(seq 1 15); do
  if curl -fsS --max-time 3 http://127.0.0.1:3000/api/healthz >/dev/null 2>&1; then ok=1; break; fi
  sleep 4
done
if [ "$ok" != "1" ]; then
  echo "HEALTH GATE FAILED"; docker compose -f docker-compose.prod.yml logs --tail=100 xsypher-web; exit 1
fi
echo "HEALTH GATE OK"
docker image prune -f
```

`.env.production` changes (Step 4) require **recreating** the containers, not just restarting — `up -d` does that automatically when the file changed, otherwise use `docker compose -f docker-compose.prod.yml up -d --force-recreate xsypher-web xsypher-worker`.

### Step 7 — Verification matrix (run every check, paste the real output)

```bash
echo "--- liveness (local)";        curl -fsS --max-time 5 http://127.0.0.1:3000/api/healthz
echo; echo "--- readiness";         curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health
echo "--- OG image";                curl -s -o /tmp/og.png -w 'status=%{http_code} bytes=%{size_download} type=%{content_type}\n' 'https://xsypher.com/api/og?title=Deploy%20Test'
echo "--- sitemap URL count";       curl -s https://xsypher.com/sitemap/pages.xml | grep -c '<loc>'
echo "--- sitemap has articles";    curl -s https://xsypher.com/sitemap/pages.xml | grep -c '/article/'
echo "--- ads.txt";                 curl -s https://xsypher.com/ads.txt | grep -v '^#'
echo "--- Bing file";               curl -s -o /dev/null -w '%{http_code}\n' https://xsypher.com/BingSiteAuth.xml
echo "--- CSP";                     curl -sI https://xsypher.com/ | grep -i '^content-security-policy'
echo "--- robots token paths";      curl -s https://xsypher.com/robots.txt | grep -E 'invite|unsubscribe' | head -5
echo "--- robots AI groups";        curl -s https://xsypher.com/robots.txt | grep -E 'GPTBot|PerplexityBot|ClaudeBot' | head -5
echo "--- 404 title";               curl -s https://xsypher.com/definitely-not-a-real-page | grep -o '<title>[^<]*</title>' | head -1
echo "--- feed title";              curl -s https://xsypher.com/feed.xml | grep -o '<title>[^<]*</title>' | head -1
echo "--- og errors in logs";       docker compose -f docker-compose.prod.yml logs --since 20m xsypher-web 2>&1 | grep -E '\[og\]' | tail -5
echo "--- indexnow warnings";       docker compose -f docker-compose.prod.yml logs --since 20m xsypher-worker 2>&1 | grep -i 'indexnow' | tail -5
echo "--- sitemap warnings";        docker compose -f docker-compose.prod.yml logs --since 20m xsypher-web 2>&1 | grep -i '\[sitemap\] FAILED' | tail -5
echo "--- DMARC";                   curl -s 'https://dns.google/resolve?name=_dmarc.xsypher.com&type=TXT' | python3 -m json.tool
echo "--- container state";         docker compose -f docker-compose.prod.yml ps
```

Expected:

| Check | Expected |
|---|---|
| liveness | `ok` |
| readiness | `200` (503 = Redis/DB degraded → report, do not roll back the site) |
| OG image | `status=200`, `bytes` > 10000, `type=image/png` |
| sitemap count | **> 19** (before this release it was exactly 19 with zero `/article/` URLs — the whole point of CRW-001) |
| sitemap `/article/` | ≥ 1 (i.e. the article corpus is present) |
| ads.txt | exactly one `google.com, pub-<digits>, DIRECT, f08c47fec0942fa0` line, no `XXXX` |
| Bing file | `200` (and body contains the real token if one was provided) |
| CSP | contains `connect-src 'self' …` with named hosts (no bare `https:`) |
| robots | `/invite`, `/unsubscribe` present; AI groups present |
| 404 title | `Page not found — xSypher` (not the homepage title) |
| feed title | `xSypher — <tagline>` |
| `[og]` logs | **no new** `Render failed` / `Fallback image unavailable` lines after the deploy |
| indexnow logs | no `INDEXNOW_KEY is not set` warning after Step 4 |
| `[sitemap] FAILED` | no new lines (a line here means a query group still fails → paste it verbatim) |

Additionally, if a real browser is available: open `https://xsypher.com` and one article, and report any **CSP violation messages** in the DevTools console verbatim (new integrations may need a host added to `connect-src` in `middleware.ts`).

### Step 8 — Rollback (only if Step 7 fails badly: liveness down, or site not serving)

```bash
cd /home/ubuntu/apps/xsypher
TS=$(cat /home/ubuntu/deploy-rollback-tag.txt)
docker tag xsypher-web:rollback-$TS    xsypher-web:latest
docker tag xsypher-worker:rollback-$TS xsypher-worker:latest
docker compose -f docker-compose.prod.yml up -d --no-build --force-recreate xsypher-web xsypher-worker
# code rollback too, so the next deploy does not re-break it:
git reset --hard $(cat /home/ubuntu/deploy-rollback-sha.txt)
```

Then re-run the liveness check and report. Never leave the host on a different SHA than what the owner expects — tell them the exact SHA you reset to.

### Step 9 — DMARC (SEC-003) — only with a Cloudflare token

Current record: `v=DMARC1; p=none;` (no reporting address). Target: `p=quarantine` with `rua`.

If `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` are provided:

```bash
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/<RECORD_ID>" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data '{"type":"TXT","name":"_dmarc","content":"v=DMARC1; p=quarantine; rua=mailto:dmarc@xsypher.com; fo=1","ttl":3600}'
```

(First `GET` the record list to find `<RECORD_ID>`; never create a duplicate `_dmarc` record — update the existing one.)

If no token: **do not touch DNS.** Output for the owner: add/update the Cloudflare TXT record `_dmarc` →
`v=DMARC1; p=quarantine; rua=mailto:dmarc@xsypher.com; fo=1`, and after 2–4 weeks of clean reports move to `p=reject`. Also keep the existing SPF (`~all`) as-is.

Verify afterwards: the DMARC check in Step 7 must show the new value.

### Step 10 — Uptime monitor (MON-003)

- With `UPTIMEROBOT_API_KEY`: create an HTTP(s) monitor for `https://xsypher.com/api/healthz`, interval 5 minutes, alert contact = owner's email, keyword type "exists" is not needed. Confirm the monitor shows "Up".
- Without a key: output the manual steps (UptimeRobot → Add Monitor → HTTP(s) → URL `https://xsypher.com/api/healthz` → 5 min → alert email), and recommend a second monitor on `/api/health` as the **readiness** signal (alerting only, never a probe).

### Step 11 — Report back to the owner (fixed format, in Roman Urdu or English)

```
STATUS: DEPLOYED | PARTIAL | BLOCKED
Commit on main: <sha>   Host SHA after deploy: <sha>
Deploy path used: GitHub Actions | manual host deploy
Verified (with real numbers): OG <code/bytes> · sitemap <loc count> URLs incl. <n> articles · ads.txt <pub-id present? yes/no> ·
  Bing file <code> · CSP connect-src <present?> · robots <ok?> · 404/feed titles <ok?> · healthz <ok?> · readiness <code>
Applied changes: [INDEXNOW_KEY set: yes/no] [Caddy health_uri: already /api/healthz | changed | blocked]
  [ads.txt/BingSiteAuth committed by me: yes/no] [DMARC: updated | manual instructions only] [uptime monitor: created | instructions only]
Secrets: none printed; .env.production backed up to <path>
Problems / unexpected logs: <verbatim lines, or "none">
Rollback point: image tags xsypher-web:rollback-<TS>, SHA <sha> (file /home/ubuntu/deploy-rollback-sha.txt)
Still needs the owner: <list>
```

## 4. Hard "do not" list (repeated on purpose)

- Do not rotate/revoke any API keys — the owner does that in their own dashboards.
- Do not rewrite git history or force-push, ever.
- Do not run destructive Docker prunes, do not delete volumes (Redis holds the BullMQ queue).
- Do not enable/disable Cloudflare proxy, SSL mode, WAF, or cache rules.
- Do not run `npm audit fix --force`, do not upgrade dependencies as part of this task.
- Do not touch `/admin` data, do not delete articles, do not publish anything.

===== AGENT PROMPT END =====
