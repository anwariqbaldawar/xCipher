// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare R2 client
// ─────────────────────────────────────────────────────────────────────────────

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBase: string;
}

export function getR2Config(): R2Config | { error: string } {
  // Indirect access keeps NEXT_PUBLIC_* from being frozen by the Next.js build.
  const env = process.env;
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET;
  const rawPublicBase = (env.NEXT_PUBLIC_R2_PUBLIC_BASE || "").trim();

  const missing = [
    !accountId && "R2_ACCOUNT_ID",
    !accessKeyId && "R2_ACCESS_KEY_ID",
    !secretAccessKey && "R2_SECRET_ACCESS_KEY",
    !bucket && "R2_BUCKET",
    !rawPublicBase && "NEXT_PUBLIC_R2_PUBLIC_BASE",
  ].filter(Boolean);

  if (missing.length) {
    return { error: `Image uploads are not configured. Missing: ${missing.join(", ")}.` };
  }
  
  const publicBase = rawPublicBase.replace(/\/+$/, "");

  return {
    accountId: accountId as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    bucket: bucket as string,
    publicBase,
  };
}

export async function getR2Client(config: R2Config) {
  const { AwsClient } = await import("aws4fetch");
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

export function buildObjectKey(prefix: string, extension: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID();
  return `${prefix}/${yyyy}/${mm}/${id}.${extension}`;
}

export async function uploadFileToR2(file: File | Blob, bucket: string, key: string): Promise<string> {
  const config = getR2Config();
  if ("error" in config) {
    throw new Error(config.error);
  }
  
  const aws = await getR2Client(config);
  const endpoint = new URL(`https://${config.accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  
  const buffer = new Uint8Array(await file.arrayBuffer());
  const type = file.type || "application/octet-stream";
  
  const res = await aws.fetch(endpoint.toString(), {
    method: "PUT",
    body: buffer,
    headers: {
      "Content-Type": type,
      "Content-Length": String(buffer.byteLength),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 Upload Failed: ${res.status} ${errText}`);
  }
  
  return `${config.publicBase}/${key}`;
}

export async function uploadToR2(key: string, body: string, contentType: string = "application/json"): Promise<string> {
  const config = getR2Config();
  if ("error" in config) throw new Error(config.error);
  
  const aws = await getR2Client(config);
  const endpoint = new URL(`https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`);
  
  const payload = typeof body === "string" ? new TextEncoder().encode(body) : body;

  const res = await aws.fetch(endpoint.toString(), {
    method: "PUT",
    body: payload,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(payload.byteLength),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`R2 Upload Failed: ${res.status} ${errText}`);
  }
  
  return key; // We store relative path in db
}

