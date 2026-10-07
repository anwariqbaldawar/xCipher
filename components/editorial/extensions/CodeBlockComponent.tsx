import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React from 'react';
import { CODE_LANGUAGES } from './CodeBlockLowlight';

export const CodeBlockComponent = ({ node, updateAttributes }: any) => {
  return (
    <NodeViewWrapper className="relative group my-4 rounded-md overflow-hidden bg-[#282c34] dark:bg-[#1e1e1e]">
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" contentEditable={false}>
        <select
          className="bg-[var(--surface)] text-[var(--ink)] text-xs px-2 py-1 rounded border border-[var(--line-2)] shadow-sm outline-none cursor-pointer"
          defaultValue={node.attrs.language || ''}
          onChange={(event) => updateAttributes({ language: event.target.value })}
        >
          <option value="">Auto-detect</option>
          {Object.entries(CODE_LANGUAGES)
            .filter(([value]) => value !== '')
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
      </div>
      <pre className="!m-0 !p-4 !bg-transparent">
        <NodeViewContent as={"code" as any} className={node.attrs.language ? `language-${node.attrs.language}` : ''} />
      </pre>
    </NodeViewWrapper>
  );
};
