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
  const graphDefinition = decodeHtmlEntities(node.attrs.graphDefinition);
  const [isEditing, setIsEditing] = useState(false);
  const [svgContent, setSvgContent] = useState('');
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
      try {
        const { default: mermaid } = await import('mermaid');
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: isDark ? '#1a1a1a' : '#f2f2f2', // var(--surface-2)
            primaryBorderColor: isDark ? '#2d2d2d' : '#e6e6e6', // var(--line)
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

        const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, graphDefinition);
        if (!cancelled) {
          setSvgContent(svg);
        }
      } catch (err) {
        if (!cancelled) {
          setSvgContent(`<div class="text-red-500">Syntax error in Mermaid graph</div>`);
        }
      }
    };

    if (!isEditing) {
      renderMermaid();
    }

    return () => {
      cancelled = true;
    };
  }, [graphDefinition, theme, isEditing]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    updateAttributes({ graphDefinition: e.target.value.trim() });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className={`mermaid-node-wrapper relative my-4 rounded p-4 ${selected ? 'outline outline-1 outline-line' : ''}`}>
      {isEditing ? (
        <textarea
          className="w-full h-32 p-2 bg-background text-foreground border rounded"
          defaultValue={graphDefinition}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <div className="flex justify-center w-full my-8">
          <div 
            ref={resizableRef} 
            className="relative mx-auto" 
            style={{ width: isResizing ? containerWidth : (node.attrs.containerWidth || '100%'), maxWidth: '100%' }}
          >
            <div
              ref={containerRef}
              className="mermaid-svg-container not-prose cursor-pointer overflow-x-auto w-full"
              onDoubleClick={() => setIsEditing(true)}
              dangerouslySetInnerHTML={{ __html: svgContent }}
              spellCheck={false}
            />
            {selected && (
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--line)] cursor-se-resize rounded-sm hover:bg-[var(--accent)] transition-colors"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
              />
            )}
          </div>
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