export async function fetchFromR2(key: string | null): Promise<any> {
  if (!key) return null;
  const config = getR2Config();
  if ("error" in config) return null;

  try {
    const url = `${config.publicBase}/${key}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    return null;
  }
}

export async function deleteKeyFromR2(key: string): Promise<void> {
  if (!key) return;
  const config = getR2Config();
  if ("error" in config) return;

  const aws = await getR2Client(config);
  const endpoint = new URL(`https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`);

  try {
    await aws.fetch(endpoint.toString(), { method: "DELETE" });
  } catch (e) {
    console.error("[storage] Failed to delete key from R2:", e);
  }
}

export async function deleteFileFromR2(url: string): Promise<void> {
  const config = getR2Config();
  if ("error" in config) return;
  if (!url.startsWith(config.publicBase)) return;
  
  const key = url.slice(config.publicBase.length).replace(/^\/+/, "");
  if (!key) return;

  const aws = await getR2Client(config);
  const endpoint = new URL(`https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key}`);

  try {
    await aws.fetch(endpoint.toString(), { method: "DELETE" });
  } catch (e) {
    console.error("[storage] Failed to delete file from R2:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Key handling and bulk deletion
// ─────────────────────────────────────────────────────────────────────────────
//
// Deleting an article used to call deleteFileFromR2() once per image it could
// find with two regexes, and never touched the keys at all in the bulk path.
// Anything the regexes missed -- a srcset candidate, a video poster, an image
// referenced only from the TipTap JSON -- stayed in the bucket forever, and R2
// has no way to know an object is unreferenced. That is how a placeholder image
// from a deleted test post can still be served (and indexed by Google Images)
// long after the row is gone.
//
// These helpers are the primitive the deletion pipeline and the cleanup script
// both build on: normalise any stored reference to a bucket key, then delete a
// set of keys in the batch API, falling back to individual DELETEs.

/**
 * The bucket key behind any stored reference.
 *
 * Accepts a full public URL, a root-relative path, or a bare key. Returns null
 * for anything that is not hosted in this bucket (an external host, a data URI,
 * a bare Pexels id from the pre-R2 era) so callers never send a foreign path to
 * a delete request.
 */
export function r2KeyFromUrl(value: string | null | undefined, publicBase?: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const config = getR2Config();
  const base = (publicBase ?? (("error" in config ? "" : config.publicBase) || "")).replace(/\/+$/, "");

  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    if (!base || !raw.startsWith(base)) return null;
    path = raw.slice(base.length);
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    // Any other scheme — `data:`, `blob:`, `mailto:` — is not a bucket key. It
    // would be harmless to send one to a delete request, but returning it as a
    // key also puts it in the report a human reads, where it looks like a file
    // that is missing from the bucket.
    return null;
  } else if (path.startsWith("/")) {
    // Root-relative: only meaningful when the public base is a path on this
    // origin (`/cdn/...`). Otherwise it is a file in `public/`.
    if (!base || !base.startsWith("/") || !path.startsWith(base)) return null;
    path = path.slice(base.length);
  }

  // Strip a query string and fragment, then decode percent-encoding, so a
  // stored `…/truck%20art.png?w=640` and a listed `…/truck art.png` compare
  // equal. Object keys are stored decoded in the bucket.
  let key = path.split("?")[0].split("#")[0].replace(/^\/+/, "");
  try {
    key = decodeURIComponent(key);
  } catch {
    // Malformed escape: use the raw value rather than throwing.
  }
  return key || null;
}

/**
 * The XML body for the S3 `DeleteObjects` (POST ?delete) batch call.
 *
 * Exported for tests: getting this wrong fails softly on some S3
 * implementations, which is exactly the case worth pinning.
 */
export function buildDeleteObjectsXml(keys: readonly string[]): string {
  const objects = keys
    .map((key) => `  <Object><Key>${escapeXmlText(key)}</Key></Object>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Delete>\n${objects}\n</Delete>`;
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface R2DeleteResult {
  /** Keys that were attempted. */
  requested: string[];
  /** Keys R2 confirmed deleted (or reported as absent). */
  deleted: string[];
  /** Keys that could not be deleted, with the reason. */
  failed: { key: string; error: string }[];
}

/** R2/S3 caps a batch delete at 1000 keys per request. */
const DELETE_BATCH_SIZE = 1000;

/**
 * Delete many keys, using the batch API and falling back to single DELETEs.
 *
 * The fallback matters: this runs inside a destructive admin action, so a
 * batch-request failure (a signature quirk, a proxy in front of the endpoint)
 * must not silently leave every asset behind. If the batch call is rejected,
 * each key is retried on its own so one bad request cannot orphan a whole
 * article's media.
 */
export async function deleteKeysFromR2(
  keys: readonly (string | null | undefined)[],
  publicBaseOverride?: string,
): Promise<R2DeleteResult> {
  const config = getR2Config();
  const unique = [
    ...new Set(
      keys
        .map((value) => r2KeyFromUrl(value ?? null, publicBaseOverride))
        .filter((key): key is string => Boolean(key)),
    ),
  ];

  if ("error" in config) {
    return {
      requested: unique,
      deleted: [],
      failed: unique.map((key) => ({ key, error: config.error })),
    };
  }
  if (!unique.length) return { requested: [], deleted: [], failed: [] };

  const aws = await getR2Client(config);
  const deleted: string[] = [];
  const failed: { key: string; error: string }[] = [];

  for (let i = 0; i < unique.length; i += DELETE_BATCH_SIZE) {
    const batch = unique.slice(i, i + DELETE_BATCH_SIZE);
    const outcome = await deleteBatch(aws, config, batch);
    deleted.push(...outcome.deleted);
    failed.push(...outcome.failed);
  }

  return { requested: unique, deleted, failed };
}

type AwsClientLike = Awaited<ReturnType<typeof getR2Client>>;

async function deleteBatch(
  aws: AwsClientLike,
  config: R2Config,
  keys: readonly string[],
): Promise<{ deleted: string[]; failed: { key: string; error: string }[] }> {
  const endpoint = new URL(`https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`);
  endpoint.searchParams.set("delete", "");

  const body = buildDeleteObjectsXml(keys);

  try {
    // Content-MD5 is required by the S3 DeleteObjects spec. node:crypto is
    // available on Cloudflare Workers through nodejs_compat, which this app
    // already relies on for crypto.createSign in lib/google-indexing.ts.
    const { createHash } = await import("node:crypto");
    const md5 = createHash("md5").update(body).digest("base64");

    const res = await aws.fetch(endpoint.toString(), {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/xml",
        "Content-MD5": md5,
        "Content-Length": String(new TextEncoder().encode(body).byteLength),
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return deleteOneByOne(aws, config, keys, `batch delete failed: ${res.status} ${detail.slice(0, 200)}`);
    }

    const xml = await res.text().catch(() => "");
    // Only keys inside <Error> blocks failed; S3 reports success per key and
    // omits it from the response body, so anything absent from that list was
    // deleted.
    const failures = new Map<string, string>();
    for (const match of xml.matchAll(/<Error>([\s\S]*?)<\/Error>/g)) {
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(match[1])?.[1];
      if (!key) continue;
      const message = /<Message>([\s\S]*?)<\/Message>/.exec(match[1])?.[1];
      failures.set(unescapeXmlText(key), unescapeXmlText(message ?? "delete failed"));
    }

    const deleted = keys.filter((key) => !failures.has(key));
    const failed = [...failures].map(([key, error]) => ({ key, error }));
    return { deleted, failed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return deleteOneByOne(aws, config, keys, `batch delete threw: ${message}`);
  }
}

function unescapeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Sequential-with-small-concurrency fallback used when a batch call fails. */
async function deleteOneByOne(
  aws: AwsClientLike,
  config: R2Config,
  keys: readonly string[],
  reason: string,
): Promise<{ deleted: string[]; failed: { key: string; error: string }[] }> {
  console.warn(`[storage] ${reason} — retrying ${keys.length} key(s) individually.`);

  const deleted: string[] = [];
  const failed: { key: string; error: string }[] = [];
  const CONCURRENCY = 8;

  for (let i = 0; i < keys.length; i += CONCURRENCY) {
    const slice = keys.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (key) => {
        const endpoint = new URL(
          `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
        );
        try {
          const res = await aws.fetch(endpoint.toString(), { method: "DELETE" });
          // 204 is the documented success; R2 also answers 200. 404 means the
          // object is already gone, which is the outcome we wanted.
          if (res.ok || res.status === 404) deleted.push(key);
          else failed.push({ key, error: `DELETE ${res.status}` });
        } catch (error) {
          failed.push({ key, error: error instanceof Error ? error.message : String(error) });
        }
      }),
    );
  }

  return { deleted, failed };
}

