"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ──────────────────────────────────────────────────────────────────────────────
// Draft cache — crash resilience for the article editor
// ──────────────────────────────────────────────────────────────────────────────
//
// The editor autosaves to the server after a typing pause, which leaves a window
// where a browser crash, an accidental tab close, or a dropped connection
// loses whatever was typed since the last successful save. On a new story
// that could be the entire piece, because nothing exists server-side yet.
//
// This caches the form to localStorage on every keystroke (throttled), and
// surfaces it on next load so the writer can decide what to do with it.
//
// It deliberately does NOT auto-apply the cache. The server copy may be newer
// -- the same article can be edited from another device, or a co-author may
// have saved in between -- and silently replacing newer server content with
// older local content is a worse failure than the one being fixed. The editor
// prompts instead.
// ──────────────────────────────────────────────────────────────────────────────

const PREFIX = "xsypher:draft:";

/** Prefixes used before the publication was renamed. A cache holds work the
 *  author has not saved to the server yet, so a rebrand must not be the reason
 *  a crash recovery comes up empty. Read in order, newest brand first. */
const LEGACY_PREFIXES = ["xcipher:draft:"];

const VERSION = 1;

/** Caches older than this are ignored: stale enough that restoring is likelier
 *  to confuse than to help. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface CachedDraft {
  version: number;
  /** Server article id, or null when the story has never been saved. */
  articleId: string | null;
  savedAt: string;
  values: Record<string, unknown>;
  bodyHtml: string;
  bodyJson?: Record<string, any> | null;
}

type DraftSnapshot = Pick<CachedDraft, 'values' | 'bodyHtml' | 'bodyJson'>;

/**
 * Cache key. New stories share one key (`new`) because they have no id yet;
 * saved stories key off the article id so two open drafts cannot collide.
 */
export function draftCacheKey(articleId: string | null | undefined): string {
  return `${PREFIX}${articleId || "new"}`;
}

/** Suffix of a cache key: the article id, or "new". */
function keySuffix(key: string): string {
  return key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
}

/** Every spelling a given draft could be stored under, newest brand first. */
function candidateKeys(key: string): string[] {
  const suffix = keySuffix(key);
  return [key, ...LEGACY_PREFIXES.map((p) => `${p}${suffix}`)];
}

function readCache(key: string): CachedDraft | null {
  if (typeof window === "undefined") return null;
  try {
    // Fall back through the pre-rebrand prefixes so a draft written before the
    // rename is still offered for recovery.
    let raw: string | null = null;
    let foundKey = key;
    for (const candidate of candidateKeys(key)) {
      const value = window.localStorage.getItem(candidate);
      if (value) {
        raw = value;
        foundKey = candidate;
        break;
      }
    }
    if (!raw) return null;

    // Discards below must target the key the data actually came from.
    key = foundKey;

    const parsed = JSON.parse(raw) as CachedDraft;

    // A cache written by an older build may not match the current form shape.
    if (parsed?.version !== VERSION) {
      window.localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - new Date(parsed.savedAt).getTime() > MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    // Corrupt JSON, or localStorage unavailable (Safari private mode throws on
    // access). Losing the cache is acceptable; breaking the editor is not.
    return null;
  }
}

export function clearDraftCache(articleId: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    // Clear the legacy spellings too. Leaving one behind would let a discarded
    // draft reappear as a restore prompt on the next visit.
    for (const key of candidateKeys(draftCacheKey(articleId))) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* non-fatal */
  }
}

interface UseDraftCacheOptions {
  articleId: string | null;
  /** Skip the restore prompt, e.g. before the editor has mounted content. */
  enabled?: boolean;
}

export function useDraftCache({ articleId, enabled = true }: UseDraftCacheOptions) {
  // Read once on mount, before any writes can overwrite what we are trying to
  // detect. Lazy initialiser so this runs during the first render, not after.
  const [recovered, setRecovered] = useState<CachedDraft | null>(() => {
    if (!enabled || typeof window === "undefined") return null;
    return readCache(draftCacheKey(articleId));
  });

  const lastWriteRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const snapshotRef = useRef<(() => DraftSnapshot) | null>(null);

  const write = useCallback(
    ({ values, bodyHtml, bodyJson }: DraftSnapshot) => {
      if (typeof window === "undefined") return;

      const payload: CachedDraft = {
        version: VERSION,
        articleId,
        savedAt: new Date().toISOString(),
        values,
        bodyHtml,
        bodyJson,
      };

      try {
        window.localStorage.setItem(draftCacheKey(articleId), JSON.stringify(payload));
      } catch {
        // Quota exceeded or storage disabled. The server autosave is still the
        // primary path, so this stays silent rather than nagging the writer.
      }
    },
    [articleId]
  );

  const flush = useCallback(() => {
    if (pendingRef.current !== null) window.clearTimeout(pendingRef.current);
    pendingRef.current = null;
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    if (snapshot) {
      lastWriteRef.current = Date.now();
      write(snapshot());
    }
  }, [write]);

  /**
   * Throttle snapshot creation as well as storage. Passing already serialized
   * HTML/JSON here would still do that expensive work on every keystroke.
   */
  const cache = useCallback(
    (snapshot: () => DraftSnapshot) => {
      snapshotRef.current = snapshot;
      const now = Date.now();
      const elapsed = now - lastWriteRef.current;

      if (elapsed >= 1000) {
        flush();
        return;
      }

      // Keep one trailing write, always reading the latest document.
      if (pendingRef.current === null) {
        pendingRef.current = window.setTimeout(flush, 1000 - elapsed);
      }
    },
    [flush]
  );

  useEffect(() => {
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [flush]);

  const dismissRecovery = useCallback(() => setRecovered(null), []);

  const discard = useCallback(() => {
    if (pendingRef.current !== null) window.clearTimeout(pendingRef.current);
    pendingRef.current = null;
    snapshotRef.current = null;
    clearDraftCache(articleId);
    setRecovered(null);
  }, [articleId]);

  return { recovered, dismissRecovery, discard, cache, clearCache: discard };
}
