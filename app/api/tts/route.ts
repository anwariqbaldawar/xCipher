import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { once } from "node:events";

export const runtime = "nodejs";

const voices = new Set(["en-US-AndrewMultilingualNeural", "en-US-AvaMultilingualNeural", "en-US-BrianMultilingualNeural"]);

async function synthesize(text: unknown, voice: unknown) {
  if (typeof text !== "string" || !text.trim() || text.length > 1800) {
    return new Response("Text must be between 1 and 1800 characters", { status: 400 });
  }
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 5000, synthesisTimeoutMs: 15000 });
  try {
    await tts.setMetadata(typeof voice === "string" && voices.has(voice) ? voice : "en-US-AndrewMultilingualNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    // The library emits errors on the audio stream, not just on toStream().
    const { audioStream } = tts.toStream(text.trim().replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!));
    const chunks: Buffer[] = [];
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    await Promise.race([once(audioStream, "end"), once(audioStream, "error").then(([error]) => { throw error; })]);
    if (!chunks.length) throw new Error("Empty speech response");
    return new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", "Content-Disposition": "inline; filename=narration.mp3" },
    });
  } catch (error) {
    console.error("TTS synthesis failed", error);
    return new Response("Speech temporarily unavailable", { status: 503 });
  } finally {
    tts.close();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return synthesize(body.text, body.voice);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return synthesize(params.get("text"), params.get("voice"));
}
