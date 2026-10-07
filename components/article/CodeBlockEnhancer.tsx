"use client";

import { useEffect } from "react";
import { Check, Copy } from "lucide-react";
import { createRoot } from "react-dom/client";
import React from "react";

// A unified functional component for code block actions (Label + Copy Button)
function CodeBlockActions({ textToCopy, languageLabel }: { textToCopy: string, languageLabel: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="absolute top-0 right-0 flex items-center bg-[var(--surface-2)] border-b border-l border-[var(--line-2)] rounded-bl-md z-20">
      <div className="px-3 py-1.5 text-xs font-mono font-medium text-[var(--muted)] border-r border-[var(--line-2)]">
        {languageLabel}
      </div>
      <button
        onClick={handleCopy}
        type="button"
        className="px-3 py-1.5 text-[var(--ink)] hover:bg-[var(--surface-3)] hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center justify-center"
        aria-label="Copy code"
        title="Copy code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-500"/>
        ) : (
          <Copy className="w-3.5 h-3.5"/>
        )}
      </button>
    </div>
  );
}

export default function CodeBlockEnhancer() {
  useEffect(() => {
    const container = document.querySelector(".tiptap-content") || document.querySelector(".prose");
    if (!container) return;

    const preElements = container.querySelectorAll("pre");
    
    preElements.forEach((pre) => {
      // Skip if already enhanced
      if (pre.dataset.enhanced) return;
      pre.dataset.enhanced = "true";

      // Wrap in a group for styling
      pre.classList.add("group", "relative", "overflow-hidden", "pt-8");

      // Extract raw code for copying
      const codeEl = pre.querySelector("code");
      const textToCopy = codeEl ? codeEl.textContent || "" : pre.textContent || "";

      let langLabel = "Code";
      if (codeEl) {
        // Check if label was pre-rendered by Tiptap
        const attrLabel = codeEl.getAttribute("data-language-label");
        if (attrLabel && attrLabel !== "Code") {
          langLabel = attrLabel;
        } else {
          // Fallback parsing from class names
          const classNames = codeEl.className.split(" ");
          const langClass = classNames.find(c => c.startsWith("language-"));
          if (langClass) {
            const rawLang = langClass.replace("language-", "").toLowerCase();
            const CODE_LANGUAGES: Record<string, string> = {
              'javascript': 'JavaScript', 'js': 'JavaScript',
              'typescript': 'TypeScript', 'ts': 'TypeScript',
              'python': 'Python', 'py': 'Python',
              'java': 'Java', 'c': 'C', 'cpp': 'C++',
              'csharp': 'C#', 'cs': 'C#', 'go': 'Go',
              'rust': 'Rust', 'rs': 'Rust', 'php': 'PHP',
              'ruby': 'Ruby', 'rb': 'Ruby', 'swift': 'Swift',
              'kotlin': 'Kotlin', 'html': 'HTML', 'css': 'CSS',
              'json': 'JSON', 'bash': 'Bash', 'sh': 'Shell',
              'shell': 'Shell', 'sql': 'SQL', 'xml': 'XML',
              'yaml': 'YAML', 'yml': 'YAML', 'markdown': 'Markdown',
              'md': 'Markdown', 'graphql': 'GraphQL',
              'dockerfile': 'Dockerfile', 'plaintext': 'Plain Text',
            };
            langLabel = CODE_LANGUAGES[rawLang] || "Code";
          }
        }
      }

      // Create a mount point
      const mountPoint = document.createElement("div");
      pre.appendChild(mountPoint);

      // Render the unified actions component
      const root = createRoot(mountPoint);
      root.render(<CodeBlockActions textToCopy={textToCopy} languageLabel={langLabel} />);
    });
  }, []);

  return null;
}
