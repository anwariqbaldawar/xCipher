import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import middleware, { config } from "../middleware";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({ default: () => ({ auth }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("IS_LOCAL_DEV", "false");
  vi.stubEnv("NEXTAUTH_URL", "https://admin.xsypher.com");
  auth.mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe("middleware coverage", () => {
  // Static assets stay excluded — they are not HTML and never need a CSP nonce.
  it.each([
    "/_next/static/chunk.js", "/_next/image?url=photo.png&w=640&q=75",
    "/_next/webpack-hmr", "/favicon.ico", "/logo.png", "/fonts/editorial.woff2",
  ])("does not invoke middleware for static asset %s", url => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
  });

  // Every other path matches: each HTML response needs the per-request CSP
  // nonce and the security headers the middleware applies.
  it.each([
    "/", "/article/story", "/category/ai", "/latest",
    "/api", "/api/article/upsert", "/api/taxonomy",
    "/apiary", "/apiculture",
  ])("matches %s so responses carry a CSP nonce", url => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });

  it.each(["/admin", "/admin/editor/story", "/admin/login", "/api/auth/session", "/api/auth/callback"])("continues matching page %s", url => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });

  it.each([
    ["xsypher.com", "/"],
    ["xsypher.com", "/article/story"],
  ])("attaches CSP and security headers to public %s%s without decoding a session", async (host, path) => {
    const response = await middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }));
    expect(response.status).toBe(200);
    expect(auth).not.toHaveBeenCalled();
    const csp = response.headers.get("content-security-policy") || "";
    const scriptSrc = csp
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("script-src")) || "";
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("https://pagead2.googlesyndication.com");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
  });

  it.each([
    ["admin.xsypher.com", "/login"],
    ["xsypher.com", "/api/taxonomy"],
  ])("attaches a strict nonce-based CSP to dynamic/console %s%s", async (host, path) => {
    const response = await middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }));
    const csp = response.headers.get("content-security-policy") || "";
    const scriptSrc = csp
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("script-src")) || "";
    expect(scriptSrc).toContain("'nonce-");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it.each([
    ["xsypher.com", "/article/story"],
    ["admin.xsypher.com", "/login"],
    ["preview.xsypher.com", "/story"],
  ])("preserves routing on %s%s without decoding a session", async (host, path) => {
    const response = await middleware(new NextRequest(`https://${host}${path}`, { headers: { host } }));
    expect(response.status).toBe(200);
    expect(auth).not.toHaveBeenCalled();
    if (host === "admin.xsypher.com") expect(response.headers.get("x-middleware-rewrite")).toContain("/admin/login");
    if (host === "preview.xsypher.com") expect(response.headers.get("x-middleware-rewrite")).toContain("/preview/story");
  });

  it("still redirects unauthenticated requests to other console pages to login", async () => {
    const response = await middleware(new NextRequest("https://admin.xsypher.com/articles", { headers: { host: "admin.xsypher.com" } }));
    expect(auth).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("https://admin.xsypher.com/login?");
  });

  it.each(["STAFF", "unknown"])("denies console access to %s", async role => {
    auth.mockResolvedValue({ user: { role } });
    const response = await middleware(new NextRequest("https://admin.xsypher.com/articles", { headers: { host: "admin.xsypher.com" } }));
    expect(response.status).toBe(307);
  });

  it.each(["/editor", "/editor/story", "/admin/editor/story"])("routes %s to the editor's own authentication without a second JWT decode", async path => {
    const response = await middleware(new NextRequest(`https://admin.xsypher.com${path}`, { headers: { host: "admin.xsypher.com" } }));
    expect(auth).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    if (!path.startsWith("/admin")) expect(response.headers.get("x-middleware-rewrite")).toBe(`https://admin.xsypher.com/admin${path}`);
  });

  it.each(["/editorial", "/editor/story"])("keeps the middleware guard for protected POST %s", async path => {
    const response = await middleware(new NextRequest(`https://admin.xsypher.com${path}`, { method: "POST", headers: { host: "admin.xsypher.com" } }));
    expect(auth).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
  });

  it("does not exempt other pages that start with the editor prefix", async () => {
    const response = await middleware(new NextRequest("https://admin.xsypher.com/editorial", { headers: { host: "admin.xsypher.com" } }));
    expect(auth).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
  });
});
