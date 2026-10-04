"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';

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

export default function FrontendMermaidViewer({ graphDefinition, containerWidth = '100%' }: Props) {
  const decoded = decodeHtmlEntities(graphDefinition);
  const [svgContent, setSvgContent] = useState('');
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const isDark = theme === 'dark';

    const renderMermaid = async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: isDark ? '#1a1a1a' : '#f2f2f2',
            primaryBorderColor: isDark ? '#2d2d2d' : '#e6e6e6',
            primaryTextColor: isDark ? '#ffffff' : '#111111',
            textColor: isDark ? '#ffffff' : '#111111',
            nodeTextColor: isDark ? '#ffffff' : '#111111',
            lineColor: isDark ? '#94a3b8' : '#475569',
            edgeLabelBackground: isDark ? '#1e293b' : '#f1f5f9',
          },
          themeCSS: `
            .node rect, .node circle, .node ellipse, .node polygon, .node path, .cluster rect { 
              filter: none !important; 
              box-shadow: none !important; 
            }
            .node foreignObject {
              overflow: visible !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .node foreignObject > div {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
              width: 100% !important;
              height: 100% !important;
              line-height: 1.35 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .node .nodeLabel, .node .label, .node span, .node p {
              color: ${isDark ? '#ffffff' : '#111111'} !important;
              fill: ${isDark ? '#ffffff' : '#111111'} !important;
              font-size: 13px !important;
              font-weight: 500 !important;
              line-height: 1.35 !important;
              text-align: center !important;
            }
            .node text {
              fill: ${isDark ? '#ffffff' : '#111111'} !important;
              font-weight: 500 !important;
              dominant-baseline: central !important;
              alignment-baseline: central !important;
              text-anchor: middle !important;
            }
            .edgeLabel {
              background-color: ${isDark ? '#1e293b' : '#e2e8f0'} !important;
              border-radius: 4px !important;
              padding: 2px 6px !important;
            }
            .edgeLabel rect {
              fill: ${isDark ? '#1e293b' : '#e2e8f0'} !important;
              stroke: ${isDark ? '#475569' : '#cbd5e1'} !important;
              stroke-width: 1px !important;
              rx: 4px !important;
              ry: 4px !important;
            }
            .edgeLabel text, .edgeLabel span {
              fill: ${isDark ? '#e2e8f0' : '#1e293b'} !important;
              color: ${isDark ? '#e2e8f0' : '#1e293b'} !important;
              font-weight: 600 !important;
              font-size: 11px !important;
            }
            .edgePath path, .flowchart-link {
              stroke: ${isDark ? '#94a3b8' : '#475569'} !important;
              stroke-width: 1.5px !important;
            }
          `,
          fontFamily: 'inherit',
          flowchart: {
            htmlLabels: true,
            padding: 20
          }
        });

        const id = `mermaid-frontend-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, decoded);
        if (!cancelled) {
          setSvgContent(svg);
        }
      } catch (err) {
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
    <div className="flex justify-center w-full my-8">
      <div
        className="relative"
        style={{
          width: containerWidth || '100%',
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        <div
          ref={containerRef}
          className="mermaid-svg-container not-prose overflow-x-auto w-full [&_svg]:!w-full [&_svg]:!h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
        <style>{`
          .mermaid-svg-container svg {
            width: 100% !important;
            height: auto !important;
          }
        `}</style>
      </div>
    </div>
  );
}
