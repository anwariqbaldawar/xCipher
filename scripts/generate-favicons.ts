// ─────────────────────────────────────────────────────────────────────────────
// Favicon generator — full-bleed, halo-free assets for Google Search & Devices
// ─────────────────────────────────────────────────────────────────────────────
//
// Generates all required favicon variants from the master public/icon-512.png:
//   • 100% opaque, solid black (#000000) canvas — ZERO transparency
//   • Full-bleed edge-to-edge canvas with centered safe mark
//   • Multiples of 48px (48, 96, 144, 192, 512) for Google Search / Android
//   • Multi-size favicon.ico (16, 32, 48) for desktop browsers
//   • 180x180 apple-touch-icon.png & apple-icon.png for iOS
//   • PWA manifest sync in public/manifest.webmanifest
//
// Run: npx tsx scripts/generate-favicons.ts
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = join(process.cwd(), "public");
const SOURCE_IMAGE = join(PUBLIC_DIR, "icon-512.png");
const CANVAS_COLOR = "#000000";

/** Render PNG bytes from the source image at exact pixel dimensions */
async function renderPngFromSource(sourceBuffer: Buffer, size: number): Promise<Buffer> {
  return sharp(sourceBuffer)
    .flatten({ background: CANVAS_COLOR })
    .resize(size, size, {
      fit: "contain",
      background: CANVAS_COLOR,
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * A multi-size favicon.ico (16, 32, 48) carrying PNG-compressed
 * images — the format modern browsers and Google's favicon crawler accept.
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
  console.log(`[favicons] reading source from ${SOURCE_IMAGE}...`);
  const sourceBuffer = readFileSync(SOURCE_IMAGE);

  const sizes = [48, 96, 144, 192, 512];

  // 1. Multiples of 48px + app-agnostic icon.png
  for (const size of sizes) {
    const png = await renderPngFromSource(sourceBuffer, size);
    writeFileSync(join(PUBLIC_DIR, `icon-${size}.png`), png);
  }
  const icon512 = await renderPngFromSource(sourceBuffer, 512);
  writeFileSync(join(PUBLIC_DIR, "icon.png"), icon512);
  writeFileSync(join(PUBLIC_DIR, "icon-512.png"), icon512);

  // 2. Apple touch icons: 180x180, solid black (no transparency)
  const apple = await renderPngFromSource(sourceBuffer, 180);
  writeFileSync(join(PUBLIC_DIR, "apple-touch-icon.png"), apple);
  writeFileSync(join(PUBLIC_DIR, "apple-icon.png"), apple);

  // 3. Multi-size favicon.ico (16, 32, 48)
  const icoPngs: { size: number; data: Buffer }[] = [];
  for (const size of [16, 32, 48]) {
    icoPngs.push({ size, data: await renderPngFromSource(sourceBuffer, size) });
  }
  writeFileSync(join(PUBLIC_DIR, "favicon.ico"), buildIco(icoPngs));

  // 4. SVG vector wrapper with embedded high-res raster & solid background
  const base64Data = icon512.toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${CANVAS_COLOR}"/>
  <image href="data:image/png;base64,${base64Data}" width="512" height="512"/>
</svg>\n`;
  writeFileSync(join(PUBLIC_DIR, "icon.svg"), svg);

  // 5. Web app manifest
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

  console.log("[favicons] successfully generated:");
  console.log("  ✓ icon-48.png (48x48)");
  console.log("  ✓ icon-96.png (96x96)");
  console.log("  ✓ icon-144.png (144x144)");
  console.log("  ✓ icon-192.png (192x192)");
  console.log("  ✓ icon-512.png (512x512)");
  console.log("  ✓ icon.png (512x512)");
  console.log("  ✓ apple-touch-icon.png (180x180)");
  console.log("  ✓ apple-icon.png (180x180)");
  console.log("  ✓ favicon.ico (16x16, 32x32, 48x48 multi-size)");
  console.log("  ✓ icon.svg (512x512 SVG wrapper)");
  console.log("  ✓ manifest.webmanifest (PWA)");
}

main().catch((error) => {
  console.error("[favicons] generation failed:", error);
  process.exit(1);
});

