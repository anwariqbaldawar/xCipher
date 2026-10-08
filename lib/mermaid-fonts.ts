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
