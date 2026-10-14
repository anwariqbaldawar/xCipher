/**
 * Font readiness for Mermaid.
 *
 * Mermaid sizes every node from the label's measured bounding box, so a label
 * measured with a fallback face (Samsung Internet / Android WebView often start
 * rendering before the variable font has arrived) produces a box that is too
 * small for the text the browser eventually paints with the webfont. The label
 * then runs past the edge of its polygon.
 *
 * Two waits are needed, not one:
 *
 *  1. the *font data* (`document.fonts.load` for the exact weights the labels
 *     use, then `document.fonts.ready`, which also resolves when a download
 *     fails so a broken font request cannot leave a diagram unrendered), and
 *  2. a *layout frame*, because `fonts.ready` resolves before the browser has
 *     re-laid-out the text it just swapped in. Measuring in that window still
 *     returns the pre-swap metrics.
 */

/** Mermaid measures labels in document.body before React inserts the SVG. */
export async function waitForMermaidFonts(text: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  const family = getComputedStyle(document.documentElement).getPropertyValue('--f-ui').trim() || 'sans-serif';
  // Request the actual label glyphs, including subsets and Markdown emphasis.
  // A failed font request can still render with the browser's settled fallback.
  await Promise.allSettled([
    document.fonts.load(`400 16px ${family}`, text),
    document.fonts.load(`700 16px ${family}`, text),
    document.fonts.load(`italic 400 16px ${family}`, text),
  ]);
  await document.fonts.ready;
}

/**
 * Resolve after the browser has had two chances to lay out.
 *
 * A single frame is not enough on WebViews: the first callback can still run
 * before the style/layout pass that follows a font swap. `requestAnimationFrame`
 * is used where it exists (every browser we ship to) and a macrotask otherwise,
 * so a stripped-down test environment cannot hang the render.
 */
export function waitForNextLayoutFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') {
    return new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Everything that has to be true before Mermaid is allowed to measure: the
 * label glyphs are loaded and the layout that uses them has settled.
 */
export async function prepareMermaidMeasurement(text: string): Promise<void> {
  await waitForMermaidFonts(text);
  await waitForNextLayoutFrame();
}

/** True while the Font Loading API still has font work queued. */
export function mermaidFontsStillLoading(): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  return document.fonts.status !== 'loaded';
}

/**
 * Subscribe to "a font finished loading".
 *
 * Used to invalidate a diagram that was rendered while a face was still on the
 * wire — the one case the waits above cannot cover, because the download can
 * start after the render already finished. Returns an unsubscribe function.
 */
export function onMermaidFontsSettled(callback: () => void): () => void {
  if (typeof document === 'undefined' || !document.fonts?.addEventListener) return () => {};
  const handler = () => callback();
  document.fonts.addEventListener('loadingdone', handler);
  return () => document.fonts.removeEventListener('loadingdone', handler);
}
