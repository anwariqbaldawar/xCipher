/**
 * Rolling Editor's Picks queue: decides the `editorPickedAt` stamp on save.
 *
 * - Entering the "picks" queue stamps "now", so the newest pick leads the queue.
 * - Re-saving an article that is already a pick keeps its original stamp, so
 *   editing it does not reshuffle the queue.
 * - Leaving the queue clears the stamp.
 * Other articles are never touched; the queue is the set of stamped picks.
 */
export function nextEditorPickedAt(
  nextPlacement: string | null | undefined,
  existing: { homepagePlacement: string | null; editorPickedAt: Date | null } | null | undefined,
  now: Date = new Date(),
): Date | null {
  if ((nextPlacement || null) !== "picks") return null;
  if (existing?.homepagePlacement === "picks" && existing.editorPickedAt) return existing.editorPickedAt;
  return now;
}
