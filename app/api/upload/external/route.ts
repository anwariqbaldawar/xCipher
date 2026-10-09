import { NextRequest, NextResponse } from "next/server";
import { processExternalImage } from "@/app/actions/upload-article-image";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const { url } = body || {};
    if (!url || typeof url !== "string") {
      return NextResponse.json({ ok: false, error: "No URL provided." }, { status: 400 });
    }
    const res = await processExternalImage(url);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[api/upload/external] Error:", error);
    return NextResponse.json({ ok: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
