import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { authorize } from "@/lib/capabilities";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/lib/db/schema";
import { uploadFileToR2, buildObjectKey, getR2Config } from "@/lib/storage";
import {
  MAX_UPLOAD_BYTES,
  MAX_IMAGE_WIDTH,
  WEBP_QUALITY,
  formatBytes,
  sniffImageMime,
  type AllowedUploadMime,
} from "@/lib/upload-constraints";

const MAX_INPUT_PIXELS = 64_000_000;

async function normalizeUploadBytes(
  input: Uint8Array,
  sniffed: AllowedUploadMime,
): Promise<{ bytes: Uint8Array; mime: AllowedUploadMime }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(input, {
    limitInputPixels: MAX_INPUT_PIXELS,
    animated: sniffed === "image/gif",
  }).metadata();

  if (!meta.width || !meta.height || meta.width * meta.height > MAX_INPUT_PIXELS) {
    throw new Error("Invalid or oversized image dimensions.");
  }

  if (sniffed === "image/gif") {
    return { bytes: input, mime: sniffed };
  }

  const out = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { bytes: new Uint8Array(out), mime: "image/webp" };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Sign in to upload images." }, { status: 401 });
    }

    const rl = await checkRateLimit("upload:user", user.id, { limit: 60, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "Too many uploads. Please wait a few minutes and try again." }, { status: 429 });
    }

    const [dbUser] = await db.select({ role: userTable.role, isActive: userTable.isActive })
      .from(userTable).where(eq(userTable.id, user.id)).limit(1);

    if (!dbUser?.isActive) {
      return NextResponse.json({ ok: false, error: "This account is not active." }, { status: 403 });
    }

    if (!authorize(dbUser.role, "article.create")) {
      return NextResponse.json({ ok: false, error: "You do not have permission to upload images." }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error("[api/upload] formData parsing failed:", e);
      return NextResponse.json({ ok: false, error: "Failed to parse upload request." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "No file was received." }, { status: 400 });
    }

    const blob = file as File;

    if (blob.size === 0) {
      return NextResponse.json({ ok: false, error: "That file is empty." }, { status: 400 });
    }

    if (blob.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({
        ok: false,
        error: `That image is ${formatBytes(blob.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
      }, { status: 400 });
    }

    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await blob.arrayBuffer();
    } catch (e) {
      console.error("[api/upload] arrayBuffer conversion failed:", e);
      return NextResponse.json({ ok: false, error: "Failed to read file data." }, { status: 400 });
    }
    const input = new Uint8Array(arrayBuffer);

    if (input.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: `That image exceeds ${formatBytes(MAX_UPLOAD_BYTES)}.` }, { status: 400 });
    }

    const sniffed = sniffImageMime(input);
    if (!sniffed) {
      return NextResponse.json({
        ok: false,
        error: "That file is not a JPEG, PNG, WebP or GIF. Renaming a file does not change its format.",
      }, { status: 400 });
    }

    const config = getR2Config();
    if ("error" in config) {
      return NextResponse.json({ ok: false, error: config.error }, { status: 500 });
    }

    const normalized = await normalizeUploadBytes(input, sniffed);
    const key = buildObjectKey("xsypher/articles", normalized.mime.split("/")[1]);
    const blobToUpload = new Blob([normalized.bytes as Uint8Array<ArrayBuffer>], { type: normalized.mime });
    const url = await uploadFileToR2(blobToUpload, config.bucket, key);
    
    return NextResponse.json({
      ok: true,
      url,
    });
  } catch (e) {
    console.error("[api/upload] Image upload failed:", e);
    return NextResponse.json({ ok: false, error: "The image could not be uploaded. Please try again." }, { status: 500 });
  }
}
