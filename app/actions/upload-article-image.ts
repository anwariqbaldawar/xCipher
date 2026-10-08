"use server";

import { getCurrentUser } from "@/lib/auth";
import { authorize } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/lib/db/schema";
import { uploadFileToR2, buildObjectKey, getR2Config } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, formatBytes, sniffImageMime } from "@/lib/upload-constraints";
import { lookup } from "node:dns/promises";

export interface UploadResult {
  ok: boolean;
  url?: string;
  width?: number;
  height?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SSRF guard for external image imports
// ─────────────────────────────────────────────────────────────────────────────
//
// processExternalImage fetches a user-supplied URL from the server. Without
// these checks an authenticated user could probe the internal network, read
// cloud metadata endpoints (169.254.169.254) or hit localhost services.
// ─────────────────────────────────────────────────────────────────────────────

/** True for loopback, private, link-local, multicast and reserved addresses. */
function isPrivateAddress(ip: string): boolean {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // cloud metadata
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("fe80:") || v6.startsWith("fc") || v6.startsWith("fd")) return true;
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice("::ffff:".length));
  return false;
}

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Validate that a URL is a public http(s) address. Resolves the hostname and
 * rejects every resolved address in a private range, which also defeats DNS
 * rebinding (a host that resolves publicly at check time and privately later).
 */
async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("That URL is not valid.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) image URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (IPV4_LITERAL.test(hostname) || hostname.includes(":")) {
    if (isPrivateAddress(hostname)) {
      throw new Error("Private and internal addresses are not allowed.");
    }
    return url;
  }

  let results: { address: string }[];
  try {
    results = await lookup(hostname, { verbatim: true, all: true });
  } catch {
    throw new Error("That host could not be resolved.");
  }
  if (results.length === 0) {
    throw new Error("That host could not be resolved.");
  }
  for (const { address } of results) {
    if (isPrivateAddress(address)) {
      throw new Error("Private and internal addresses are not allowed.");
    }
  }
  return url;
}

/** Read a response body with a hard byte cap, aborting early when exceeded. */
async function readBodyWithCap(response: Response, cap: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > cap) {
    throw new Error("That image exceeds the size limit.");
  }

  if (!response.body) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > cap) {
        await reader.cancel();
        throw new Error("That image exceeds the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function uploadArticleImage(formData: FormData): Promise<UploadResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to upload images." };
  }

  const [dbUser] = await db.select({ role: userTable.role, isActive: userTable.isActive }).from(userTable).where(eq(userTable.id, user.id)).limit(1);

  if (!dbUser?.isActive) {
    return { ok: false, error: "This account is not active." };
  }

  if (!authorize(dbUser.role, "article.create")) {
    return { ok: false, error: "You do not have permission to upload images." };
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, error: "No file was received." };
  }

  const blob = file as File;

  if (blob.size === 0) {
    return { ok: false, error: "That file is empty." };
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That image is ${formatBytes(blob.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }

  const arrayBuffer = await blob.arrayBuffer();
  const input = new Uint8Array(arrayBuffer);

  if (input.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `That image exceeds ${formatBytes(MAX_UPLOAD_BYTES)}.` };
  }

  const sniffed = sniffImageMime(input);
  if (!sniffed) {
    return {
      ok: false,
      error: "That file is not a JPEG, PNG, WebP or GIF. Renaming a file does not change its format.",
    };
  }

  try {
    const config = getR2Config();
    if ("error" in config) {
      return { ok: false, error: config.error };
    }

    const sniffedType = sniffed;

    const key = buildObjectKey("xsypher/articles", sniffedType.split("/")[1]);
    const blobToUpload = new Blob([input], { type: sniffedType });
    const url = await uploadFileToR2(blobToUpload, config.bucket, key);

    return {
      ok: true,
      url,
      width: undefined,
      height: undefined,
    };
  } catch (e) {
    console.error("[upload-article-image] R2 upload failed:", e);
    return { ok: false, error: "The image could not be uploaded. Please try again." };
  }
}

export async function processExternalImage(url: string): Promise<UploadResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to process images." };
  }

  const [dbUser] = await db.select({ role: userTable.role, isActive: userTable.isActive }).from(userTable).where(eq(userTable.id, user.id)).limit(1);

  if (!dbUser?.isActive) {
    return { ok: false, error: "This account is not active." };
  }

  if (!authorize(dbUser.role, "article.create")) {
    return { ok: false, error: "You do not have permission to upload images." };
  }

  if (!url || typeof url !== "string") {
    return { ok: false, error: "Invalid URL provided." };
  }

  try {
    // SSRF guard: public http(s) hosts only, no redirects, private ranges
    // rejected at both the literal and the resolved-DNS level.
    let target: URL;
    try {
      target = await assertPublicHttpUrl(url);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "That URL is not allowed." };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        headers: {
          "User-Agent": "xSypher-Bot/1.0",
          "Accept": "image/jpeg, image/png, image/webp, image/gif"
        },
        // Never follow redirects: a public URL can redirect to an internal one.
        redirect: "manual",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status >= 300 && response.status < 400) {
      return { ok: false, error: "Redirects are not followed for external images." };
    }

    if (!response.ok) {
      return { ok: false, error: `Failed to fetch external image: ${response.statusText}` };
    }

    let input: Uint8Array<ArrayBuffer>;
    try {
      input = await readBodyWithCap(response, MAX_UPLOAD_BYTES);
    } catch (e) {
      console.error("[processExternalImage] body read failed:", e);
      return {
        ok: false,
        error: e instanceof Error && e.message.includes("size limit")
          ? `That image exceeds ${formatBytes(MAX_UPLOAD_BYTES)}.`
          : "Failed to read external image data.",
      };
    }

    const sniffed = sniffImageMime(input);
    if (!sniffed) {
      return { ok: false, error: "External file is not a supported image format." };
    }

    const config = getR2Config();
    if ("error" in config) {
      return { ok: false, error: config.error };
    }

    const sniffedType = sniffed;

    const key = buildObjectKey("xsypher/articles/external", sniffedType.split("/")[1]);
    const blobToUpload = new Blob([input], { type: sniffedType });
    const finalUrl = await uploadFileToR2(blobToUpload, config.bucket, key);

    return {
      ok: true,
      url: finalUrl
    };
  } catch (e) {
    console.error("[processExternalImage] R2 upload failed:", e);
    return { ok: false, error: "Failed to import image from this URL. The host may be blocking downloads." };
  }
}
