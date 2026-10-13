"use client";

import { useCallback, useRef, useState, type ElementType } from "react";
import { Editor, EditorContent } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  RemoveFormatting,
  Undo,
  Redo,
} from "lucide-react";

interface RichTextFieldProps {
  editor: Editor | null;
  /** Rendered under the field. */
  hint?: string;
  minHeight?: number;
  ariaLabel?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: ElementType;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={Boolean(active)}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ${
        active
          ? "bg-[var(--accent)] text-white shadow-xs"
          : "text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)] active:bg-[var(--surface-2)]"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="w-px h-4.5 bg-[var(--line)] mx-1 self-center shrink-0" />;
}

export default function RichTextField({
  editor,
  hint,
  minHeight = 160,
  ariaLabel = "Biography",
}: RichTextFieldProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const currentHref = editor.getAttributes("link").href || "";
    setLinkUrl(currentHref);
    setLinkError("");
    setLinkModalOpen(true);
    setTimeout(() => linkInputRef.current?.focus(), 50);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkModalOpen(false);
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) {
        setLinkError("Only http, https and mailto links are allowed.");
        return;
      }
    } catch {
      // If user typed 'example.com', prepend https://
      if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: `https://${trimmed}` }).run();
        setLinkModalOpen(false);
        return;
      }
      setLinkError("Please enter a valid URL (e.g. https://example.com)");
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
    setLinkModalOpen(false);
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkModalOpen(false);
  }, [editor]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-[var(--line)] bg-[var(--surface)] animate-pulse"
        style={{ minHeight: minHeight + 48 }}
        aria-busy="true"
      />
    );
  }

  return (
    <div className="relative">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all shadow-xs">
        {/* Compact, responsive editorial toolbar */}
        <div
          role="toolbar"
          aria-label="Biography text formatting"
          className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--line)] bg-[var(--surface-2)]/60 backdrop-blur-xs"
        >
          {/* History */}
          <ToolbarButton
            label="Undo (Ctrl+Z)"
            icon={Undo}
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolbarButton
            label="Redo (Ctrl+Shift+Z)"
            icon={Redo}
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          />

          <Divider />

          {/* Headings */}
          <ToolbarButton
            label="Heading 2"
            icon={Heading2}
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="Heading 3"
            icon={Heading3}
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />

          <Divider />

          {/* Formatting */}
          <ToolbarButton
            label="Bold (Ctrl+B)"
            icon={Bold}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Italic (Ctrl+I)"
            icon={Italic}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Underline (Ctrl+U)"
            icon={UnderlineIcon}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            label="Strikethrough"
            icon={Strikethrough}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <ToolbarButton
            label="Inline code"
            icon={Code}
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />

          <Divider />

          {/* Lists & Quotes */}
          <ToolbarButton
            label="Bulleted list"
            icon={List}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Numbered list"
            icon={ListOrdered}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="Quote"
            icon={Quote}
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />

          <Divider />

          {/* Links & Clear */}
          <ToolbarButton
            label="Insert link"
            icon={Link2}
            active={editor.isActive("link")}
            onClick={openLinkModal}
          />
          {editor.isActive("link") && (
            <ToolbarButton
              label="Remove link"
              icon={Unlink}
              onClick={removeLink}
            />
          )}
          <ToolbarButton
            label="Clear formatting"
            icon={RemoveFormatting}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          />
        </div>

        {/* Editor Body */}
        <div
          className="ed-body px-4 py-3.5 prose prose-sm dark:prose-invert max-w-none text-[var(--ink)] focus:outline-none"
          style={{ minHeight }}
          aria-label={ariaLabel}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {hint && (
        <span className="block mt-2 text-[11.5px] text-[var(--muted)]">{hint}</span>
      )}

      {/* Link Dialog */}
      {linkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Insert Link"
          onClick={() => setLinkModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--ink)] mb-1.5">Insert or Edit Link</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Enter a destination URL (https://, http://, or mailto:)
            </p>
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setLinkError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === "Escape") {
                  setLinkModalOpen(false);
                }
              }}
              placeholder="https://example.com"
              className="w-full bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors placeholder:text-[var(--muted)]/50 mb-2"
            />
            {linkError && (
              <p className="text-xs text-[var(--bad,#ef4444)] mb-3">{linkError}</p>
            )}
            <div className="flex items-center justify-end gap-2.5 mt-4">
              {editor.isActive("link") && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="px-3.5 py-2 text-xs font-medium rounded-xl text-[var(--bad,#ef4444)] hover:bg-[var(--bad,#ef4444)]/10 transition-colors mr-auto"
                >
                  Remove Link
                </button>
              )}
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] transition-colors shadow-xs"
              >
                Apply Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
