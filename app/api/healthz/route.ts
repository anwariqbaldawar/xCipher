// Liveness probe — deliberately trivial.
//
// /api/health reports DEPENDENCY health (database + Redis) and returns 503 when
// Redis degrades. That is right for monitoring dashboards, but it must never be
// the endpoint the reverse proxy and deploy gates use: a Redis blip would make
// Caddy mark the only upstream unhealthy and take the whole site down (BE-007),
// and a deploy health gate would roll back a perfectly working release.
//
// This endpoint answers one question only: is the Next.js process serving?
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
