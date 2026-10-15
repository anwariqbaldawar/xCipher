import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { Pencil, Trash2, Crop } from 'lucide-react';
import { useState } from 'react';
import { InsertMediaDialog } from '../InsertMediaDialog';
import ThumbnailCropper from '../ThumbnailCropper';

export default function FigureBlock({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropBusy, setCropBusy] = useState(false);
  // Which src has finished loading. Until the current one has, the image
  // keeps a reserved frame (see .is-loading) instead of collapsing to zero
  // height and then snapping open, which shoved the text below it down.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isLoading = Boolean(node.attrs.src) && loadedSrc !== node.attrs.src;

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
    <NodeViewWrapper className={`editorial-node editorial-node--figure ${selected ? 'is-selected' : ''}`}>
      <div className="editorial-node-bar" contentEditable={false}>
        <span data-drag-handle>⠿ &nbsp; Single Image</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setCropping(true)} title="Crop image"><Crop size={13} /> Crop</button>
          <button type="button" onClick={() => setEditing(true)} title="Edit details"><Pencil size={13} /> Edit</button>
          <button type="button" onClick={deleteNode} aria-label="Delete image"><Trash2 size={14} /></button>
        </div>
      </div>
      
      <figure className="ed-figure" data-credit={node.attrs.credit}>
        {/* draggable={false}: a native image drag bypasses ProseMirror, so a
            click with a little mouse movement dropped a copy of the photo
            into the empty space below. The block moves only by its ⠿ handle.
            A plain <img> on purpose: this is editable ProseMirror content,
            where next/image's optimisation and layout wrapper do not apply. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          draggable={false}
          decoding="async"
          className={isLoading ? 'is-loading' : undefined}
          onLoad={() => setLoadedSrc(node.attrs.src)}
          onError={() => setLoadedSrc(node.attrs.src)}
        />
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
        initialImage={{
          src: node.attrs.src,
          alt: node.attrs.alt,
          credit: node.attrs.credit,
          caption: node.textContent,
        }}
        open={editing}
        onClose={() => setEditing(false)}
        onInsertImage={(v) => {
          updateAttributes({ src: v.src, alt: v.alt, caption: v.caption, credit: v.credit });
          if (typeof getPos === "function") {
            editor.commands.command(({ tr }) => {
              const position = getPos();
              if (position === undefined) return false;
              const currentNode = tr.doc.nodeAt(position);
              if (!currentNode || currentNode.type.name !== "figure") return false;

              const contentStart = position + 1;
              tr.replaceWith(
                contentStart,
                contentStart + currentNode.content.size,
                v.caption ? editor.schema.text(v.caption) : [],
              );
              return true;
            });
          }
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
