import { ImageResponse } from 'next/og';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import redis from '@/lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Open Graph image generator.
//
// Rendering with Satori is CPU-heavy, so the rendered PNG is cached in Redis
// (shared across every web replica) for 7 days, keyed by a hash of the
// parameters. Cache-Control headers let Cloudflare cache it at the edge too.
//
// TSEO-001 hardening (audit 2026-10-13): production returned HTTP 500 for every
// request (verified live, twice). The route now NEVER 500s a social image:
//   1. The render is materialised inside a try/catch, so a Satori/resvg/font
//      failure returns the static brand card instead of a 500 — shares keep
//      working while the console.error line below keeps the root cause
//      visible in the server logs.
//   2. The fallback is cached for only 5 minutes (not 7 days) so a real fix
//      shows up quickly instead of being pinned behind a long TTL.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
const FALLBACK_CACHE_CONTROL = 'public, max-age=300, s-maxage=300';

function cacheKey(title: string, author: string, category: string): string {
  const hash = createHash('sha1').update(`${title}\n${author}\n${category}`).digest('hex');
  return `og:${hash}`;
}

function pngResponse(buffer: Buffer, cacheControl: string = CACHE_CONTROL): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': cacheControl,
    },
  });
}

/** Static brand card shipped with the app; used whenever rendering fails. */
async function fallbackResponse(): Promise<Response> {
  try {
    const file = await readFile(path.join(process.cwd(), 'public', 'og-fallback.png'));
    return pngResponse(Buffer.from(file), FALLBACK_CACHE_CONTROL);
  } catch (fallbackError) {
    console.error('[og] Fallback image unavailable:', fallbackError);
    return new Response('Failed to generate image', { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const hasTitle = searchParams.has('title');
    const title = hasTitle
      ? searchParams.get('title')?.slice(0, 100)
      : 'xSypher';

    const author = searchParams.get('author') || 'xSypher Editorial';
    const category = searchParams.get('category') || 'NEWS';

    // Cache hit: serve the stored PNG without rendering anything.
    const key = cacheKey(title || 'xSypher', author, category);
    if (redis.status === 'ready') {
      try {
        const cached = await redis.get(key);
        if (cached) {
          return pngResponse(Buffer.from(cached, 'base64'));
        }
      } catch (error) {
        console.error('[og] Cache read failed, rendering fresh:', error);
      }
    }

    const response = new ImageResponse(
      (
        <div tw="flex flex-col w-full h-full bg-[#0c0d10] p-20 justify-between font-sans">
          <div tw="flex w-full justify-between items-center">
            <div tw="flex text-4xl font-extrabold text-white tracking-tighter">
              x<span tw="text-[#f04552]">Sypher</span>
            </div>
            <div tw="flex text-2xl font-bold text-[#f04552] uppercase tracking-widest">
              {category}
            </div>
          </div>

          <div tw="flex text-[72px] font-extrabold text-white leading-tight tracking-tight mt-10 mb-auto">
            {title}
          </div>

          <div tw="flex w-full items-center mt-10">
            <div tw="flex w-[60px] h-[60px] rounded-full bg-[#1f2127] border-2 border-[#f04552]"></div>
            <div tw="flex flex-col ml-5">
              <div tw="flex text-2xl font-semibold text-white">{author}</div>
              <div tw="flex text-xl text-[#a1a1aa]">xSypher Desk</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    // Materialise the render explicitly so a Satori failure is caught here —
    // returning `response` directly would let the error surface at send time
    // as an unhandled 500 with no fallback.
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('[og] Render failed, serving fallback card:', error);
      return fallbackResponse();
    }

    // Best-effort cache write; a Redis failure still returns the fresh render.
    if (redis.status === 'ready') {
      try {
        await redis.set(key, buffer.toString('base64'), 'EX', CACHE_TTL_SECONDS);
      } catch (error) {
        console.error('[og] Cache write failed:', error);
      }
    }

    return pngResponse(buffer);
  } catch (e: any) {
    // Reached only for pre-render failures (URL parsing, Redis client state).
    console.error('[og] Unhandled error, serving fallback card:', e);
    return fallbackResponse();
  }
}
