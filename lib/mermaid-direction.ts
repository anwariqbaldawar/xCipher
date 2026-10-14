/**
 * Layout direction of a Mermaid graph definition.
 *
 * - "td": top-down / bottom-up (TD, TB, BT) and anything without a direction.
 *   Fits the article column; no horizontal scrolling.
 * - "lr": left-right / right-left (LR, RL). Wide by nature; scrolls horizontally
 *   on small screens instead of shrinking its text.
 */
export type MermaidDirection = "td" | "lr";

/** Skip YAML frontmatter and leading %% comment lines before the header. */
function stripPreamble(def: string): string {
  let body = def.replace(/^\uFEFF/, "").trimStart();
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) body = body.slice(end + 4).trimStart();
  }
  return body
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("%%"))
    .join("\n");
}

export function getMermaidDirection(def: string): MermaidDirection {
  const header = stripPreamble(def || "").match(/^\s*(?:flowchart|graph)(?:-v2)?\s+(TD|TB|BT|LR|RL)\b/im);
  if (!header) return "td";
  const dir = header[1].toUpperCase();
  return dir === "LR" || dir === "RL" ? "lr" : "td";
}
