// ─────────────────────────────────────────────────────────────────────────────
// Favicon generator — full-bleed, halo-free assets for Google Search
// ─────────────────────────────────────────────────────────────────────────────
//
// Google Search masks the favicon into a circle. The previous asset
// had transparent rounded corners (and white padding), so Google
// filled the transparent pixels around the rounded square with
// solid white — a white ring/halo around the dark logo on every
// result, including dark-background SERP features.
//
// The fix, per Google's favicon guidelines:
//   • a 100% full-bleed, edge-to-edge square canvas of solid deep
//     black — ZERO transparent corners, ZERO rounded outer mask,
//     ZERO white border, so there is no transparent pixel left for
//     Google to paint white;
//   • the 2x2 xSypher grid mark (three white/grey squares and one
//     red X square) scaled to ~70% of the canvas and centred in the
//     safe circular zone, so it survives the circular crop without
//     touching the edge;
//   • clean multiples of 48px plus a multi-size favicon.ico and a
//     180x180 apple-touch-icon.png, all opaque.
//
// Run: npx tsx scripts/generate-favicons.ts
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = join(process.cwd(), "public");

// The full-bleed canvas: solid deep black, sharp corners, no
// transparency anywhere. Google's circular mask can only ever
// crop into black.
const CANVAS = "#000000";

// The mark in its original 32-unit coordinate space: three
// squares (white, and two at 40% opacity) plus the red X.
// Wrapped in <g transform="translate(24 24) scale(14.5)"> to move
// it from a 24/32 = 75% span to a 348/512 = 68% span, centred —
// inside the safe circular centre zone (≈70–75% of the canvas),
// with the mark's own corners ~10px clear of the circle Google
// crops, so no square ever touches the circular edge.
const MARK = `
  <rect fill="#ffffff" x="4" y="4" width="10" height="10" rx="1.5"/>
  <rect fill="#ffffff" opacity="0.4" x="18" y="4" width="10" height="10" rx="1.5"/>
  <rect fill="#ffffff" opacity="0.4" x="4" y="18" width="10" height="10" rx="1.5"/>
  <path d="M18.5 18.5 27.5 27.5M27.5 18.5 18.5 27.5" stroke="#f04552" stroke-width="3.2" stroke-linecap="round" fill="none"/>
`;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${CANVAS}"/>
  <g transform="translate(24 24) scale(14.5)">${MARK}
  </g>
</svg>`.trim();

/** PNG bytes for the mark rasterised at an exact pixel size. */
async function renderPng(size: number): Promise<Buffer> {
  // density above the target size keeps the rasterisation sharp
  // for the small multiples before the final resize.
  return sharp(Buffer.from(SVG), { density: 1024 })
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * A multi-size favicon.ico (16, 32, 48) carrying PNG-compressed
 * images — the format every modern browser and Google's favicon
 * crawler accept, in one request.
 */
function buildIco(pngs: { size: number; data: Buffer }[]): Buffer {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach((entry, index) => {
    const base = index * 16;
    entries.writeUInt8(entry.size > 255 ? 0 : entry.size, base); // width (0 = 256)
    entries.writeUInt8(entry.size > 255 ? 0 : entry.size, base + 1); // height
    entries.writeUInt8(0, base + 2); // colour palette
    entries.writeUInt8(0, base + 3); // reserved
    entries.writeUInt16LE(1, base + 4); // colour planes
    entries.writeUInt16LE(32, base + 6); // bits per pixel
    entries.writeUInt32LE(entry.data.length, base + 8); // bytes in res
    entries.writeUInt32LE(offset, base + 12); // image offset
    offset += entry.data.length;
  });

  return Buffer.concat([header, entries, ...pngs.map((entry) => entry.data)]);
}

async function main() {
  const sizes = [48, 96, 144, 192, 512];

  // The vector original: full-bleed black, mark centred.
  writeFileSync(join(PUBLIC_DIR, "icon.svg"), `${SVG}\n`);

  // Clean multiples of 48px, plus the Next.js-convention
  // app-agnostic /icon.png at the largest size.
  for (const size of sizes) {
    const png = await renderPng(size);
    writeFileSync(join(PUBLIC_DIR, `icon-${size}.png`), png);
  }
  writeFileSync(join(PUBLIC_DIR, "icon.png"), await renderPng(512));

  // Apple touch icon: 180x180, opaque black (iOS applies its own
  // rounded mask; transparency is what caused the halo, and the
  // touch icon must have none).
  const apple = await renderPng(180);
  writeFileSync(join(PUBLIC_DIR, "apple-touch-icon.png"), apple);
  writeFileSync(join(PUBLIC_DIR, "apple-icon.png"), apple);

  // Multi-size favicon.ico.
  const icoPngs: { size: number; data: Buffer }[] = [];
  for (const size of [16, 32, 48]) {
    icoPngs.push({ size, data: await renderPng(size) });
  }
  writeFileSync(join(PUBLIC_DIR, "favicon.ico"), buildIco(icoPngs));

  // Web app manifest pointing at the opaque raster icons.
  const manifest = {
    name: "xSypher — Independent Technology News, Analysis and Reviews",
    short_name: "xSypher",
    description:
      "xSypher is an independent technology publication covering AI, cybersecurity, gadgets, software, programming, startups, gaming and the tech business.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  writeFileSync(
    join(PUBLIC_DIR, "manifest.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log("[favicons] wrote icon.svg, icon.png, icon-{48,96,144,192,512}.png,");
  console.log("[favicons] apple-touch-icon.png, apple-icon.png, favicon.ico, manifest.webmanifest");
}

main().catch((error) => {
  console.error("[favicons] generation failed:", error);
  process.exit(1);
});
