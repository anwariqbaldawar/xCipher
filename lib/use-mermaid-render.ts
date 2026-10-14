"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { mermaidFontsStillLoading, onMermaidFontsSettled } from "@/lib/mermaid-fonts";

/**
 * Conditions that invalidate an already-rendered diagram.
 *
 * A Mermaid SVG is a fixed measurement: node coordinates come from label
 * bounding boxes taken once, at render time. So the two things that can make it
 * wrong afterwards both have to force a re-render:
 *
 *  1. **A resize.** An orientation change, a collapsing sidebar or the editor's
 *     resizable rail changes how wide the diagram may be, and with
 *     `useMaxWidth: true` the SVG is then scaled to a width it was not measured
 *     for.
 *  2. **A late webfont.** If a face finishes downloading *after* the render —
 *     common on mobile networks — every measured box is suspect, because it was
 *     measured against the fallback metrics.
 *
 * The returned value is a counter to put in the render effect's dependency list;
 * it only increments when one of the above actually happened.
 */
export function useMermaidRenderTrigger(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): number {
  const [nonce, setNonce] = useState(0);
  const widthRef = useRef(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!isActive || !element || typeof ResizeObserver === "undefined") return;

    widthRef.current = element.clientWidth || element.getBoundingClientRect().width;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width ?? element.clientWidth;
      // Sub-pixel churn — a scrollbar appearing, a sibling font swapping — must
      // not start a render loop. Only a real layout change counts.
      if (!next || Math.abs(next - widthRef.current) < 8) return;
      widthRef.current = next;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setNonce(value => value + 1), 150);
    });

    observer.observe(element);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [containerRef, isActive]);

  useEffect(() => {
    if (!isActive) return;
    // Only a font that was still in flight when this diagram rendered can
    // invalidate it; a later, unrelated font load must not.
    let armed = mermaidFontsStillLoading();
    return onMermaidFontsSettled(() => {
      if (!armed) return;
      armed = false;
      setNonce(value => value + 1);
    });
  }, [isActive]);

  return nonce;
}
