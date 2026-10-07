import { NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';

/** Decode HTML entities that the sanitizer injects into attribute values. */
function decodeHtmlEntities(str: string): string {
  if (typeof document === 'undefined') return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

export const MermaidNodeView = (props: any) => {
  const { node, updateAttributes, selected } = props;
  const graphDefinition = decodeHtmlEntities(node.attrs.graphDefinition || 'graph TD\n  A-->B;');
  const [isEditing, setIsEditing] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [containerWidth, setContainerWidth] = useState(node.attrs.containerWidth || '100%');
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const resizableRef = useRef<HTMLDivElement>(null);

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

    const renderMermaid = async () => {
      if (!graphDefinition || graphDefinition.trim() === '') {
        if (!cancelled) setSvgContent('');
        return;
      }
      
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
            padding: 20
          }
        });

        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 10)}`;
        
        // Use a wrapper div for mermaid to render into
        const { svg } = await mermaid.render(id, graphDefinition);
        if (!cancelled) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Mermaid Render Error:", err);
          setError(err?.message || "Syntax error in Mermaid graph");
        }
      }
    };

    if (!isEditing) {
      const timeoutId = setTimeout(() => {
        renderMermaid();
      }, 100);
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [graphDefinition, theme, isEditing]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    updateAttributes({ graphDefinition: e.target.value });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className={`mermaid-node-wrapper relative my-4 rounded p-4 ${selected ? 'outline outline-1 outline-line' : ''}`} contentEditable={false}>
      {isEditing ? (
        <textarea
          className="w-full h-48 p-3 bg-background text-foreground border rounded font-mono text-sm"
          defaultValue={graphDefinition}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full my-8 not-prose cursor-pointer" onDoubleClick={() => setIsEditing(true)}>
          {error ? (
            <div className="text-red-500 text-sm p-4 border border-red-500 rounded bg-red-50 dark:bg-red-950 w-full whitespace-pre-wrap font-mono">
              <strong>Mermaid Syntax Error:</strong>
              <br/>
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
            <div className="animate-pulse bg-[var(--surface)] h-32 w-full rounded flex items-center justify-center text-[var(--muted)]">
              Rendering diagram...
            </div>
          )}
        </div>
      )}
      {!isEditing && (
        <button
          className="absolute top-2 right-2 bg-secondary text-secondary-foreground px-2 py-1 text-xs rounded opacity-0 hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          Edit Graph
        </button>
      )}
    </NodeViewWrapper>
  );
};