export interface R2ObjectInfo {
  key: string;
  size: number;
  lastModified: Date | null;
}

/**
 * List every object under a prefix (ListObjectsV2, paginated).
 *
 * Used by the orphan sweep: before it can delete anything it has to know what
 * the bucket actually contains, because the database only records the assets an
 * article *currently* references.
 */
export async function listR2Objects(prefix = "", limit = Infinity): Promise<R2ObjectInfo[]> {
  const config = getR2Config();
  if ("error" in config) throw new Error(config.error);

  const aws = await getR2Client(config);
  const objects: R2ObjectInfo[] = [];
  let token: string | null = null;

  do {
    const endpoint = new URL(`https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`);
    endpoint.searchParams.set("list-type", "2");
    endpoint.searchParams.set("max-keys", "1000");
    if (prefix) endpoint.searchParams.set("prefix", prefix);
    if (token) endpoint.searchParams.set("continuation-token", token);

    const res = await aws.fetch(endpoint.toString(), { method: "GET" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`R2 list failed: ${res.status} ${detail.slice(0, 200)}`);
    }

    const xml = await res.text();
    for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = match[1];
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1];
      if (!key) continue;
      const size = Number(/<Size>(\d+)<\/Size>/.exec(block)?.[1] ?? 0);
      const lastModifiedRaw = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(block)?.[1];
      const lastModified = lastModifiedRaw ? new Date(lastModifiedRaw) : null;
      objects.push({
        key: unescapeXmlText(key),
        size: Number.isFinite(size) ? size : 0,
        lastModified: lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : null,
      });
      if (objects.length >= limit) return objects;
    }

    const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml);
    token = truncated ? (/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null) : null;
  } while (token);

  return objects;
}

