"use client";

import { useEffect, useState } from "react";
import { subscribeSpeech, stopSpeech, toggleSpeech, type SpeechState } from "@/lib/speech";

export default function ArticleAudioPlayer() {
  const [state, setState] = useState<SpeechState>({ status: "idle", progress: 0, chunk: 0, total: 0 });
  useEffect(() => {
    const unsubscribe = subscribeSpeech(setState);
    return () => { unsubscribe(); stopSpeech(); };
  }, []);
  if (state.status === "idle") return null;
  return (
    <section className="article-audio-player" aria-label="Article audio player">
      <div className="audio-player-copy"><strong>Listen to this article</strong><span>{state.status === "loading" ? "Preparing narration…" : `Paragraph ${state.chunk + 1} of ${state.total}`}</span></div>
      <button type="button" onClick={toggleSpeech} aria-label={state.status === "playing" ? "Pause narration" : state.status === "loading" ? "Cancel narration" : "Resume narration"}>
        {state.status === "playing" ? "Ⅱ" : state.status === "loading" ? "…" : "▶"}
      </button>
      <div className="audio-player-progress" role="progressbar" aria-label="Narration progress" aria-valuenow={Math.round(state.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${state.progress * 100}%` }} /></div>
      <button type="button" onClick={stopSpeech} aria-label="Close narration player">×</button>
    </section>
  );
}
