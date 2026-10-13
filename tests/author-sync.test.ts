import { describe, expect, it } from "vitest";
import { maskPublicArticle, getArticleAuthor } from "@/lib/personas";

describe("Author Synchronization & Attribution Integrity", () => {
  it("resolves updated author profile name when article is non-anonymous", () => {
    // Simulates an article where database row had old string "Anwar Iqbal",
    // but authorModel has updated name "Anwar Iqbal Dawar".
    const article = {
      id: "art-1",
      title: "AI Advances in 2026",
      isAnonymous: false,
      author: "Anwar Iqbal", // stale text on article row
      role: "Writer",
      authorId: "author-123",
      authorModel: {
        id: "author-123",
        name: "Anwar Iqbal Dawar", // live profile name
        role: "Senior Technology Editor",
        slug: "anwar-iqbal-dawar",
      },
    };

    const resolved = getArticleAuthor(article);
    expect(resolved.name).toBe("Anwar Iqbal Dawar");
    expect(resolved.role).toBe("Senior Technology Editor");

    const masked = maskPublicArticle(article);
    expect(masked.author).toBe("Anwar Iqbal Dawar");
    expect(masked.role).toBe("Senior Technology Editor");
    expect(masked.authorId).toBe("author-123");
  });

  it("masks anonymous articles properly using editorial desk", () => {
    const article = {
      id: "art-2",
      title: "Confidential Investigation",
      isAnonymous: true,
      author: "Anwar Iqbal Dawar",
      authorId: "author-123",
      cat: "cybersecurity",
      authorModel: {
        name: "Anwar Iqbal Dawar",
        slug: "anwar-iqbal-dawar",
      },
    };

    const masked = maskPublicArticle(article);
    expect(masked.author).toBe("xSypher CyberOps");
    expect(masked.role).toBe("Editorial Desk");
    expect(masked.authorId).toBeNull();
    expect(masked.authorModel).toBeNull();
  });
});
