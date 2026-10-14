import { buildMermaidConfig } from "@/lib/mermaid-config";
import { prepareMermaidMeasurement } from "@/lib/mermaid-fonts";

/**
 * The single Mermaid render path.
 *
 * Both the editor's node view and the public article viewer call this, which is
 * what guarantees a diagram is measured and drawn identically in the two places:
 * one config (see `lib/mermaid-config.ts`), one set of waits, one error shape.
 *
 * Sequence, in order, and all of it deliberate:
 *   1. `prepareMermaidMeasurement` — label glyphs loaded *and* a layout frame
 *      after them, so `getBoundingClientRect()` inside Mermaid sees final font
 *      metrics rather than a fallback face.
 *   2. `mermaid.initialize(buildMermaidConfig(isDark))` — immediately before the
 *      render, because `initialize` mutates Mermaid's global config and the two
 *      viewers would otherwise overwrite each other's theme.
 *   3. `mermaid.render(id, code)` with a unique DOM id per attempt; Mermaid
 *      namespaces its generated `<style>` and `themeCSS` with that id, so two
 *      diagrams on one page never share rules.
 */

export interface MermaidRenderResult {
  /** Rendered `<svg>` markup, or an empty string when the source is invalid. */
  svg: string;
  /** Human-readable syntax error, when the diagram could not be rendered. */
  error?: string;
}

export interface MermaidRenderOptions {
  isDark: boolean;
  /** Prefix for the generated SVG id, e.g. `mermaid-frontend`. */
  idPrefix?: string;
  /** Set by a caller that has unmounted; the result is discarded when true. */
  isCancelled?: () => boolean;
}

/** A DOM-id-safe unique suffix. `crypto.randomUUID` needs a secure context. */
function uniqueSuffix(): string {
  const id = globalThis.crypto?.randomUUID?.();
  if (id) return id;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Normalise whatever Mermaid throws into a message the editor can show. */
export function describeMermaidError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Invalid diagram syntax";
}

export async function renderMermaidDiagram(
  code: string,
  { isDark, idPrefix = "mermaid", isCancelled }: MermaidRenderOptions,
): Promise<MermaidRenderResult> {
  const source = code.trim();
  if (!source) return { svg: "" };

  await prepareMermaidMeasurement(source);
  if (isCancelled?.()) return { svg: "" };

  try {
    const { default: mermaid } = await import("mermaid");
    if (isCancelled?.()) return { svg: "" };

    mermaid.initialize(buildMermaidConfig(isDark));

    const { svg } = await mermaid.render(`${idPrefix}-${uniqueSuffix()}`, source);
    if (isCancelled?.()) return { svg: "" };
    return { svg };
  } catch (error) {
    return { svg: "", error: describeMermaidError(error) };
  }
}
