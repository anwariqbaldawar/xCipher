"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut } from "lucide-react";

export interface MediaSummary {
  label: string;
  value: ReactNode;
  color?: string;
}

interface MediaModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  media: ReactNode;
  /** Retained for existing chart callers; metadata is intentionally never shown. */
  summary?: MediaSummary[];
  /** Only a real, reader-facing caption belongs in the lightbox. */
  caption?: string;
  /** Enables native chart scrolling without changing image-lightbox gestures. */
  chartInteraction?: boolean;
}

type ZoomState = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

const INITIAL_ZOOM: ZoomState = { scale: 1, x: 0, y: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function MediaModal({ open, onClose, title, media, caption, summary, chartInteraction = false }: MediaModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomState>(INITIAL_ZOOM);
  const pointersRef = useRef(new Map<number, Point>());
  const pointerStartRef = useRef(new Map<number, Point>());
  const pinchedPointersRef = useRef(new Set<number>());
  const dragRef = useRef<{ id: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchRef = useRef(0);
  const [zoom, setZoom] = useState<ZoomState>(INITIAL_ZOOM);
  const [isInteracting, setIsInteracting] = useState(false);

  const updateZoom = useCallback((next: ZoomState) => {
    const canvas = canvasRef.current;
    const mediaBox = mediaRef.current;
    if (next.scale <= 1) {
      next = INITIAL_ZOOM;
    } else if (canvas && mediaBox) {
      const maxX = Math.max(0, (mediaBox.offsetWidth * next.scale - canvas.clientWidth) / 2);
      const maxY = Math.max(0, (mediaBox.offsetHeight * next.scale - canvas.clientHeight) / 2);
      next = {
        ...next,
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    }
    zoomRef.current = next;
    setZoom(next);
  }, []);

  const zoomAt = useCallback((scale: number, clientX?: number, clientY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const current = zoomRef.current;
    const nextScale = clamp(scale, 1, 4);
    if (nextScale === 1) {
      updateZoom(INITIAL_ZOOM);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const focalX = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
    const focalY = clientY === undefined ? 0 : clientY - rect.top - rect.height / 2;
    const ratio = nextScale / current.scale;
    updateZoom({
      scale: nextScale,
      x: focalX - (focalX - current.x) * ratio,
      y: focalY - (focalY - current.y) * ratio,
    });
  }, [updateZoom]);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const canvas = canvasRef.current;
    const activePointers = pointersRef.current;
    const pointerStarts = pointerStartRef.current;
    const pinchedPointers = pinchedPointersRef.current;
    if (!canvas) return () => { document.body.style.overflow = oldOverflow; };

    const pointFrom = (event: PointerEvent): Point => ({ x: event.clientX, y: event.clientY });
    const distanceBetween = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

    const onWheel = (event: WheelEvent) => {
      if ((event.target as Element).closest("button")) return;
      event.preventDefault();
      const current = zoomRef.current.scale;
      // A small exponential step feels natural on both wheels and trackpads.
      zoomAt(current * Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (chartInteraction || (event.target as Element).closest("button")) return;
      pointersRef.current.set(event.pointerId, pointFrom(event));
      pointerStartRef.current.set(event.pointerId, pointFrom(event));
      setIsInteracting(true);
      lastTouchRef.current = event.pointerType === "touch" ? Date.now() : lastTouchRef.current;
      if (pointersRef.current.size === 2) {
        pointersRef.current.forEach((_point, id) => pinchedPointersRef.current.add(id));
        const points = [...pointersRef.current.values()];
        pinchRef.current = { distance: Math.max(1, distanceBetween(points)), scale: zoomRef.current.scale };
        dragRef.current = null;
      } else if (pointersRef.current.size === 1 && zoomRef.current.scale > 1) {
        dragRef.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          originX: zoomRef.current.x,
          originY: zoomRef.current.y,
        };
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (chartInteraction || !pointersRef.current.has(event.pointerId)) return;
      event.preventDefault();
      pointersRef.current.set(event.pointerId, pointFrom(event));
      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const points = [...pointersRef.current.values()];
        const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
        const nextScale = clamp(pinchRef.current.scale * distanceBetween(points) / pinchRef.current.distance, 1, 2.5);
        zoomAt(nextScale, midpoint.x, midpoint.y);
      } else if (dragRef.current?.id === event.pointerId && zoomRef.current.scale > 1) {
        updateZoom({
          ...zoomRef.current,
          x: dragRef.current.originX + event.clientX - dragRef.current.x,
          y: dragRef.current.originY + event.clientY - dragRef.current.y,
        });
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      const wasTouch = event.pointerType === "touch";
      const wasPinch = pinchedPointersRef.current.has(event.pointerId);
      pinchedPointersRef.current.delete(event.pointerId);
      const start = pointerStartRef.current.get(event.pointerId);
      pointersRef.current.delete(event.pointerId);
      pointerStartRef.current.delete(event.pointerId);
      if (pointersRef.current.size === 0) setIsInteracting(false);
      if (pointersRef.current.size < 2) pinchRef.current = null;
      if (dragRef.current?.id === event.pointerId) dragRef.current = null;
      if (wasTouch && !wasPinch && start) {
        const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        const now = Date.now();
        const previous = lastTapRef.current;
        if (moved < 18 && previous && now - previous.time < 320 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 36) {
          lastTapRef.current = null;
          zoomAt(zoomRef.current.scale > 1 ? 1 : 2.5, event.clientX, event.clientY);
        } else if (moved < 18) {
          lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
        }
      }
    };
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element).closest("button") || Date.now() - lastTouchRef.current < 700 || zoomRef.current.scale > 1.01) return;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => zoomAt(2, event.clientX, event.clientY), 230);
    };
    const onDoubleClick = (event: MouseEvent) => {
      if ((event.target as Element).closest("button")) return;
      event.preventDefault();
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      zoomAt(zoomRef.current.scale > 1.01 ? 1 : 2, event.clientX, event.clientY);
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const preventGesture = (event: Event) => event.preventDefault();

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("gesturestart", preventGesture, { passive: false } as AddEventListenerOptions);

    return () => {
      document.body.style.overflow = oldOverflow;
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("gesturestart", preventGesture);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      activePointers.clear();
      pointerStarts.clear();
      pinchedPointers.clear();
      setIsInteracting(false);
      updateZoom(INITIAL_ZOOM);
    };
  }, [open, onClose, updateZoom, zoomAt]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") zoomAt(zoomRef.current.scale + 0.5);
      if (event.key === "-") zoomAt(zoomRef.current.scale - 0.5);
      if (event.key === "0") updateZoom(INITIAL_ZOOM);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, updateZoom, zoomAt]);

  if (!open || typeof document === "undefined") return null;
  const visibleCaption = caption?.trim() || "";
  const hasSummary = Boolean(summary?.length && !visibleCaption);

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-black/95 text-white backdrop-blur-sm ${hasSummary ? "md:flex-row" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={canvasRef}
        className={`relative flex w-full min-h-0 flex-1 ${chartInteraction ? "touch-pan-x touch-pan-y overflow-auto [webkit-overflow-scrolling:touch]" : "touch-none overflow-hidden"} select-none items-center justify-center p-4 sm:p-8 ${hasSummary ? "md:w-auto" : ""} ${zoom.scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        aria-label="Interactive image canvas. Pinch or double-tap to zoom on touchscreens; use the wheel or double-click to zoom on desktop."
      >
        <div
          ref={mediaRef}
          className="flex max-h-full max-w-full items-center justify-center will-change-transform"
          style={{ transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`, transformOrigin: "center center", transition: isInteracting ? "none" : "transform 100ms ease-out", maxWidth: "calc(100vw - 2rem)", maxHeight: "calc(100dvh - 2rem)" }}
        >
          {media}
        </div>
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-white/15 bg-neutral-900/55 p-1.5 shadow-xl backdrop-blur-xl sm:right-5 sm:top-5 sm:gap-1.5 sm:p-2">
          <button type="button" onClick={() => zoomAt(zoom.scale + 0.5)} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ZoomIn size={19} /></button>
          <button type="button" onClick={() => zoomAt(zoom.scale - 0.5)} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ZoomOut size={19} /></button>
          <button type="button" onClick={() => updateZoom(INITIAL_ZOOM)} aria-label="Reset zoom to 100 percent" className="flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-xs font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">1:1</button>
          <span className="hidden min-w-10 text-center text-[11px] tabular-nums text-white/65 sm:inline">{Math.round(zoom.scale * 100)}%</span>
          <span className="mx-0.5 h-6 w-px bg-white/20" aria-hidden="true" />
          <button type="button" onClick={onClose} aria-label="Close image viewer" className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={20} /></button>
        </div>
        {visibleCaption && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-4 z-20 px-6 text-center text-sm text-white/80"
            style={{ position: "absolute", insetInline: 0, bottom: "1rem", zIndex: 20, pointerEvents: "none" }}
          >
            <span className="pointer-events-auto inline-block max-w-[85vw] rounded-full border border-white/10 bg-black/70 px-4 py-2 shadow-lg backdrop-blur-md sm:max-w-xl">
              {visibleCaption}
            </span>
          </div>
        )}
      </div>
      {hasSummary && summary && (
        <aside className="max-h-[38dvh] w-full shrink-0 overflow-y-auto border-t border-neutral-800 bg-neutral-900/95 p-5 text-white md:h-full md:max-h-none md:w-[360px] md:border-l md:border-t-0">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          <table className="w-full text-left text-sm">
            <tbody>
              {summary.map((item) => (
                <tr key={item.label} className="border-b border-neutral-800 align-top last:border-0">
                  <th scope="row" className="w-2/5 py-3 pr-3 font-semibold" style={{ color: item.color || "var(--muted)" }}>{item.label}</th>
                  <td className="break-words py-3 font-semibold" style={{ color: item.color || "#f5f5f5" }}>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      )}
    </div>,
    document.body,
  );
}
