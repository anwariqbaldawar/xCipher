import { NextRequest, NextResponse } from "next/server";
import { getSubcategories, createSubcategory } from "@/app/actions/taxonomy";

export async function POST(req: NextRequest) {
  let data: any;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const action = data?.action;

    if (action === "getSubcategories") {
      const result = await getSubcategories(data.parentId);
      return NextResponse.json(result);
    } else if (action === "createSubcategory") {
      const result = await createSubcategory(data.name, data.parentId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[api/taxonomy] Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
