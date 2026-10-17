import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { Pencil, Trash2, Crop } from 'lucide-react';
import { useMemo, useState } from 'react';
import { InsertMediaDialog } from '../InsertMediaDialog';
import ThumbnailCropper from '../ThumbnailCropper';

export default function FigureBlock({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropBusy, setCropBusy] = useState(false);

  // The dialog seeds its fields from this object, so its identity
  // must follow the node's actual attributes — not the render
  // cycle. An inline literal would give the dialog a "new"
  // initialImage on every NodeView re-render (a selection change
  // elsewhere in the document is enough), resetting the fields
  // mid-edit and, on hydrated articles, re-seeding stale values.
  const initialImage = useMemo(() => ({
    src: node.attrs.src,
    alt: node.attrs.alt,
    credit: node.attrs.credit,
    caption: node.textContent,
  }), [node.attrs.src, node.attrs.alt, node.attrs.credit, node.textContent]);

  const handleCanvasCrop = async (croppedFile: File) => {
    setCropBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", croppedFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          updateAttributes({ src: data.url });
        }
      }
    } catch (e) {
      console.error("Canvas image crop upload failed", e);
    } finally {
      setCropBusy(false);
      setCropping(false);
    }
  };

  return (
    <NodeViewWrapper className={`editorial-node ${selected ? 'is-selected' : ''}`}>
      <div className="editorial-node-bar" contentEditable={false}>
        <span data-drag-handle>⠿ &nbsp; Single Image</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setCropping(true)} title="Crop image"><Crop size={13} /> Crop</button>
          <button type="button" onClick={() => setEditing(true)} title="Edit details"><Pencil size={13} /> Edit</button>
          <button type="button" onClick={deleteNode} aria-label="Delete image"><Trash2 size={14} /></button>
        </div>
      </div>
      
      <figure className="ed-figure" data-credit={node.attrs.credit}>
        <img src={node.attrs.src} alt={node.attrs.alt} title={node.attrs.title} />
        <figcaption>
          <NodeViewContent className="inline" />
          {node.attrs.credit && (
            <span className="credit block text-[10px] uppercase tracking-wider mt-1 text-[var(--muted)]" contentEditable={false}>
              Image Credit: {node.attrs.credit}
            </span>
          )}
        </figcaption>
      </figure>

      <InsertMediaDialog
        kind="image"
        initialImage={initialImage}
        open={editing}
        onClose={() => setEditing(false)}
        onInsertImage={(v) => {
          // The save must land on THIS figure at its document
          // position, never on "whatever figure the selection
          // happens to be in". The dialog steals focus while it
          // is open and any click outside it can move the caret,
          // so an updateAttributes()-only save silently no-ops
          // and the modal's edits are lost. setNodeMarkup +
          // replaceWith in one transaction is atomic (one undo
          // step) and selection-independent.
          if (typeof getPos !== "function") {
            updateAttributes({ src: v.src, alt: v.alt, caption: v.caption, credit: v.credit });
            setEditing(false);
            return;
          }
          editor.commands.command(({ tr }) => {
            const position = getPos();
            if (position === undefined) return false;
            const currentNode = tr.doc.nodeAt(position);
            if (!currentNode || currentNode.type.name !== "figure") return false;

            tr.setNodeMarkup(position, undefined, {
              ...currentNode.attrs,
              src: v.src,
              alt: v.alt,
              caption: v.caption || null,
              credit: v.credit,
            });

            const contentStart = position + 1;
            tr.replaceWith(
              contentStart,
              contentStart + currentNode.content.size,
              v.caption ? editor.schema.text(v.caption) : [],
            );
            return true;
          });
          setEditing(false);
        }}
        onInsertVideo={() => {}}
      />

      {cropping && node.attrs.src && (
        <ThumbnailCropper
          open={cropping}
          imageSrc={node.attrs.src}
          fileName={node.attrs.src.split("/").pop() || "image.jpg"}
          busy={cropBusy}
          onCancel={() => setCropping(false)}
          onCropped={handleCanvasCrop}
        />
      )}
    </NodeViewWrapper>
  );
}
