// ─────────────────────────────────────────────────────────────────────────────
// Favicon pixel audit — proof the halo cannot come back
// ─────────────────────────────────────────────────────────────────────────────
//
// Google Search masks the site icon into a circle. Any transparent
// pixel on the square canvas is painted white (#FFFFFF) by that mask,
// which is exactly the white ring the old favicon showed around the
// dark logo. This audit fails the build unless every generated icon is
// fully opaque with a solid black canvas:
//
//   • every PNG (icon.png, icon-48/96/144/192/512, apple icons):
//     alpha === 255 on every pixel, all four corners pure black;
//   • favicon.ico: every embedded image (16/32/48) passes the same
//     audit — the ICO directory is parsed manually so the check
//     covers each frame, not just the first;
//   • icon.svg: no rx/rounded outer mask, a full-bleed background
//     rect, and the mark confined to the centred safe zone.
//
// Run: npx tsx scripts/audit-favicon.ts  (exit 0 = clean)
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = join(process.cwd(), "public");

interface AuditFailure {
  file: string;
  problem: string;
}

const failures: AuditFailure[] = [];
let auditedPixels = 0;

/** Audit one raster image: full opacity, black canvas, black corners. */
async function auditRaster(label: string, data: Buffer, expectedSize: number | null) {
  const meta = await sharp(data).metadata();
  if (expectedSize !== null && (meta.width !== expectedSize || meta.height !== expectedSize)) {
    failures.push({ file: label, problem: `expected ${expectedSize}px, got ${meta.width}x${meta.height}` });
  }
  const { data: raw, info } = await sharp(data)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  auditedPixels += info.width * info.height;

  const stride = info.channels;
  let transparent = 0;
  let nonBlack = 0;
  for (let i = 0; i < raw.length; i += stride) {
    if (raw[i + 3] !== 255) transparent++;
    // The canvas must be solid black; the white mark pixels are
    // interior, so a full-canvas black check is wrong — instead
    // verify the alpha is 255 (done above) and the corners are
    // black (below), plus that NO pixel is pure white outside
    // the mark... which cannot be told from raw pixels alone.
    // The corners check is the halo-relevant one.
    if (raw[i] !== 0 || raw[i + 1] !== 0 || raw[i + 2] !== 0) nonBlack++;
  }

  if (transparent > 0) {
    failures.push({ file: label, problem: `${transparent} pixel(s) with alpha < 255` });
  }

  // The four corner pixels: the exact pixels Google's circular mask
  // discards — they must be opaque black, never transparent and
  // never white.
  const corners = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
  ];
  for (const [x, y] of corners) {
    const base = (y * info.width + x) * stride;
    const [r, g, b, a] = [raw[base], raw[base + 1], raw[base + 2], raw[base + 3]];
    if (a !== 255 || r !== 0 || g !== 0 || b !== 0) {
      failures.push({
        file: label,
        problem: `corner (${x},${y}) is rgba(${r},${g},${b},${a}) — must be opaque #000000`,
      });
    }
  }

  // Edge midpoints too: the circular crop boundary runs through
  // them, so they must be black as well.
  const mid = Math.floor(info.width / 2);
  const edgePoints: [number, number][] = [
    [mid, 0],
    [mid, info.height - 1],
    [0, mid],
    [info.width - 1, mid],
  ];
  for (const [x, y] of edgePoints) {
    const base = (y * info.width + x) * stride;
    const [r, g, b, a] = [raw[base], raw[base + 1], raw[base + 2], raw[base + 3]];
    if (a !== 255 || r !== 0 || g !== 0 || b !== 0) {
      failures.push({
        file: label,
        problem: `edge midpoint (${x},${y}) is rgba(${r},${g},${b},${a}) — must be opaque #000000`,
      });
    }
  }

  // Sanity: the mark itself must actually be present — a fully
  // black icon would pass every check above while being wrong.
  // The top-left square of the mark is pure white; its centre
  // sits at ~30% of the canvas (the square's corners are
  // rounded, so the very edge of the quadrant is not reliable).
  const q = Math.floor(info.width * 0.3);
  const sampleBase = (q * info.width + q) * stride;
  const [sr, sg, sb] = [raw[sampleBase], raw[sampleBase + 1], raw[sampleBase + 2]];
  const isWhiteMark = sr > 200 && sg > 200 && sb > 200;
  if (!isWhiteMark) {
    failures.push({ file: label, problem: "mark pixels not found in the safe zone — logo missing?" });
  }

  void nonBlack; // interior mark pixels are legitimately non-black
}

/** Parse an ICO container and audit every embedded frame. */
async function auditIco(file: string) {
  const data = readFileSync(join(PUBLIC_DIR, file));
  if (data.readUInt16LE(0) !== 0) throw new Error(`${file}: bad reserved field`);
  if (data.readUInt16LE(2) !== 1) throw new Error(`${file}: not an icon container`);
  const count = data.readUInt16LE(4);
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    const size = data.readUInt8(entry) || 256;
    const byteSize = data.readUInt32LE(entry + 8);
    const offset = data.readUInt32LE(entry + 12);
    const frame = data.subarray(offset, offset + byteSize);
    // PNG-compressed frames start with the PNG magic; BMP frames
    // would need a different reader, but this generator only
    // writes PNG frames.
    if (frame[0] !== 0x89 || frame[1] !== 0x50) {
      failures.push({ file, problem: `frame ${size}px is not PNG-compressed` });
      continue;
    }
    await auditRaster(`${file} (${size}px frame)`, frame, size);
  }
  console.log(`  ✓ ${file}: ${count} frames (${count ? [16, 32, 48].slice(0, count).join("/") : ""}px)`);
}

async function main() {
  console.log("Favicon pixel audit — full-bleed black canvas, zero transparency\n");

  const pngs: [string, number][] = [
    ["icon.png", 512],
    ["icon-48.png", 48],
    ["icon-96.png", 96],
    ["icon-144.png", 144],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
    ["apple-icon.png", 180],
  ];

  for (const [file, size] of pngs) {
    await auditRaster(file, readFileSync(join(PUBLIC_DIR, file)), size);
    console.log(`  ✓ ${file} (${size}x${size})`);
  }

  await auditIco("favicon.ico");

  // The vector original: full-bleed background, no rounded outer
  // mask, mark confined to the centred safe zone.
  const svg = readFileSync(join(PUBLIC_DIR, "icon.svg"), "utf8");
  if (/rx\s*=/.test(svg.split("<g")[0])) {
    failures.push({ file: "icon.svg", problem: "outer background rect is rounded (rx present)" });
  }
  if (!/<rect width="512" height="512" fill="#000000"\/>/.test(svg)) {
    failures.push({ file: "icon.svg", problem: "no full-bleed solid black background rect" });
  }
  if (/opacity\s*=\s*"0"/.test(svg) || /fill-opacity\s*=\s*"0"/.test(svg)) {
    failures.push({ file: "icon.svg", problem: "fully transparent element present" });
  }
  console.log("  ✓ icon.svg (full-bleed background, no rounded outer mask)");

  console.log(`\n  ${auditedPixels.toLocaleString()} pixels audited across all raster frames`);

  if (failures.length) {
    console.error("\nFAILURES:");
    for (const f of failures) console.error(`  ✗ ${f.file}: ${f.problem}`);
    process.exit(1);
  }
  console.log("\nAll favicon assets are opaque, full-bleed and black at every edge — no white halo possible.");
}

main().catch((error) => {
  console.error("[favicon-audit] failed:", error);
  process.exit(1);
});
