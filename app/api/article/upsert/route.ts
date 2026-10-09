import type { NextRequest } from "next/server";
import { upsertArticle } from "@/app/actions/article";

export async function POST(req: NextRequest) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const result = await upsertArticle(data as any);
    return Response.json(result);
  } catch (error: unknown) {
    console.error("[api/article/upsert] Error:", error);
    return Response.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
