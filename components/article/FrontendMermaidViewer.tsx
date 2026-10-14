"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { waitForMermaidFonts } from '@/lib/mermaid-fonts';
import { getMermaidDirection } from '@/lib/mermaid-direction';

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

/** Explicit font stack so Mermaid's measured label widths match what the browser renders. */
const MERMAID_FONT_STACK = 'var(--f-ui), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export default function FrontendMermaidViewer({ graphDefinition, containerWidth = '100%' }: Props) {
  const decoded = decodeHtmlEntities(graphDefinition);
  const direction = getMermaidDirection(decoded);
  const [svgContent, setSvgContent] = useState('');
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

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

    const renderMermaid = async () => {
      // Delay slightly to let React 18 Strict Mode cancel the first effect run
      await new Promise(r => setTimeout(r, 50));
      if (cancelled) return;

      try {
        const { default: mermaid } = await import('mermaid');
        if (cancelled) return;

        await waitForMermaidFonts(decoded);
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'base',
          fontSize: 13,
          themeVariables: {
            fontSize: '13px',
            fontFamily: MERMAID_FONT_STACK,
            primaryColor: isDark ? '#1a1a1a' : '#f2f2f2',
            primaryBorderColor: isDark ? '#2d2d2d' : '#e6e6e6',
            primaryTextColor: isDark ? '#ffffff' : '#111111',
            lineColor: isDark ? '#e0e0e0' : '#333333',
            edgeLabelBackground: 'transparent',
            labelBackground: 'transparent',
            tertiaryColor: 'transparent',
          },
          themeCSS: `
            .node rect, .node circle, .node ellipse, .node polygon, .node path, .cluster rect { 
              filter: none !important; 
              box-shadow: none !important; 
            }
            /* Custom prose rules also target paragraphs inside not-prose. */
            .nodeLabel, .edgeLabel, .nodeLabel p, .edgeLabel p {
              font-family: var(--f-ui), sans-serif !important;
              line-height: normal !important;
              letter-spacing: normal !important;
              word-break: normal !important;
              overflow-wrap: normal !important;
            }
            .nodeLabel p, .edgeLabel p {
              margin: 0 !important;
              /* Inherit Mermaid's nowrap/break-spaces measurement policy. */
              white-space: inherit !important;
            }
            /* Remove box and background completely from edge labels */
            .edgeLabel,
            .edgeLabel *,
            .edgeLabel span,
            .edgeLabel p,
            .edgeLabel div,
            .edgeLabel rect,
            .label rect,
            .labelBkg,
            rect.label-container {
              background: transparent !important;
              background-color: transparent !important;
              fill: transparent !important;
              border: none !important;
              box-shadow: none !important;
              outline: none !important;
            }
            /* Edge label text: dark mode white, light mode black */
            .edgeLabel,
            .edgeLabel *,
            .edgeLabel span,
            .edgeLabel p,
            .edgeLabel div,
            .edgeLabel text,
            .edgeLabel tspan {
              color: ${isDark ? '#ffffff' : '#111111'} !important;
              fill: ${isDark ? '#ffffff' : '#111111'} !important;
              font-weight: 500 !important;
            }
            .edgePath path, .flowchart-link {
              stroke: ${isDark ? '#e0e0e0' : '#333333'} !important;
            }
          `,
          fontFamily: MERMAID_FONT_STACK,
          flowchart: {
            htmlLabels: true,
            useMaxWidth: true,
            padding: 16,
            wrappingWidth: 160
          }
        });
        const id = `mermaid-frontend-${crypto.randomUUID()}`;
        const { svg } = await mermaid.render(id, decoded);
        if (!cancelled) {
          setSvgContent(svg);
        }
      } catch {
        if (!cancelled) {
          setSvgContent(`<div class="text-red-500 text-sm">Diagram rendering failed.</div>`);
        }
      }
    };

    renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [decoded, theme]);

  return (
    <div
      className="mermaid-wrapper not-prose w-full flex justify-center my-8"
      data-direction={direction}
    >
      <div
        className="relative"
        style={{
          width: containerWidth || '100%',
          maxWidth: '100%',
          minWidth: 0,
          margin: '0 auto',
        }}
      >
        <div
          ref={containerRef}
          className="mermaid-svg-container not-prose w-full [&_svg]:block [&_svg]:mx-auto [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
        <style>{`
          .mermaid-wrapper,
          .mermaid-svg-container,
          .mermaid-wrapper svg,
          .mermaid-svg-container svg {
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          @media (min-width: 640px) {
            .mermaid-wrapper svg,
            .mermaid-svg-container svg {
              max-width: 100% !important;
              height: auto !important;
            }
          }
          /* Wrapper never scrolls: nested scrollers break page scroll on touch. */
          .mermaid-wrapper[data-direction] {
            overflow: visible !important;
          }
          /* TD/TB/BT: fit the article column width, no scrollbars at any width. */
          .mermaid-wrapper[data-direction="td"] .mermaid-svg-container {
            overflow: visible !important;
            max-height: none !important;
          }
          .mermaid-wrapper[data-direction="td"] svg {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
          }
          /* LR/RL: horizontal scroll only, native touch momentum. */
          .mermaid-wrapper[data-direction="lr"] .mermaid-svg-container {
            overflow-x: auto !important;
            overflow-y: visible !important;
            max-height: none !important;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain;
          }
          @media (max-width: 639px) {
            .mermaid-wrapper[data-direction="lr"] svg {
              max-width: none !important;
              min-width: 320px;
              width: max(var(--mermaid-natural-w, 100%), 320px) !important;
              height: auto !important;
            }
          }
          /* Keep SVG text inside its box on narrow screens. */
          .mermaid-svg-container svg foreignObject {
            overflow: visible;
          }
          .mermaid-svg-container .nodeLabel,
          .mermaid-svg-container .label {
            overflow-wrap: anywhere;
          }
          /* Remove background box from line edge labels */
          .mermaid-svg-container .edgeLabel,
          .mermaid-svg-container .edgeLabel *,
          .mermaid-svg-container .edgeLabel rect,
          .mermaid-svg-container .label rect,
          .mermaid-svg-container .labelBkg,
          .mermaid-svg-container rect.label-container,
          .mermaid-wrapper .edgeLabel,
          .mermaid-wrapper .edgeLabel *,
          .mermaid-wrapper .edgeLabel rect,
          .mermaid-wrapper .label rect,
          .mermaid-wrapper .labelBkg,
          .mermaid-wrapper rect.label-container {
            background: transparent !important;
            background-color: transparent !important;
            fill: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }
          /* Light mode text: black */
          .mermaid-svg-container .edgeLabel,
          .mermaid-svg-container .edgeLabel *,
          .mermaid-svg-container .edgeLabel text,
          .mermaid-svg-container .edgeLabel tspan,
          .mermaid-svg-container .edgeLabel span,
          .mermaid-svg-container .edgeLabel p,
          .mermaid-svg-container .edgeLabel div,
          .mermaid-wrapper .edgeLabel,
          .mermaid-wrapper .edgeLabel *,
          .mermaid-wrapper .edgeLabel text,
          .mermaid-wrapper .edgeLabel tspan,
          .mermaid-wrapper .edgeLabel span,
          .mermaid-wrapper .edgeLabel p,
          .mermaid-wrapper .edgeLabel div {
            color: #111111 !important;
            fill: #111111 !important;
            font-weight: 500 !important;
          }
          /* Dark mode text: white */
          :root[data-theme="dark"] .mermaid-svg-container .edgeLabel,
          :root[data-theme="dark"] .mermaid-svg-container .edgeLabel *,
          :root[data-theme="dark"] .mermaid-svg-container .edgeLabel text,
          :root[data-theme="dark"] .mermaid-svg-container .edgeLabel tspan,
          :root[data-theme="dark"] .mermaid-svg-container .edgeLabel span,
          :root[data-theme="dark"] .mermaid-svg-container .edgeLabel p,
          :root[data-theme="dark"] .mermaid-svg-container .edgeLabel div,
          :root[data-theme="dark"] .mermaid-wrapper .edgeLabel,
          :root[data-theme="dark"] .mermaid-wrapper .edgeLabel *,
          :root[data-theme="dark"] .mermaid-wrapper .edgeLabel text,
          :root[data-theme="dark"] .mermaid-wrapper .edgeLabel tspan,
          :root[data-theme="dark"] .mermaid-wrapper .edgeLabel span,
          :root[data-theme="dark"] .mermaid-wrapper .edgeLabel p,
          :root[data-theme="dark"] .mermaid-wrapper .edgeLabel div,
          .dark .mermaid-svg-container .edgeLabel,
          .dark .mermaid-svg-container .edgeLabel *,
          .dark .mermaid-svg-container .edgeLabel text,
          .dark .mermaid-svg-container .edgeLabel tspan,
          .dark .mermaid-svg-container .edgeLabel span,
          .dark .mermaid-svg-container .edgeLabel p,
          .dark .mermaid-svg-container .edgeLabel div,
          .dark .mermaid-wrapper .edgeLabel,
          .dark .mermaid-wrapper .edgeLabel *,
          .dark .mermaid-wrapper .edgeLabel text,
          .dark .mermaid-wrapper .edgeLabel tspan,
          .dark .mermaid-wrapper .edgeLabel span,
          .dark .mermaid-wrapper .edgeLabel p,
          .dark .mermaid-wrapper .edgeLabel div {
            color: #ffffff !important;
            fill: #ffffff !important;
          }
        `}</style>
      </div>
    </div>
  );
}
