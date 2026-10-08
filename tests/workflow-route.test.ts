import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// The route must forward reviewer notes as the rejection REASON and the
// category string as the reason CODE. Swapped arguments made every rejection
// fail server-side validation ("EDITORIAL" is shorter than the 20-character
// minimum reason), which surfaced in the review UI as "Failed to submit
// decision." for every decision button.
const mocks = vi.hoisted(() => ({
  submitArticle: vi.fn(),
  publishArticle: vi.fn(),
  rejectArticle: vi.fn(),
  requestChanges: vi.fn(),
  claimReview: vi.fn(),
  releaseReview: vi.fn(),
  takeOverReview: vi.fn(),
}));

vi.mock("@/app/actions/workflow", () => mocks);

import { POST } from "@/app/api/article/workflow/route";

function workflowRequest(body: unknown) {
  return new NextRequest("http://localhost/api/article/workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rejectArticle.mockResolvedValue({ ok: true });
  mocks.requestChanges.mockResolvedValue({ ok: true });
  mocks.publishArticle.mockResolvedValue({ ok: true });
});

describe("POST /api/article/workflow", () => {
  it("passes reviewer notes as the rejection reason and the category as the reason code", async () => {
    const notes = "This draft needs a source for the headline claim before it can run.";
    const res = await POST(workflowRequest({
      action: "reject",
      articleId: "article-1",
      category: "EDITORIAL",
      notes,
    }));

    expect(res.status).toBe(200);
    expect(mocks.rejectArticle).toHaveBeenCalledTimes(1);
    expect(mocks.rejectArticle).toHaveBeenCalledWith("article-1", notes, "EDITORIAL");
  });

  it("forwards requestChanges notes as the reason", async () => {
    const notes = "Please add the missing disclosure and resubmit for another pass.";
    await POST(workflowRequest({ action: "requestChanges", articleId: "article-2", notes }));

    expect(mocks.requestChanges).toHaveBeenCalledWith("article-2", notes);
  });

  it("forwards publish with the article id only", async () => {
    await POST(workflowRequest({ action: "publish", articleId: "article-3" }));

    expect(mocks.publishArticle).toHaveBeenCalledWith("article-3");
  });

  it("rejects unknown actions with 400", async () => {
    const res = await POST(workflowRequest({ action: "explode", articleId: "article-4" }));
    expect(res.status).toBe(400);
  });
});
