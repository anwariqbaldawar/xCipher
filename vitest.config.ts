import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // The "@/..." paths come from tsconfig. Declared here directly rather
      // than via vite-tsconfig-paths: that package is ESM-only and cannot be
      // required from a .ts config under this toolchain, and one alias line is
      // not worth a dependency that fights the module system.
      "@": path.resolve(__dirname, "."),

      // The Prisma client is generated at install time from schema.prisma, and
      // generating it needs a network fetch for the query engine. Tests that
      // only exercise pure authorization logic should not be blocked on that.
      //
      // lib/capabilities.ts and lib/workflow.ts import Role and ArticleStatus
      // from @prisma/client as *types only* -- never as runtime values -- so a
      // type-level stand-in is behaviourally identical here. If a future test
      // needs the real client, it should use a separate config rather than
      // removing this: the point is that the permission matrix stays testable
      // without a database.
      "@prisma/client": path.resolve(__dirname, "tests/stubs/prisma-client.ts"),

      // `server-only` throws outside a React Server Component bundler context.
      // Tests run in plain Node, so the guard becomes a no-op — see the stub.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),

      // react-tweet ships ESM with .module.css imports that Node cannot load.
      // Tests assert HTML persistence, never tweet rendering — see the stub.
      "react-tweet": path.resolve(__dirname, "tests/stubs/react-tweet.tsx"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
