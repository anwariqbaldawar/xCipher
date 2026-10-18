"use client";

import { type Editor, useEditorState } from '@tiptap/react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { getDocumentCounts } from '@/lib/editor/document-state';

interface DocumentStatusProps {
  editor: Editor;
  zoom: number;
  setZoom: (zoom: number) => void;
  status: string;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const ZOOM_LEVELS = [90, 100, 110];

/**
 * Unified MS Word-style bottom status bar — one full-width strip
 * pinned to the editor's bottom edge. Left: document metrics and
 * the section the caret is in. Right: cloud sync, focus mode and
 * zoom.
 */
export default function DocumentStatus({ editor, zoom, setZoom, status, isFullscreen, toggleFullscreen }: DocumentStatusProps) {
  const counts = useEditorState({ editor, selector: ({ editor }) => {
    const { words, characters } = getDocumentCounts(editor);
    return {
      words,
      characters,
      section: (() => {
        const position = editor.state.selection.from;
        let section: string | null = null;
        editor.state.doc.descendants((node, nodePosition) => {
          if (node.type.name === 'heading' && nodePosition < position) section = node.textContent;
        });
        return section;
      })(),
    };
  } });
  const isBelowMin = counts.words < 50;
  return (
    <footer className="studio-status">
      <div className="studio-status-group">
        <span className={`studio-status-metric ${isBelowMin ? 'studio-status-warn' : ''}`} title={isBelowMin ? 'Articles need at least 50 words before they can be submitted' : undefined}>
          {counts.words.toLocaleString()} words{isBelowMin && <span className="studio-status-warn-tag"> · min 50</span>}
        </span>
        <span className="studio-status-sep" aria-hidden="true" />
        <span className="studio-status-metric">{Math.max(1, Math.ceil(counts.words / 200))} min read</span>
        <span className="studio-status-sep studio-character-count-sep" aria-hidden="true" />
        <span className="studio-status-metric studio-character-count">{counts.characters.toLocaleString()} characters</span>
        {counts.section && (
          <>
            <span className="studio-status-sep" aria-hidden="true" />
            <span className="studio-status-section" title="Active section">{counts.section}</span>
          </>
        )}
      </div>
      <div className="studio-status-group">
        <span className="studio-status-sync" role="status">{status || 'Saved to cloud'}</span>
        <button
          type="button"
          className="studio-status-focus"
          onClick={toggleFullscreen}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'Exit focus mode' : 'Focus mode — hide the docks'}
        >
          {isFullscreen ? <Minimize2 size={12} aria-hidden="true" /> : <Maximize2 size={12} aria-hidden="true" />}
          <span>Focus</span>
        </button>
        <span className="studio-status-sep" aria-hidden="true" />
        <div className="studio-zoom" role="group" aria-label="Zoom level">
          {ZOOM_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              className={`studio-zoom-btn ${zoom === level ? 'is-active' : ''}`}
              onClick={() => setZoom(level)}
              aria-pressed={zoom === level}
            >
              {level}%
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}
