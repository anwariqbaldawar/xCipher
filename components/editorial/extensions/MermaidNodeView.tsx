import { NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { cleanMermaidCode, resolveMermaidCode } from './MermaidBlock';

/** Decode HTML entities that the sanitizer injects into attribute values. */
function decodeHtmlEntities(str: string): string {
  if (typeof document === 'undefined') return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

interface MermaidRenderResult {
  code: string;
  theme: string | undefined;
  svg?: string;
  error?: string;
}

export const MermaidNodeView = (props: any) => {
  const { node, updateAttributes, selected } = props;

  // Derive from the latest ProseMirror props on every render. Keeping a second
  // localCode copy required an effect to catch NodeView updates and could leave
  // React one transaction behind the document. The resolver also treats an
  // empty/whitespace `code` value as missing for legacy graphDefinition JSON.
  const currentCode = resolveMermaidCode(
    decodeHtmlEntities(node.attrs.code || ''),
    decodeHtmlEntities(node.attrs.graphDefinition || ''),
  );

  const [editValue, setEditValue] = useState<string>(currentCode);
  const [isEditing, setIsEditing] = useState(false);
  const [renderResult, setRenderResult] = useState<MermaidRenderResult | null>(null);
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCommittedEditRef = useRef(false);

  const [containerWidth, setContainerWidth] = useState(node.attrs.containerWidth || '100%');
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const resizableRef = useRef<HTMLDivElement>(null);

  // Key results by source and theme. A new ProseMirror node value immediately
  // selects the loading state during render; it never briefly falls through to
  // Empty diagram while a passive effect catches up.
  const hasCurrentRender =
    renderResult !== null && renderResult.code === currentCode && renderResult.theme === theme;
  const svgContent = hasCurrentRender ? renderResult?.svg || '' : '';
  const error = hasCurrentRender ? renderResult?.error || null : null;
  const isRendering = !isEditing && Boolean(currentCode.trim()) && !hasCurrentRender;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    if (resizableRef.current) {
      startWidthRef.current = resizableRef.current.offsetWidth;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - startXRef.current;
      const newWidth = Math.max(200, startWidthRef.current + dx);
      setContainerWidth(`${newWidth}px`);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        updateAttributes({ containerWidth });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, containerWidth, updateAttributes]);

  useEffect(() => {
    let cancelled = false;
    const isDark = theme === 'dark';
    const codeToRender = currentCode.trim();

    const renderMermaid = async () => {
      if (!codeToRender) return;

      const id = `mermaid-svg-${Math.random().toString(36).substring(2, 10)}`;

      try {
        const { default: mermaid } = await import('mermaid');
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'base',
          themeVariables: {
            primaryColor: isDark ? '#1a1a1a' : '#f2f2f2',
            primaryBorderColor: isDark ? '#2d2d2d' : '#e6e6e6',
            primaryTextColor: isDark ? '#ffffff' : '#111111',
            lineColor: isDark ? '#e0e0e0' : '#333333',
            edgeLabelBackground: 'transparent',
          },
          themeCSS: `
            .node rect, .node circle, .node ellipse, .node polygon, .node path, .cluster rect {
              filter: none !important;
              box-shadow: none !important;
            }
            .edgeLabel rect {
              fill: transparent !important;
            }
            .edgeLabel text {
              fill: var(--ink, #111111) !important;
              font-weight: 500 !important;
            }
            .edgePath path, .flowchart-link {
              stroke: var(--ink, #333333) !important;
            }
          `,
          fontFamily: "var(--f-ui), sans-serif",
          flowchart: {
            htmlLabels: true,
            padding: 20,
          },
        });

        // Mermaid returns an SVG string; React mounts it into the NodeView DOM.
        const { svg } = await mermaid.render(id, codeToRender);
        if (!cancelled) {
          setRenderResult({ code: codeToRender, theme, svg });
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Mermaid Render Error:', err);
          setRenderResult({
            code: codeToRender,
            theme,
            error: err?.message || 'Invalid diagram syntax',
          });
        }
      } finally {
        if (typeof document !== 'undefined') {
          const orphaned = document.getElementById(`d${id}`);
          if (orphaned) orphaned.remove();
        }
      }
    };

    // Do not render while the source textarea is open. As soon as a node update
    // or edit commit returns to display mode, render the current source without
    // an extra timeout/requestAnimationFrame delay.
    if (!isEditing && codeToRender) {
      void renderMermaid();
    }

    return () => {
      cancelled = true;
    };
  }, [currentCode, theme, isEditing]);

  const handleCommitEdit = () => {
    // Done also blurs the textarea. Commit once so the duplicate blur/click
    // events cannot dispatch competing ProseMirror transactions.
    if (hasCommittedEditRef.current) return;
    hasCommittedEditRef.current = true;

    const cleaned = cleanMermaidCode(editValue);
    setEditValue(cleaned);
    updateAttributes({
      code: cleaned,
      // Clear the legacy value so an intentional empty edit cannot resurrect
      // stale Mermaid source through the compatibility fallback.
      graphDefinition: null,
    });
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    hasCommittedEditRef.current = false;
    setEditValue(currentCode);
    setIsEditing(true);
  };

  return (
    <NodeViewWrapper className={`mermaid-node-wrapper relative my-4 rounded p-4 ${selected ? 'outline outline-1 outline-line' : ''}`} contentEditable={false}>
      {isEditing ? (
        <div className="w-full flex flex-col gap-2">
          <textarea
            className="w-full h-48 p-3 bg-background text-foreground border rounded font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCommitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCommitEdit();
              }
            }}
            placeholder="graph TD&#10;  A-->B"
            autoFocus
          />
          <div className="flex justify-between items-center text-xs text-[var(--muted)]">
            <span>Supports standard Mermaid syntax or markdown fences (```mermaid ... ```)</span>
            <button
              type="button"
              className="bg-[var(--accent)] text-white px-3 py-1 rounded text-xs hover:opacity-90 transition-opacity"
              onClick={handleCommitEdit}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full my-8 not-prose cursor-pointer" onDoubleClick={handleStartEdit}>
          {isRendering ? (
            <div className="animate-pulse bg-[var(--surface)] h-32 w-full rounded flex items-center justify-center text-[var(--muted)]">
              Rendering diagram...
            </div>
          ) : error ? (
            <div className="text-red-500 text-sm p-4 border border-red-500 rounded bg-red-50 dark:bg-red-950 w-full whitespace-pre-wrap font-mono">
              <strong>Invalid diagram syntax</strong>
              <br />
              {error}
            </div>
          ) : svgContent ? (
            <div
              ref={resizableRef}
              className="relative mx-auto w-full"
              style={{ width: isResizing ? containerWidth : (node.attrs.containerWidth || '100%'), maxWidth: '100%' }}
            >
              <div
                ref={containerRef}
                className="mermaid-svg-container overflow-x-auto w-full flex justify-center [&_svg]:!max-w-full [&_svg]:!h-auto"
                style={{ minHeight: '100px' }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              {selected && (
                <div
                  className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--line)] cursor-se-resize rounded-sm hover:bg-[var(--accent)] transition-colors"
                  onMouseDown={handleMouseDown}
                  title="Drag to resize"
                />
              )}
            </div>
          ) : (
            <div
              className="p-8 border border-dashed border-[var(--line)] rounded-lg text-sm text-[var(--muted)] w-full text-center hover:border-[var(--accent)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              onClick={handleStartEdit}
            >
              Empty diagram (click or double-click to edit)
            </div>
          )}
        </div>
      )}
      {!isEditing && (
        <button
          type="button"
          className="absolute top-2 right-2 bg-secondary text-secondary-foreground px-2 py-1 text-xs rounded opacity-0 hover:opacity-100 transition-opacity z-10"
          onClick={handleStartEdit}
        >
          Edit Graph
        </button>
      )}
    </NodeViewWrapper>
  );
};
