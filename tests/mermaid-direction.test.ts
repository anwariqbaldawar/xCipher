import { describe, it, expect } from "vitest";
import { getMermaidDirection } from "@/lib/mermaid-direction";

describe("getMermaidDirection", () => {
  it("treats top-down and bottom-up flowcharts as td", () => {
    expect(getMermaidDirection("flowchart TD\n A-->B")).toBe("td");
    expect(getMermaidDirection("graph TB\n A-->B")).toBe("td");
    expect(getMermaidDirection("flowchart BT\n A-->B")).toBe("td");
  });

  it("treats left-right and right-left flowcharts as lr", () => {
    expect(getMermaidDirection("flowchart LR\n A-->B")).toBe("lr");
    expect(getMermaidDirection("graph RL\n A-->B")).toBe("lr");
  });

  it("is case-insensitive and tolerates leading whitespace", () => {
    expect(getMermaidDirection("   flowchart lr\n A-->B")).toBe("lr");
  });

  it("skips frontmatter and %% comments before the header", () => {
    expect(getMermaidDirection("---\ntitle: x\n---\nflowchart LR\n A-->B")).toBe("lr");
    expect(getMermaidDirection("%% note\nflowchart LR\n A-->B")).toBe("lr");
  });

  it("falls back to td when no direction is declared", () => {
    expect(getMermaidDirection("sequenceDiagram\n A->>B: hi")).toBe("td");
    expect(getMermaidDirection("")).toBe("td");
  });
});
