import { ImageResponse } from 'next/og';
import { createHash } from 'node:crypto';
import redis from '@/lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Open Graph image generator.
//
// Rendering with Satori is CPU-heavy, so the rendered PNG is cached in Redis
// (shared across every web replica) for 7 days, keyed by a hash of the
// parameters. Cache-Control headers let Cloudflare cache it at the edge too.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

function cacheKey(title: string, author: string, category: string): string {
  const hash = createHash('sha1').update(`${title}\n${author}\n${category}`).digest('hex');
  return `og:${hash}`;
}

function pngResponse(buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': CACHE_CONTROL,
    },
  });
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

    // Store the rendered image (best effort — a cache write failure still
    // returns the freshly rendered response).
    if (redis.status === 'ready') {
      try {
        const buffer = Buffer.from(await response.arrayBuffer());
        await redis.set(key, buffer.toString('base64'), 'EX', CACHE_TTL_SECONDS);
        return pngResponse(buffer);
      } catch (error) {
        console.error('[og] Cache write failed:', error);
      }
    }

    return response;
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
