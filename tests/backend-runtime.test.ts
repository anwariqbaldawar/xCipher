import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
import { eq } from "drizzle-orm";

const { initializeAuth } = vi.hoisted(() => ({
  initializeAuth: vi.fn((_configure: () => NextAuthConfig) => ({
    handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  })),
}));

vi.mock("next-auth", () => ({ default: initializeAuth }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("NEXTAUTH_SECRET", undefined);
  vi.stubEnv("AUTH_SECRET", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("request-time backend configuration", () => {
  it("imports every editor backend without database or media bindings", async () => {
    for (const name of [
      "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET",
      "NEXT_PUBLIC_R2_PUBLIC_BASE", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]) vi.stubEnv(name, undefined);

    await import("@/app/actions/article");
    await import("@/app/actions/workflow");
    await import("@/app/actions/upload-article-image");
    await import("@/app/actions/upload-avatar");

    const { db } = await import("@/lib/db");
    expect(() => db.query).toThrow("DATABASE_URL is not set");
  });

  it("uses bindings supplied after import and preserves Drizzle method receivers", async () => {
    const { db } = await import("@/lib/db");
    const { article } = await import("@/lib/db/schema");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@first.example.test/editor");

    expect(db.select({ id: article.id }).from(article).toSQL().sql)
      .toContain('select "id" from "Article"');
    expect(db.query.article.findFirst({ where: eq(article.id, "story-1") }).toSQL().params)
      .toContain("story-1");

    const firstClient = db.$client;
    expect(db.$client).toBe(firstClient);
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@second.example.test/editor");
    expect(db.$client).not.toBe(firstClient);
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => db.select()).toThrow("DATABASE_URL is not set");
  });

  it("executes separate writes through the real Neon Pool driver", async () => {
    const { Pool } = await import("@neondatabase/serverless");
    const { db } = await import("@/lib/db");
    const { article, articleRevision } = await import("@/lib/db/schema");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@first.example.test/editor");
    const queries: string[] = [];
    const poolQuery = vi.spyOn(Pool.prototype, "query").mockImplementation((async (queryConfig: any) => {
      const sqlText = typeof queryConfig === "string" ? queryConfig : queryConfig?.text;
      queries.push(String(sqlText));
      return {
        fields: [{ name: "id", dataTypeID: 25 }],
        rows: [["story-1"]],
        rowCount: 1,
        command: "UPDATE",
      } as any;
    }) as any);

    const [saved] = await db.update(article).set({ title: "Updated live" })
      .where(eq(article.id, "story-1")).returning({ id: article.id });
    await db.insert(articleRevision).values({
      id: "revision-1", articleId: saved.id, userId: "user-1", title: "Updated live",
    });
    expect(poolQuery).toHaveBeenCalledTimes(2);
    expect(queries[0]).toMatch(/^update "Article"/i);
    expect(queries[1]).toMatch(/^insert into "ArticleRevision"/i);
    poolQuery.mockRestore();
  });

  it("resolves Auth.js secrets, cookies and adapter only when requested", async () => {
    await import("@/lib/auth");
    const configure = initializeAuth.mock.calls[0][0];
    expect(configure).toBeTypeOf("function");

    vi.stubEnv("DATABASE_URL", "postgresql://test:test@first.example.test/editor");
    vi.stubEnv("AUTH_SECRET", "runtime-test-secret");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://xsypher.com");
    vi.stubEnv("NEXTAUTH_URL", "https://admin.xsypher.com");
    vi.stubEnv("AUTH_URL", undefined);
    const config = configure();
    expect(config.secret).toBe("runtime-test-secret");
    expect(config.cookies?.sessionToken?.options?.secure).toBe(true);
    expect(config.adapter?.getUser).toBeTypeOf("function");

    vi.stubEnv("NEXTAUTH_SECRET", "rotated-test-secret");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    const localConfig = configure();
    expect(localConfig.secret).toBe("rotated-test-secret");
    expect(localConfig.cookies?.sessionToken?.options?.secure).toBe(false);
  });
});
