import { describe, it, expect } from "vitest";
import { nextEditorPickedAt } from "@/lib/editor-picks";

const NOW = new Date("2026-10-14T10:00:00Z");
const EARLIER = new Date("2026-10-01T08:00:00Z");

describe("nextEditorPickedAt", () => {
  it("stamps now when an article enters the picks queue", () => {
    expect(nextEditorPickedAt("picks", { homepagePlacement: null, editorPickedAt: null }, NOW)).toEqual(NOW);
    expect(nextEditorPickedAt("picks", null, NOW)).toEqual(NOW);
  });

  it("keeps the original stamp when a pick is re-saved", () => {
    const existing = { homepagePlacement: "picks", editorPickedAt: EARLIER };
    expect(nextEditorPickedAt("picks", existing, NOW)).toEqual(EARLIER);
  });

  it("re-stamps a legacy pick that has no stamp yet", () => {
    const existing = { homepagePlacement: "picks", editorPickedAt: null };
    expect(nextEditorPickedAt("picks", existing, NOW)).toEqual(NOW);
  });

  it("clears the stamp when the article leaves the queue", () => {
    const existing = { homepagePlacement: "picks", editorPickedAt: EARLIER };
    expect(nextEditorPickedAt("", existing, NOW)).toBeNull();
    expect(nextEditorPickedAt(null, existing, NOW)).toBeNull();
    expect(nextEditorPickedAt("featured", existing, NOW)).toBeNull();
  });

  it("treats a hero/featured article entering as not-a-pick", () => {
    expect(nextEditorPickedAt("featured", null, NOW)).toBeNull();
  });
});
