"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { getMermaidDirection } from '@/lib/mermaid-direction';
import { renderMermaidDiagram } from '@/lib/mermaid-render';
import { useMermaidRenderTrigger } from '@/lib/use-mermaid-render';

interface Props {
  graphDefinition: string;
  containerWidth?: string;
}

/** Decode HTML entities that the sanitizer injects into attribute values.
 *  e.g. `A--&gt;B` becomes `A-->B`, `&amp;` becomes `&`, etc. */
function decodeHtmlEntities(str: string): string {
  if (typeof document === 'undefined') return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

/**
 * Mermaid diagram on a public article page.
 *
 * Measurement, configuration and styling all live elsewhere so this component
 * cannot drift from the editor preview:
 *   • `lib/mermaid-render.ts` — waits for fonts + a layout frame, then renders
 *     with the shared config;
 *   • `lib/mermaid-config.ts` — the config itself (classic look, wrapping width,
 *     node padding, and the label metric lock that travels inside the SVG);
 *   • `app/globals.css` → "Mermaid" — page-level isolation from the article's
 *     typography and from the A−/A+ text scaler.
 */
export default function FrontendMermaidViewer({ graphDefinition, containerWidth = '100%' }: Props) {
  const decoded = decodeHtmlEntities(graphDefinition);
  const direction = getMermaidDirection(decoded);
  const [svgContent, setSvgContent] = useState('');
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTrigger = useMermaidRenderTrigger(containerRef, true);

  // Expose the SVG's natural width as a CSS variable. On small screens the stylesheet
  // uses it to keep wide diagrams at full size inside a horizontal scroller instead of
  // scaling the whole graph (and its text) down to the viewport.
  useEffect(() => {
    const svgEl = containerRef.current?.querySelector('svg');
    const naturalWidth = svgEl?.viewBox?.baseVal?.width;
    if (svgEl && naturalWidth) {
      svgEl.style.setProperty('--mermaid-natural-w', `${naturalWidth}px`);
    }
  }, [svgContent]);

  useEffect(() => {
    let cancelled = false;
    const isDark = theme === 'dark';

    const render = async () => {
      // Delay slightly to let React 18 Strict Mode cancel the first effect run
      // before two renders race each other for Mermaid's global config.
      await new Promise(r => setTimeout(r, 50));
      if (cancelled) return;

      const { svg, error } = await renderMermaidDiagram(decoded, {
        isDark,
        idPrefix: 'mermaid-frontend',
        isCancelled: () => cancelled,
      });
      if (cancelled) return;

      setSvgContent(
        error
          ? `<div class="mermaid-error">Diagram rendering failed.</div>`
          : svg,
      );
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [decoded, theme, renderTrigger]);

  return (
    <div
      className="mermaid-wrapper not-prose w-full flex justify-center my-8"
      data-direction={direction}
    >
      <div
        className="mermaid-frame"
        style={{
          width: containerWidth || '100%',
          maxWidth: '100%',
          minWidth: 0,
          margin: '0 auto',
        }}
      >
        <div
          ref={containerRef}
          className="mermaid-svg-container not-prose w-full"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
}
