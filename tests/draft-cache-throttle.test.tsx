// @vitest-environment jsdom
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { draftCacheKey, useDraftCache } from '@/lib/use-draft-cache';

let root: Root;
let host: HTMLDivElement;
let cache: ReturnType<typeof useDraftCache>;
function Harness({ articleId = 'draft-a' }: { articleId?: string }) {
  const draftCache = useDraftCache({ articleId });
  useEffect(() => { cache = draftCache; }, [draftCache]);
  return null;
}
const snapshot = (text: string) => ({ values: { title: text }, bodyHtml: `<p>${text}</p>`, bodyJson: { type: 'doc' } });
const read = (id = 'draft-a') => JSON.parse(localStorage.getItem(draftCacheKey(id)) || 'null');

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('draft snapshot throttling', () => {
  it('serializes only the latest snapshot in a burst of edits', () => {
    const first = vi.fn(() => snapshot('first'));
    const middle = vi.fn(() => snapshot('middle'));
    const last = vi.fn(() => snapshot('last'));
    cache.cache(first);
    vi.advanceTimersByTime(100);
    cache.cache(middle);
    vi.advanceTimersByTime(100);
    cache.cache(last);
    expect(first).toHaveBeenCalledTimes(1);
    expect(middle).not.toHaveBeenCalled();
    expect(last).not.toHaveBeenCalled();
    vi.advanceTimersByTime(800);
    expect(last).toHaveBeenCalledTimes(1);
    expect(read().bodyHtml).toBe('<p>last</p>');
    expect(read().bodyJson).toEqual({ type: 'doc' });
  });

  it.each(['beforeunload', 'pagehide'])('flushes the final edit on %s', event => {
    cache.cache(() => snapshot('first'));
    cache.cache(() => snapshot('final'));
    window.dispatchEvent(new Event(event));
    expect(read().values.title).toBe('final');
  });

  it('flushes when the tab is hidden', () => {
    cache.cache(() => snapshot('first'));
    cache.cache(() => snapshot('final'));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(read().values.title).toBe('final');
    vi.restoreAllMocks();
  });

  it('flushes the old article before switching the cache key', () => {
    cache.cache(() => snapshot('first'));
    cache.cache(() => snapshot('final-a'));
    act(() => root.render(<Harness articleId="draft-b" />));
    expect(read().values.title).toBe('final-a');
    cache.cache(() => snapshot('first-b'));
    vi.advanceTimersByTime(1000);
    expect(read('draft-b').values.title).toBe('first-b');
  });

  it('cancels pending writes when the user discards a cache', () => {
    cache.cache(() => snapshot('first'));
    cache.cache(() => snapshot('discarded'));
    act(() => cache.discard());
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event('pagehide'));
    expect(read()).toBeNull();
  });
});
