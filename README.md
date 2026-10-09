<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=1e293b&height=250&section=header&text=xSypher&fontSize=90&fontAlignY=38&desc=Premium%20Editorial%20Newsroom%20&descAlignY=55&descAlign=62&fontColor=ffffff" alt="xSypher Header" />
</div>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## ✦ Overview

**xSypher** is a state-of-the-art, autonomous editorial newsroom CMS and high-performance digital publication. Designed with premium aesthetics (glassmorphism, micro-interactions, dark mode) and built for speed, xSypher delivers a world-class reading experience while empowering writers with a powerful rich-text editing suite.

## ✦ Key Features

- **🎨 Premium UI/UX:** Dynamic animations, customized CSS variables (`--ink`, `--surface`, `--accent`), and smooth page transitions.
- **📝 Advanced Editor:** Integrated TipTap rich-text editor with custom nodes (code blocks, categories, metadata) and DOM sanitization.
- **🔐 Secure Authentication:** Powered by **NextAuth.js (v5)** with Role-Based Access Control, TOTP 2FA (encrypted at rest), and a capability layer (`authorize()`).
- **🚀 ISR & Tagged Caching:** Next.js App Router running on Node.js 22 with `unstable_cache` tag invalidation and Cloudflare CDN caching.
- **⚡ Hybrid Storage Architecture:** PostgreSQL (Drizzle ORM via Neon WebSocket Pool) for relational metadata + Cloudflare R2 for JSON/HTML article bodies and media.
- **🐳 Containerized CI/CD Pipeline:** Automated GitHub Actions workflow with TypeScript, unit test, and security audit gates before deploying multi-stage, non-root ARM64 Docker containers (`xsypher-web`, `xsypher-worker`, and AOF-persisted `redis`).

---

## ✦ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | Core full-stack React framework |
| **Language** | TypeScript | Strict mode enforced |
| **Styling** | Tailwind CSS + Vanilla CSS | Utility classes combined with CSS variables |
| **Database** | PostgreSQL | Hosted on Supabase / Neon |
| **ORM** | Drizzle ORM | Type-safe edge/serverless SQL queries |
| **Auth** | NextAuth (v5) | Session & identity management |
| **Storage** | Cloudflare R2 | S3-compatible blob storage for heavy payloads |
| **Infrastructure** | Docker + Oracle Cloud (ARM64) | Containerized self-hosted production |

---

## ✦ Architecture: Hybrid Storage Flow

To guarantee high performance and low database egress costs, xSypher employs a hybrid storage model:

1. **PostgreSQL (Metadata):** Stores structural data: `title`, `deck`, `authorId`, `views`, `status`, and tags.
2. **Cloudflare R2 (Content):** Stores the raw TipTap JSON and compiled HTML payload.
3. **The Link:** The Postgres database holds the R2 object path in the `contentUrl` column.
4. **Resolution:** Next.js fetches the metadata from Postgres, then resolves the `contentUrl` from R2 to render the final article.

---

## ✦ Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v20 or v22 recommended)
- PostgreSQL Database (Supabase or Neon)
- Cloudflare R2 Bucket (or AWS S3 equivalent)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/xsypher.git
cd xsypher
```

### 2. Install dependencies
```bash
npm ci
```

### 3. Environment Variables
Copy the example environment file and fill in your secrets:
```bash
cp .env.example .env.local
```
*Required keys include `DATABASE_URL`, `AUTH_SECRET`, and R2 credentials.*

### 4. Database Migration
Push the Drizzle ORM schema to your database:
```bash
npx drizzle-kit push
```

### 5. Run the dev server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the application.

---

## ✦ Deployment

xSypher is configured for self-hosted containerized deployment on an **Oracle Cloud Ubuntu ARM64 server** behind **Caddy** and Cloudflare.

### CI/CD Automation
Deployments are handled automatically via **GitHub Actions** (`.github/workflows/deploy.yml`). 
Upon pushing to the `main` branch, the workflow:
1. Runs the CI verification gate (`npm ci`, `npx tsc --noEmit`, `npm test`, and `npm audit --omit=dev`).
2. Connects to the host server via SSH.
3. Pulls the latest code.
4. Runs transactional, idempotent database migrations (`migrate.mjs`).
5. Rebuilds the web and worker Docker images using multi-stage, non-root `Dockerfile` and `Dockerfile.worker`.
6. Restarts containers (`xsypher-web`, `xsypher-worker`, and persistent `redis`) and verifies readiness via `/api/health`.

### Reverse Proxy & Backups
- **Caddy Configuration:** See [`docs/Caddyfile.example`](docs/Caddyfile.example) for the production reverse-proxy configuration preserving `Host` headers and enforcing `X-Robots-Tag` on `admin.xsypher.com` and `preview.xsypher.com`.
- **Database Backups:** See [`scripts/backup-db.sh`](scripts/backup-db.sh) for automated daily `pg_dump` backups with configurable retention.

### Manual Docker Build
If you wish to test the production build locally:
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## ✦ Code Quality & Conventions

- **DO NOT** use `export const runtime = 'edge'` in Next.js routes; this project runs in a native Node.js container environment.
- **Relational Queries:** Always prefer Drizzle's `db.query.*` API.
- **Capabilities:** Never hardcode role checks (e.g., `role === 'ADMIN'`). Always use the `authorize(role, capability)` wrapper from `lib/capabilities`.
- **Client-Side Hydration:** Heavy libraries (TipTap, Recharts, Mermaid) must be dynamically imported (`next/dynamic(..., { ssr: false })`) to prevent server bloat.

---

<div align="center">
  <p>Built with ❤️ by the xSypher Team</p>
</div>
