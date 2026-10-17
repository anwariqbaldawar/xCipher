"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minus, Plus, RotateCcw, X, Maximize } from 'lucide-react';
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
  const [fullView, setFullView] = useState(false);
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
        className="mermaid-frame relative"
        style={{
          width: containerWidth || '100%',
          maxWidth: '100%',
          minWidth: 0,
          margin: '0 auto',
        }}
      >
        <div
          ref={containerRef}
          className="mermaid-svg-container not-prose w-full relative cursor-zoom-in"
          onClick={(event) => { if ((event.target as Element).closest('svg')) setFullView(true); }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
        {svgContent && !svgContent.includes('mermaid-error') && (
          <button type="button" onClick={() => setFullView(true)} aria-label="Open diagram full view" title="Open diagram full view" className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-neutral-900/60 text-white shadow-lg backdrop-blur-xl transition hover:bg-neutral-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Maximize2 size={18} />
          </button>
        )}
      </div>
      {fullView && <MermaidFullView svg={svgContent} onClose={() => setFullView(false)} />}
    </div>
  );
}

function MermaidFullView({ svg, onClose }: { svg: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  const zoom = (next: number) => setScale(Math.max(0.6, Math.min(5, next)));
  const viewBox = /viewBox=[\"']([\d.\-]+)\s+([\d.\-]+)\s+([\d.]+)\s+([\d.]+)[\"']/.exec(svg);
  const naturalWidth = Number(viewBox?.[3]) || 1000;
  const naturalHeight = Number(viewBox?.[4]) || 700;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col bg-neutral-950/95 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Diagram full view">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-2xl border border-white/15 bg-neutral-900/70 p-1.5 shadow-2xl backdrop-blur-xl sm:right-6 sm:top-6">
        <button type="button" onClick={() => zoom(scale + 0.25)} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15"><Plus /></button>
        <button type="button" onClick={() => zoom(scale - 0.25)} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15"><Minus /></button>
        <button type="button" onClick={() => { const svgEl = canvasRef.current?.querySelector('svg'); const box = canvasRef.current?.getBoundingClientRect(); const vb = svgEl?.viewBox.baseVal; if (box && vb?.width && vb.height) zoom(Math.max(0.6, Math.min(1.5, Math.min((box.width - 40) / vb.width, (box.height - 40) / vb.height)))); }} aria-label="Fit to readable scale" className="flex h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold hover:bg-white/15">Fit</button>
        <button type="button" onClick={() => zoom(1)} aria-label="Reset zoom" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15"><RotateCcw size={18} /></button>
        <button type="button" onClick={onClose} aria-label="Close diagram viewer" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/15"><X /></button>
      </div>
      <div ref={canvasRef} className="h-full w-full overflow-auto overscroll-contain p-5 pt-20 touch-pan-x touch-pan-y [scrollbar-width:thin]" style={{ WebkitOverflowScrolling: 'touch' }} onWheel={(event) => { event.preventDefault(); zoom(scale * Math.exp(-event.deltaY * 0.002)); }} onPointerDown={(event) => { pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 2) { const pts = [...pointers.current.values()]; pinchStart.current = { distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), scale }; } if (event.pointerType === 'mouse' && event.button === 0) drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }; }} onPointerMove={(event) => { const canvas = event.currentTarget; if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 2 && pinchStart.current) { const pts = [...pointers.current.values()]; const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); zoom(pinchStart.current.scale * distance / pinchStart.current.distance); } else if (drag.current && event.buttons) { canvas.scrollLeft = drag.current.left - (event.clientX - drag.current.x); canvas.scrollTop = drag.current.top - (event.clientY - drag.current.y); } }} onPointerUp={(event) => { pointers.current.delete(event.pointerId); if (pointers.current.size < 2) pinchStart.current = null; if (event.pointerType === 'touch' && Date.now() - lastTap.current < 320) { zoom(scale > 1 ? 1 : 2); lastTap.current = 0; } else if (event.pointerType === 'touch') lastTap.current = Date.now(); drag.current = null; }}>
        <div className="mx-auto origin-top-left cursor-grab active:cursor-grabbing" style={{ width: naturalWidth * scale, height: naturalHeight * scale }}>
          <div className="w-max origin-top-left" style={{ width: naturalWidth, height: naturalHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg style="display:block;max-width:none;width:${naturalWidth}px;height:${naturalHeight}px;" `) }} />
        </div>
      </div>
    </div>, document.body,
  );
}
