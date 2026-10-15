"use client";

export type SpeechState = { status: "idle" | "loading" | "playing" | "paused"; progress: number; chunk: number; total: number };
let state: SpeechState = { status: "idle", progress: 0, chunk: 0, total: 0 };
const listeners = new Set<(state: SpeechState) => void>();
let chunks: string[] = [];
let audio: HTMLAudioElement | null = null;
let urls = new Map<number, string>();
let pending = new Map<number, Promise<string>>();
let controller: AbortController | null = null;
let generation = 0;
let fallback = false;

function emit(patch: Partial<SpeechState>) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn(state));
}
export function subscribeSpeech(fn: (state: SpeechState) => void) {
  listeners.add(fn);
  fn(state);
  return () => { listeners.delete(fn); };
}

// Only editorial prose: never voice code, charts, tables, diagrams or UI controls.
export function articleSpeechChunks(root: Document = document): string[] {
  const clean = (text: string) => text.replace(/```[\s\S]*?```|`[^`]*`|\[[^\]]+\]\([^)]*\)/g, match => match.startsWith("[") ? match.slice(1, match.indexOf("]")) : "")
    .replace(/[#*_~>|]/g, " ").replace(/\s+/g, " ").trim();
  const parts = [root.querySelector(".art-title"), root.querySelector(".art-deck"), ...root.querySelectorAll("#prose p, #prose h2, #prose h3")]
    .filter((el): el is Element => !!el && !el.closest("pre, code, table, .mermaid, [data-type='mermaid'], figure, aside, blockquote, .chart, .spec-sheet"))
    .map(el => {
      const copy = el.cloneNode(true) as Element;
      copy.querySelectorAll("pre, code, table, .mermaid, [data-type='mermaid'], figure, aside, blockquote, .chart, .spec-sheet").forEach(node => node.remove());
      return clean(copy.textContent || "");
    }).filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    // Keep requests short while retaining sentence boundaries whenever possible.
    const sentences = part.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [part];
    let current = "";
    for (const sentence of sentences) {
      for (const piece of sentence.match(/.{1,350}(?:\s|$)|.{1,350}/g) || []) {
        if (current && (current + piece).length > 500) { result.push(current.trim()); current = ""; }
        current += piece;
      }
    }
    if (current.trim()) result.push(current.trim());
  }
  return result;
}

export function stopSpeech() {
  generation++;
  controller?.abort();
  controller = null;
  audio?.pause();
  if (audio) audio.src = "";
  audio = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  urls.forEach(url => URL.revokeObjectURL(url));
  urls = new Map(); pending = new Map(); chunks = []; fallback = false;
  emit({ status: "idle", chunk: 0, total: 0, progress: 0 });
}

function fetchChunk(index: number, run: number): Promise<string> {
  if (urls.has(index)) return Promise.resolve(urls.get(index)!);
  if (pending.has(index)) return pending.get(index)!;
  const promise = fetch("/api/tts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: chunks[index] }), signal: controller?.signal,
  }).then(async response => {
    if (!response.ok) throw new Error("Speech service unavailable");
    const blob = await response.blob();
    if (run !== generation) throw new Error("Cancelled");
    const url = URL.createObjectURL(blob);
    urls.set(index, url);
    return url;
  }).finally(() => pending.delete(index));
  pending.set(index, promise);
  return promise;
}

function speakLocally(index: number, run: number) {
  if (run !== generation) return;
  if (!("speechSynthesis" in window)) { stopSpeech(); return; }
  fallback = true;
  const utterance = new SpeechSynthesisUtterance(chunks[index]);
  utterance.rate = 1;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.lang.startsWith("en") && /natural|neural/i.test(v.name)) || voices.find(v => v.lang.startsWith("en")) || null;
  utterance.onend = () => { if (run === generation) { if (index + 1 < chunks.length) speakLocally(index + 1, run); else stopSpeech(); } };
  utterance.onerror = () => { if (run === generation) stopSpeech(); };
  emit({ status: "playing", chunk: index, progress: index / chunks.length });
  window.speechSynthesis.speak(utterance);
}

async function playChunk(index: number, run: number) {
  if (run !== generation) return;
  if (index >= chunks.length) { stopSpeech(); return; }
  emit({ status: "loading", chunk: index, progress: index / chunks.length });
  try {
    const url = await fetchChunk(index, run);
    if (run !== generation) return;
    if (!audio) audio = new Audio();
    audio.src = url;
    audio.onended = () => { URL.revokeObjectURL(url); urls.delete(index); void playChunk(index + 1, run); };
    audio.ontimeupdate = () => { if (audio?.duration) emit({ progress: (index + audio.currentTime / audio.duration) / chunks.length }); };
    await audio.play();
    if (run !== generation) return;
    emit({ status: "playing" });
    // Prefetch only a small window, to limit bandwidth and server load.
    for (let i = index + 1; i < Math.min(index + 3, chunks.length); i++) void fetchChunk(i, run).catch(() => {});
  } catch (error) {
    if (run !== generation) return;
    // Playback policy errors are not network failures; don't silently change voice.
    if (error instanceof DOMException && error.name === "NotAllowedError") { stopSpeech(); return; }
    speakLocally(index, run);
  }
}

export function toggleSpeech() {
  if (state.status === "playing") {
    if (fallback) window.speechSynthesis.pause();
    else audio?.pause();
    emit({ status: "paused" }); return;
  }
  if (state.status === "paused") {
    if (fallback) window.speechSynthesis.resume();
    else void audio?.play();
    emit({ status: "playing" }); return;
  }
  if (state.status === "loading") { stopSpeech(); return; }
  chunks = articleSpeechChunks();
  if (!chunks.length) return;
  controller = new AbortController();
  const run = ++generation;
  emit({ status: "loading", total: chunks.length, progress: 0, chunk: 0 });
  void playChunk(0, run);
}
